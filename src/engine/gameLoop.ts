import { sound } from '../audio/soundEffects';
import { ALL_ROOMS } from '../data/rooms';
import { buildRoomsFromJson, roomNetwork, RoomNetworkManager } from './roomNetwork';
import { PuzzleSystem } from './puzzleSystem';
import {
  CrateEntity,
  Direction,
  EnemyProjectile,
  GameSettings,
  Particle,
  PatrolDrone,
  PlayerState,
  RoomDefinition,
} from '../types/game';
import { checkAABBCollision, distance2D } from './isometric';
import { EnemyAISystem } from './enemyAI';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  interact: boolean;
  carry?: boolean;
}

export class GameEngine {
  public currentRoom: RoomDefinition;
  public roomsState: { [roomId: string]: RoomDefinition };
  public roomNetwork: RoomNetworkManager = roomNetwork;
  public player: PlayerState;
  public particles: Particle[] = [];
  public projectiles: EnemyProjectile[] = [];
  public time: number = 0;
  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;
  public settings: GameSettings = {
    soundEnabled: true,
    musicEnabled: false,
    controlMode: 'screen', // Screen mode: Up goes screen-up (NW/NE blend), Down goes screen-down. Isometric mode: Up = NE, Down = SW, Left = NW, Right = SE
    crtFilter: true,
    showCoordinates: false,
  };

  public cameraX: number = 0;
  public cameraY: number = 0;
  public screenShake: number = 0;
  public transitionCooldown: number = 0;
  public lastInteractPressed: boolean = false;
  public lastJumpPressed: boolean = false;
  public lastCarryPressed: boolean = false;
  public onNotification?: (message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;

  constructor() {
    this.roomsState = this.roomNetwork.roomsState;
    this.currentRoom = this.roomNetwork.loadRoom('sector_01');

    this.player = {
      x: this.currentRoom.defaultPlayerSpawn.x,
      y: this.currentRoom.defaultPlayerSpawn.y,
      z: this.currentRoom.defaultPlayerSpawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      direction: this.currentRoom.defaultPlayerSpawn.direction,
      isMoving: false,
      isRunning: false,
      isGrounded: true,
      isJumping: false,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      keycards: [],
      nexusFragments: [],
      carriedCrate: null,
      energyCells: 0,
      walkFrame: 0,
      invulnerableTimer: 0,
    };

    // Center camera on player initially
    const initialScreen = this.calcPlayerScreen(this.player);
    this.cameraX = initialScreen.x;
    this.cameraY = initialScreen.y;
  }

  private calcPlayerScreen(p: PlayerState) {
    const sx = (p.x - p.y) * 32;
    const sy = (p.x + p.y) * 16 - p.z * 24;
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }
    return { x: sx + shakeX, y: sy + shakeY };
  }

  public update(dt: number, input: InputState) {
    if (this.isPaused || this.isGameOver || this.isVictory) return;

    this.time += dt;

    // 0. Update Room Transition Sequence
    if (this.roomNetwork.transitionState.active) {
      this.roomNetwork.updateTransition(dt, (targetRoom, coords, dir) => {
        this.applyRoomSwap(targetRoom, coords, dir);
      });
      // Camera smoothly tracks player
      const target = this.calcPlayerScreen(this.player);
      this.cameraX += (target.x - this.cameraX) * 0.15;
      this.cameraY += (target.y - this.cameraY) * 0.15;
      this.updateParticles(dt);
      return;
    }

    // Tick invulnerability
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer = Math.max(0, this.player.invulnerableTimer - dt);
    }

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Energy slow recharge
    if (this.player.energy < this.player.maxEnergy) {
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + dt * 5);
    }

    // 1. Player Movement & Controls
    this.handlePlayerMovement(dt, input);

    // 2. Jumping & Vertical Physics
    this.handleVerticalPhysics(dt, input);

    // 3. In-Room Moving Elevators & Vertical Transport
    this.updateMovingElevators(dt);

    // 4. Interactions (Switches, Terminals)
    this.handleInteractions(input);

    // 5. Update Crate Pushing & Pressure Plates
    this.updateCratesAndSwitches(dt);

    // 5. Update Patrol & Guardian Drones
    this.updateDrones(dt);

    // 6. Check Item Pickups & Collectibles
    this.checkItemCollisions();

    if (this.transitionCooldown > 0) {
      this.transitionCooldown -= dt;
    }

    // 7. Check Laser Hazards
    this.checkLaserCollisions();

    // 8. Check Teleporters & Elevators
    if (this.transitionCooldown <= 0) {
      this.checkTeleporters();
      this.checkElevators();

      // 9. Check Doors & Sector Boundary Exits (North, South, East, West)
      this.checkDoors();
      this.roomNetwork.checkCompassExits(this.player, this.currentRoom, (msg) => {
        this.triggerNotify(msg, 'warn');
      });
    }

    // 10. Check Exit Portal
    this.checkExitPortal();

    // 11. Update Particles
    this.updateParticles(dt);

    // 12. Smooth Camera Follow
    const target = this.calcPlayerScreen(this.player);
    this.cameraX += (target.x - this.cameraX) * 0.12;
    this.cameraY += (target.y - this.cameraY) * 0.12;

    this.lastInteractPressed = input.interact;
    this.lastJumpPressed = input.jump;
    this.lastCarryPressed = !!input.carry;
  }

  // ----------------------------------------------------
  // PLAYER MOVEMENT & ISOMETRIC DIRECTIONS
  // ----------------------------------------------------
  private handlePlayerMovement(dt: number, input: InputState) {
    let inputDx = 0;
    let inputDy = 0;

    if (this.settings.controlMode === 'screen') {
      // Screen-Relative mapping:
      // UP -> (-1, -1) in grid space (moves visually Up on screen)
      // DOWN -> (+1, +1) in grid space (moves visually Down)
      // LEFT -> (-1, +1) in grid space (moves visually Left)
      // RIGHT -> (+1, -1) in grid space (moves visually Right)
      if (input.up) {
        inputDx -= 1;
        inputDy -= 1;
      }
      if (input.down) {
        inputDx += 1;
        inputDy += 1;
      }
      if (input.left) {
        inputDx -= 1;
        inputDy += 1;
      }
      if (input.right) {
        inputDx += 1;
        inputDy -= 1;
      }
    } else {
      // Isometric Direction mapping (classic Head Over Heels):
      // UP -> North-East (-y)
      // DOWN -> South-West (+y)
      // RIGHT -> South-East (+x)
      // LEFT -> North-West (-x)
      if (input.up) inputDy -= 1;
      if (input.down) inputDy += 1;
      if (input.right) inputDx += 1;
      if (input.left) inputDx -= 1;
    }

    const isMoving = inputDx !== 0 || inputDy !== 0;
    this.player.isMoving = isMoving;

    if (isMoving) {
      // Normalize vector
      const len = Math.sqrt(inputDx * inputDx + inputDy * inputDy);
      const nx = inputDx / len;
      const ny = inputDy / len;

      // Determine 8-directional facing
      this.player.direction = this.calcDirection(nx, ny);

      const baseSpeed = input.run && this.player.energy > 5 ? 4.8 : 3.0;
      this.player.isRunning = input.run && this.player.energy > 5;
      if (this.player.isRunning) {
        this.player.energy = Math.max(0, this.player.energy - dt * 10);
      }

      const moveDist = baseSpeed * dt;
      const nextX = this.player.x + nx * moveDist;
      const nextY = this.player.y + ny * moveDist;

      // Check collision and sliding against walls/crates
      this.attemptMove(nextX, nextY, nx, ny);

      this.player.walkFrame += dt * (this.player.isRunning ? 14 : 9);
    } else {
      this.player.isRunning = false;
    }
  }

  private calcDirection(dx: number, dy: number): Direction {
    if (dx > 0.3 && dy > 0.3) return 'SE';
    if (dx < -0.3 && dy < -0.3) return 'NW';
    if (dx > 0.3 && dy < -0.3) return 'NE';
    if (dx < -0.3 && dy > 0.3) return 'SW';
    if (dx > 0.3) return 'E';
    if (dx < -0.3) return 'W';
    if (dy > 0.3) return 'S';
    return 'N';
  }

  private attemptMove(targetX: number, targetY: number, dirX: number, dirY: number) {
    const pRadius = 0.32;

    // Check X axis independently (allows smooth wall sliding)
    if (this.isPositionWalkable(targetX, this.player.y, this.player.z, pRadius)) {
      this.player.x = targetX;
    } else {
      // Check if colliding with a pushable crate
      this.checkCratePush(targetX, this.player.y, dirX, 0);
    }

    // Check Y axis independently
    if (this.isPositionWalkable(this.player.x, targetY, this.player.z, pRadius)) {
      this.player.y = targetY;
    } else {
      this.checkCratePush(this.player.x, targetY, 0, dirY);
    }
  }

  private isPositionWalkable(x: number, y: number, z: number, radius: number = 0.32): boolean {
    // Check map boundaries
    if (x - radius < 0 || x + radius >= this.currentRoom.width || y - radius < 0 || y + radius >= this.currentRoom.depth) {
      return false;
    }

    // Check 4 corner points around the player circle
    const testPoints = [
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y - radius },
      { x: x - radius, y: y + radius },
      { x: x + radius, y: y + radius },
    ];

    for (const pt of testPoints) {
      const gx = Math.floor(pt.x);
      const gy = Math.floor(pt.y);

      if (gx < 0 || gx >= this.currentRoom.width || gy < 0 || gy >= this.currentRoom.depth) {
        return false;
      }

      const tile = this.currentRoom.floorGrid[gx][gy];
      // If tile is a wall: only blocks if player is not jumping/walking above the wall top
      if (tile.type === 'wall') {
        if (z < (tile.elevation || 2) - 0.1) {
          return false;
        }
      }

      // Height step tolerance: can step up 0.3 elevation without jumping (e.g. ramps / low curbs)
      if (tile.elevation > z + 0.3) {
        return false;
      }
    }

    // Check collision with crates
    for (const crate of this.currentRoom.crates) {
      if (crate.isCarried) continue;
      const crateBox = {
        x: crate.x - 0.5 * crate.w,
        y: crate.y - 0.5 * crate.d,
        z: crate.z,
        w: crate.w,
        d: crate.d,
        h: crate.h,
      };
      const playerBox = {
        x: x - radius,
        y: y - radius,
        z: z,
        w: radius * 2,
        d: radius * 2,
        h: 1.2,
      };

      if (checkAABBCollision(crateBox, playerBox)) {
        // Only block if not on top of the crate
        if (z < crate.z + crate.h - 0.15) {
          return false;
        }
      }
    }

    return true;
  }

  // ----------------------------------------------------
  // CRATE PUSHING
  // ----------------------------------------------------
  private checkCratePush(targetX: number, targetY: number, pushDirX: number, pushDirY: number) {
    if (Math.abs(pushDirX) < 0.1 && Math.abs(pushDirY) < 0.1) return;

    for (const crate of this.currentRoom.crates) {
      if (crate.isMoving || crate.isCarried) continue;

      const dist = distance2D(targetX, targetY, crate.x, crate.y);
      // If player is contacting this crate and at roughly the same elevation
      if (dist < 0.95 && Math.abs(this.player.z - crate.z) < 0.5) {
        // Determine primary axis push
        let stepX = 0;
        let stepY = 0;
        if (Math.abs(pushDirX) >= Math.abs(pushDirY)) {
          stepX = pushDirX > 0.1 ? 1 : pushDirX < -0.1 ? -1 : 0;
        } else {
          stepY = pushDirY > 0.1 ? 1 : pushDirY < -0.1 ? -1 : 0;
        }

        if (stepX === 0 && stepY === 0) continue;

        const destX = Math.round(crate.x) + stepX;
        const destY = Math.round(crate.y) + stepY;

        // Check if destination grid tile is free and physically valid
        if (PuzzleSystem.canCrateMoveTo(destX, destY, crate, this.currentRoom)) {
          crate.targetX = destX;
          crate.targetY = destY;
          crate.isMoving = true;

          // If another crate is stacked on top of this crate, move the stack together!
          const stacked = this.currentRoom.crates.find(
            (c) =>
              c.id !== crate.id &&
              !c.isCarried &&
              Math.abs(c.x - crate.x) < 0.45 &&
              Math.abs(c.y - crate.y) < 0.45 &&
              c.z > crate.z &&
              c.z <= crate.z + crate.h + 0.2
          );
          if (stacked) {
            stacked.targetX = destX;
            stacked.targetY = destY;
            stacked.isMoving = true;
          }

          sound.playPushCrate();
          this.spawnDust(crate.x, crate.y, crate.z);
          break;
        }
      }
    }
  }

  private updateCratesAndSwitches(dt: number) {
    const gravity = -14;

    // 1. Move crates smoothly towards target position and simulate vertical gravity
    for (const crate of this.currentRoom.crates) {
      if (crate.isCarried) continue;

      if (crate.isMoving && crate.targetX !== undefined && crate.targetY !== undefined) {
        const dx = crate.targetX - crate.x;
        const dy = crate.targetY - crate.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) {
          crate.x = crate.targetX;
          crate.y = crate.targetY;
          crate.isMoving = false;
          crate.targetX = undefined;
          crate.targetY = undefined;
        } else {
          crate.x += (dx / dist) * dt * 3.8;
          crate.y += (dy / dist) * dt * 3.8;
        }
      }

      // Vertical 3D gravity for crates (falling off platforms or ledges onto lower floors/crates)
      const crateSurface = this.getCrateSurfaceHeightBelow(crate);
      if (crate.z > crateSurface + 0.05) {
        crate.vz = (crate.vz || 0) + gravity * dt;
        crate.z += crate.vz * dt;
        crate.isFalling = true;

        if (crate.z <= crateSurface) {
          crate.z = crateSurface;
          crate.vz = 0;
          crate.isFalling = false;
          sound.playLand();
          this.spawnDust(crate.x, crate.y, crate.z);
        }
      } else {
        crate.z = crateSurface;
        crate.vz = 0;
        crate.isFalling = false;
      }
    }

    // 2. Evaluate all room puzzle entities via PuzzleSystem
    PuzzleSystem.updatePuzzles(
      this.currentRoom,
      this.player,
      this.triggerNotify.bind(this)
    );
  }

  // ----------------------------------------------------
  // VERTICAL PHYSICS, JUMPING & FALL DAMAGE
  // ----------------------------------------------------
  private handleVerticalPhysics(dt: number, input: InputState) {
    const gravity = -14;
    const jumpVelocity = 5.2;

    // Find highest surface height directly below player
    const groundElevation = this.getSurfaceHeightBelow(this.player.x, this.player.y);

    // Record last safe spot for abyss recovery
    if (this.player.isGrounded) {
      const curTile = this.currentRoom.floorGrid[Math.floor(this.player.x)]?.[Math.floor(this.player.y)];
      if (curTile && curTile.type !== 'hazard' && curTile.type !== 'pit') {
        this.player.lastSafeX = this.player.x;
        this.player.lastSafeY = this.player.y;
        this.player.lastSafeZ = this.player.z;
      }
    }

    // Jump initiate
    if (input.jump && !this.lastJumpPressed && this.player.isGrounded) {
      this.player.vz = jumpVelocity;
      this.player.isGrounded = false;
      this.player.isJumping = true;
      this.player.fallStartZ = this.player.z;
      sound.playJump();
      this.spawnDust(this.player.x, this.player.y, this.player.z);
    }

    if (!this.player.isGrounded) {
      if (this.player.fallStartZ === undefined) {
        this.player.fallStartZ = this.player.z;
      }

      this.player.vz += gravity * dt;
      this.player.z += this.player.vz * dt;

      // Check landing
      if (this.player.z <= groundElevation) {
        const fallDist = (this.player.fallStartZ ?? groundElevation) - groundElevation;
        this.player.z = groundElevation;
        this.player.vz = 0;
        this.player.isGrounded = true;
        this.player.isJumping = false;

        // Fall damage calculation: high altitude drops (> 1.8 elevation drop) cause impact damage
        if (fallDist > 1.8) {
          const damage = Math.min(65, Math.round((fallDist - 1.5) * 22));
          this.player.health = Math.max(0, this.player.health - damage);
          this.player.invulnerableTimer = 0.8;
          this.screenShake = Math.min(18, (fallDist - 1.5) * 6);
          sound.playFallDamage();
          this.spawnSparks(this.player.x, this.player.y, this.player.z, '#ef4444');
          this.triggerNotify(
            `CRITICAL IMPACT: High altitude drop sustained -${damage}% damage! [${fallDist.toFixed(1)}m]`,
            'error'
          );
          if (this.player.health <= 0) {
            this.isGameOver = true;
            this.triggerNotify('CRITICAL FAILURE: Lethal vertical drop impact.', 'error');
          }
        } else {
          sound.playLand();
        }

        this.spawnDust(this.player.x, this.player.y, this.player.z);
        this.player.fallStartZ = undefined;
      }
    } else {
      // Check falling off edges or crates
      if (this.player.z > groundElevation + 0.05) {
        this.player.isGrounded = false;
        if (this.player.fallStartZ === undefined) {
          this.player.fallStartZ = this.player.z;
        }
      } else {
        this.player.z = groundElevation;
      }
    }

    // Pit void check (falling off map or into abyss)
    const currentTile = this.currentRoom.floorGrid[Math.floor(this.player.x)]?.[Math.floor(this.player.y)];
    if (currentTile?.type === 'pit' && this.player.z <= -0.7) {
      this.player.health = Math.max(0, this.player.health - 25);
      sound.playFallDamage();
      this.screenShake = 12;
      this.spawnSparks(this.player.x, this.player.y, this.player.z, '#ef4444');
      this.triggerNotify('HAZARD VOID: Abyss recovery protocol engaged! -25% HP', 'error');
      this.player.x = this.player.lastSafeX ?? this.currentRoom.defaultPlayerSpawn.x;
      this.player.y = this.player.lastSafeY ?? this.currentRoom.defaultPlayerSpawn.y;
      this.player.z = (this.player.lastSafeZ ?? this.currentRoom.defaultPlayerSpawn.z) + 0.2;
      this.player.vz = 0;
      this.player.isGrounded = true;
      this.player.fallStartZ = undefined;
      if (this.player.health <= 0) {
        this.isGameOver = true;
        this.triggerNotify('CRITICAL FAILURE: Lost in station void.', 'error');
      }
    }
  }

  private getSurfaceHeightBelow(x: number, y: number): number {
    let maxHeight = 0;
    const gx = Math.floor(x);
    const gy = Math.floor(y);

    if (gx >= 0 && gx < this.currentRoom.width && gy >= 0 && gy < this.currentRoom.depth) {
      const tile = this.currentRoom.floorGrid[gx][gy];
      maxHeight = tile.elevation || 0;
    }

    // Check if on top of any crate
    for (const crate of this.currentRoom.crates) {
      if (crate.isCarried) continue;
      if (
        x >= crate.x - 0.48 * crate.w &&
        x <= crate.x + 0.48 * crate.w &&
        y >= crate.y - 0.48 * crate.d &&
        y <= crate.y + 0.48 * crate.d
      ) {
        const topOfCrate = crate.z + crate.h;
        if (topOfCrate > maxHeight && this.player.z >= topOfCrate - 0.25) {
          maxHeight = topOfCrate;
        }
      }
    }

    // Check if on top of any moving elevator
    if (this.currentRoom.movingElevators) {
      for (const elev of this.currentRoom.movingElevators) {
        const halfW = (elev.width || 1.2) * 0.55;
        const halfD = (elev.depth || 1.2) * 0.55;
        if (
          Math.abs(x - elev.x) <= halfW &&
          Math.abs(y - elev.y) <= halfD &&
          this.player.z >= elev.z - 0.25
        ) {
          if (elev.z > maxHeight) maxHeight = elev.z;
        }
      }
    }

    return maxHeight;
  }

  private getCrateSurfaceHeightBelow(crate: CrateEntity): number {
    let maxHeight = 0;
    const gx = Math.floor(crate.x);
    const gy = Math.floor(crate.y);

    if (gx >= 0 && gx < this.currentRoom.width && gy >= 0 && gy < this.currentRoom.depth) {
      const tile = this.currentRoom.floorGrid[gx][gy];
      maxHeight = tile.elevation || 0;
    }

    // Check other crates below this crate
    for (const other of this.currentRoom.crates) {
      if (other.id === crate.id || other.isCarried) continue;
      if (
        Math.abs(crate.x - other.x) < 0.7 &&
        Math.abs(crate.y - other.y) < 0.7 &&
        other.z + other.h <= crate.z + 0.1
      ) {
        const top = other.z + other.h;
        if (top > maxHeight) maxHeight = top;
      }
    }

    // Check moving elevators below this crate
    if (this.currentRoom.movingElevators) {
      for (const elev of this.currentRoom.movingElevators) {
        const halfW = (elev.width || 1.2) * 0.55;
        const halfD = (elev.depth || 1.2) * 0.55;
        if (
          Math.abs(crate.x - elev.x) <= halfW &&
          Math.abs(crate.y - elev.y) <= halfD &&
          elev.z <= crate.z + 0.1
        ) {
          if (elev.z > maxHeight) maxHeight = elev.z;
        }
      }
    }

    return maxHeight;
  }

  // ----------------------------------------------------
  // IN-ROOM MOVING ELEVATORS
  // ----------------------------------------------------
  private updateMovingElevators(dt: number) {
    if (!this.currentRoom.movingElevators || this.currentRoom.movingElevators.length === 0) return;

    for (const elev of this.currentRoom.movingElevators) {
      // Check if elevator requires switch activation
      if (elev.requiredSwitchId) {
        const sw = this.currentRoom.switches.find((s) => s.id === elev.requiredSwitchId);
        if (sw && !sw.isActivated) {
          elev.isMoving = false;
          continue;
        }
      }

      elev.isMoving = true;

      // Handle pause timers at stops
      if (elev.pauseTimer !== undefined && elev.pauseTimer > 0) {
        elev.pauseTimer -= dt;
        continue;
      }

      // Check multi-deck tower stops (e.g. elevator tower room)
      if (elev.floorHeights && elev.floorHeights.length > 1) {
        const currentIdx = elev.currentFloorIndex ?? 0;
        const targetZ = elev.floorHeights[currentIdx];
        const step = elev.speed * dt;

        if (Math.abs(elev.z - targetZ) <= step) {
          elev.z = targetZ;
          elev.pauseTimer = elev.pauseDuration ?? 1.5;

          if (elev.direction === 1) {
            if (currentIdx + 1 >= elev.floorHeights.length) {
              elev.direction = -1;
              elev.currentFloorIndex = currentIdx - 1;
            } else {
              elev.currentFloorIndex = currentIdx + 1;
            }
          } else {
            if (currentIdx - 1 < 0) {
              elev.direction = 1;
              elev.currentFloorIndex = currentIdx + 1;
            } else {
              elev.currentFloorIndex = currentIdx - 1;
            }
          }
        } else {
          elev.z += (elev.z < targetZ ? 1 : -1) * step;
        }
      } else {
        // Continuous moving elevator between minZ and maxZ
        const step = elev.speed * dt * elev.direction;
        elev.z += step;

        if (elev.z >= elev.maxZ) {
          elev.z = elev.maxZ;
          elev.direction = -1;
          elev.pauseTimer = elev.pauseDuration ?? 1.2;
        } else if (elev.z <= elev.minZ) {
          elev.z = elev.minZ;
          elev.direction = 1;
          elev.pauseTimer = elev.pauseDuration ?? 1.2;
        }
      }

      const platformHalfW = (elev.width || 1.2) * 0.55;
      const platformHalfD = (elev.depth || 1.2) * 0.55;

      // Check if player is on the elevator platform
      const playerOnElev =
        Math.abs(this.player.x - elev.x) <= platformHalfW &&
        Math.abs(this.player.y - elev.y) <= platformHalfD &&
        Math.abs(this.player.z - elev.z) <= 0.45;

      if (playerOnElev && this.player.vz <= 0.2) {
        this.player.z = elev.z;
        this.player.isGrounded = true;
        this.player.vz = 0;
      }

      // Check if any crate is resting on the elevator platform
      for (const crate of this.currentRoom.crates) {
        if (
          Math.abs(crate.x - elev.x) <= platformHalfW &&
          Math.abs(crate.y - elev.y) <= platformHalfD &&
          Math.abs(crate.z - elev.z) <= 0.45
        ) {
          crate.z = elev.z;
          crate.vz = 0;
          crate.isFalling = false;
        }
      }
    }
  }

  // ----------------------------------------------------
  // INTERACTION (Toggle switches, Terminals, Crate Carry & Drop)
  // ----------------------------------------------------
  private handleInteractions(input: InputState) {
    // Advanced Crate Handling (Carry, Drop, Stack)
    this.handleCrateCarryAndDrop(input);

    if (input.interact && !this.lastInteractPressed) {
      // Find nearby interactive switch
      for (const sw of this.currentRoom.switches) {
        if (sw.type === 'toggle' || sw.type === 'terminal') {
          const dist = distance2D(this.player.x, this.player.y, sw.x, sw.y);
          if (dist < 1.35) {
            PuzzleSystem.toggleEnergySwitch(
              this.currentRoom,
              sw,
              this.triggerNotify.bind(this)
            );
            break;
          }
        }
      }
    }
  }

  // ----------------------------------------------------
  // ADVANCED CRATE SYSTEM: CARRY, DROP & STACKING
  // ----------------------------------------------------
  private handleCrateCarryAndDrop(input: InputState) {
    // Keep carried crate synchronized with player position
    if (this.player.carriedCrate) {
      this.player.carriedCrate.x = this.player.x;
      this.player.carriedCrate.y = this.player.y;
      this.player.carriedCrate.z = this.player.z + 1.2;
    }

    const carryTriggered = !!input.carry && !this.lastCarryPressed;
    const interactTriggered = input.interact && !this.lastInteractPressed;

    if (!carryTriggered && !interactTriggered) return;

    // CASE 1: ALREADY CARRYING A CRATE -> DROP OR STACK
    if (this.player.carriedCrate) {
      this.dropCarriedCrate();
      return;
    }

    // CASE 2: NOT CARRYING A CRATE -> ATTEMPT PICK UP
    // If interact was pressed, verify player isn't using a terminal/switch first
    if (interactTriggered && !carryTriggered) {
      const nearSwitch = this.currentRoom.switches.some(
        (sw) =>
          (sw.type === 'toggle' || sw.type === 'terminal') &&
          distance2D(this.player.x, this.player.y, sw.x, sw.y) < 1.35
      );
      if (nearSwitch) return; // Prioritize switch interaction
    }

    // Search for closest topmost crate within pickup range
    let bestCrate: CrateEntity | null = null;
    let bestDist = 1.35;

    for (const crate of this.currentRoom.crates) {
      if (crate.isCarried) continue;
      const d = distance2D(this.player.x, this.player.y, crate.x, crate.y);
      const dz = Math.abs(this.player.z - crate.z);

      if (d < bestDist && dz <= 1.4) {
        // Crate must be topmost (no other crate resting on top)
        const hasCrateOnTop = this.currentRoom.crates.some(
          (other) =>
            other.id !== crate.id &&
            !other.isCarried &&
            Math.abs(other.x - crate.x) < 0.5 &&
            Math.abs(other.y - crate.y) < 0.5 &&
            other.z > crate.z + 0.2
        );

        if (!hasCrateOnTop) {
          bestCrate = crate;
          bestDist = d;
        }
      }
    }

    if (bestCrate) {
      this.pickUpCrate(bestCrate);
    }
  }

  private pickUpCrate(crate: CrateEntity) {
    crate.isCarried = true;
    crate.isMoving = false;
    crate.targetX = undefined;
    crate.targetY = undefined;
    crate.vz = 0;

    // Remove from active room crates list while carried
    this.currentRoom.crates = this.currentRoom.crates.filter((c) => c.id !== crate.id);
    this.player.carriedCrate = crate;

    crate.x = this.player.x;
    crate.y = this.player.y;
    crate.z = this.player.z + 1.2;

    sound.playLiftCrate();
    this.spawnDust(crate.x, crate.y, crate.z);
    this.triggerNotify('CRATE LIFTED: Press [C] or [E] to Deploy / Stack Cargo', 'info');

    // Re-evaluate puzzles immediately so pressure plates update
    PuzzleSystem.updatePuzzles(this.currentRoom, this.player, this.triggerNotify.bind(this));
  }

  private dropCarriedCrate() {
    const crate = this.player.carriedCrate;
    if (!crate) return;

    // Determine target drop tile in front of player based on facing direction
    let dirX = 0;
    let dirY = 0;
    switch (this.player.direction) {
      case 'E':
      case 'SE':
      case 'NE':
        dirX = 1;
        break;
      case 'W':
      case 'SW':
      case 'NW':
        dirX = -1;
        break;
    }
    switch (this.player.direction) {
      case 'S':
      case 'SE':
      case 'SW':
        dirY = 1;
        break;
      case 'N':
      case 'NE':
      case 'NW':
        dirY = -1;
        break;
    }

    // Attempt front tile first
    let dropX = Math.round(this.player.x + dirX);
    let dropY = Math.round(this.player.y + dirY);

    // If out of bounds or blocked by high wall, fallback to current player tile
    const isOutOfBounds =
      dropX <= 0 ||
      dropX >= this.currentRoom.width - 1 ||
      dropY <= 0 ||
      dropY >= this.currentRoom.depth - 1;
    const frontTile = !isOutOfBounds ? this.currentRoom.floorGrid[dropX]?.[dropY] : null;
    const isFrontWall =
      frontTile?.type === 'wall' && (frontTile.elevation || 2) > this.player.z + 1.0;

    if (isOutOfBounds || isFrontWall) {
      dropX = Math.round(this.player.x);
      dropY = Math.round(this.player.y);
    }

    // Calculate surface height at drop location
    const baseTile = this.currentRoom.floorGrid[dropX]?.[dropY];
    let surfaceZ = baseTile?.elevation || 0;
    let stackedOnCrate: CrateEntity | null = null;

    // Check for existing crates at this tile to stack on top!
    for (const other of this.currentRoom.crates) {
      if (other.id === crate.id || other.isCarried) continue;
      if (Math.abs(other.x - dropX) < 0.65 && Math.abs(other.y - dropY) < 0.65) {
        const topOfOther = other.z + other.h;
        if (topOfOther > surfaceZ) {
          surfaceZ = topOfOther;
          stackedOnCrate = other;
        }
      }
    }

    crate.x = dropX;
    crate.y = dropY;
    crate.z = surfaceZ;
    crate.vz = 0;
    crate.isMoving = false;
    crate.targetX = undefined;
    crate.targetY = undefined;
    crate.isCarried = false;

    this.currentRoom.crates.push(crate);
    this.player.carriedCrate = null;

    if (stackedOnCrate) {
      sound.playCrateStack();
      this.spawnSparks(dropX, dropY, surfaceZ);
      this.triggerNotify(`CRATE STACKED: Elevation tier ${surfaceZ.toFixed(1)}m achieved`, 'success');
    } else {
      sound.playDropCrate();
      this.spawnDust(dropX, dropY, surfaceZ);
      this.triggerNotify('CRATE DEPLOYED: Placed on deck', 'info');
    }

    // Re-evaluate puzzles
    PuzzleSystem.updatePuzzles(this.currentRoom, this.player, this.triggerNotify.bind(this));
  }

  // ----------------------------------------------------
  // ADVANCED ENEMY AI SYSTEM
  // ----------------------------------------------------
  private updateDrones(dt: number) {
    // 1. Update active enemy projectiles
    EnemyAISystem.updateProjectiles(this.projectiles, dt, this.player, this.currentRoom, {
      damagePlayer: (amt, sx, sy) => this.damagePlayer(amt, sx, sy),
      triggerNotify: (msg, type) => this.triggerNotify(msg, type),
      spawnSparks: (x, y, z) => this.spawnSparks(x, y, z),
      spawnDust: (x, y, z) => this.spawnDust(x, y, z),
    });

    // 2. Update each enemy with Advanced AI
    const dronesCopy = [...this.currentRoom.drones];
    for (const drone of dronesCopy) {
      EnemyAISystem.updateEnemy(
        drone,
        dt,
        this.player,
        this.currentRoom,
        this.roomsState,
        this.projectiles,
        {
          damagePlayer: (amt, sx, sy) => this.damagePlayer(amt, sx, sy),
          triggerNotify: (msg, type) => this.triggerNotify(msg, type),
          spawnSparks: (x, y, z) => this.spawnSparks(x, y, z),
          spawnDust: (x, y, z) => this.spawnDust(x, y, z),
          onEnemyRoomTransition: (d, from, to) => {
            this.triggerNotify(`SECURITY ALERT: ${d.type?.toUpperCase()} drone breached from ${from} into ${to}!`, 'warn');
          },
        }
      );
    }
  }

  private damagePlayer(amount: number, sourceX: number, sourceY: number) {
    if (this.player.invulnerableTimer > 0) return;

    this.player.health = Math.max(0, this.player.health - amount);
    this.player.invulnerableTimer = 1.2;
    sound.playDamage();
    this.triggerNotify(`Hull integrity damaged! -${amount}%`, 'error');

    // Knockback
    const dx = this.player.x - sourceX;
    const dy = this.player.y - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.player.x += (dx / len) * 0.4;
    this.player.y += (dy / len) * 0.4;

    this.spawnSparks(this.player.x, this.player.y, this.player.z);

    if (this.player.health <= 0) {
      this.isGameOver = true;
      this.triggerNotify('CRITICAL FAILURE: Hull breach. System offline.', 'error');
    }
  }

  // ----------------------------------------------------
  // ITEM COLLECTION
  // ----------------------------------------------------
  private checkItemCollisions() {
    for (const item of this.currentRoom.items) {
      if (item.isCollected) continue;

      const dist = distance2D(this.player.x, this.player.y, item.x, item.y);
      if (dist < 0.8 && Math.abs(this.player.z - item.z) < 0.8) {
        item.isCollected = true;

        if (item.type === 'keycard_alpha' || item.type === 'keycard_blue') {
          if (!this.player.keycards.includes('BLUE')) this.player.keycards.push('BLUE');
          if (!this.player.keycards.includes('ALPHA')) this.player.keycards.push('ALPHA');
          sound.playKeycardPickup();
          this.triggerNotify('ACQUIRED: Blue Security Keycard [Tier 1]', 'success');
        } else if (item.type === 'keycard_red') {
          if (!this.player.keycards.includes('RED')) this.player.keycards.push('RED');
          sound.playKeycardPickup();
          this.triggerNotify('ACQUIRED: Red Security Keycard [Tier 2 Reactor Clearance]', 'success');
        } else if (item.type === 'keycard_green') {
          if (!this.player.keycards.includes('GREEN')) this.player.keycards.push('GREEN');
          sound.playKeycardPickup();
          this.triggerNotify('ACQUIRED: Green Security Keycard [Tier 3 Master Apex]', 'success');
        } else if (item.type === 'keycard_beta') {
          if (!this.player.keycards.includes('BETA')) this.player.keycards.push('BETA');
          sound.playKeycardPickup();
          this.triggerNotify('ACQUIRED: Beta Security Keycard', 'success');
        } else if (item.type === 'nexus_fragment') {
          const fragId = item.fragmentId || 1;
          if (!this.player.nexusFragments) this.player.nexusFragments = [];
          if (!this.player.nexusFragments.includes(fragId)) {
            this.player.nexusFragments.push(fragId);
          }
          sound.playFragmentPickup();
          this.triggerNotify(
            `RECOVERED: ${item.name || 'Nexus Fragment'} [${this.player.nexusFragments.length}/5 Collected]`,
            'success'
          );
        } else if (item.type === 'energy_cell') {
          this.player.energyCells += 1;
          sound.playEnergyPickup();
          this.triggerNotify(`ACQUIRED: Plasma Energy Cell (${this.player.energyCells})`, 'success');
        } else if (item.type === 'medkit') {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
          sound.playEnergyPickup();
          this.triggerNotify('Restored 40% Hull Integrity', 'info');
        }

        this.spawnSparks(item.x, item.y, item.z, '#38bdf8');
      }
    }
  }

  // ----------------------------------------------------
  // LASER COLLISION (With Crate & Stacking Occlusion)
  // ----------------------------------------------------
  private checkLaserCollisions() {
    for (const laser of this.currentRoom.lasers) {
      if (!laser.isActive) continue;

      // Check if any crate in the room intercepts this laser beam between start and end
      let minBlockT = 1.0;
      for (const crate of this.currentRoom.crates) {
        if (crate.isCarried) continue;
        const dist = this.pointToSegmentDistance(
          crate.x,
          crate.y,
          laser.startX,
          laser.startY,
          laser.endX,
          laser.endY
        );

        // Does crate intersect horizontally and cover the laser's elevation?
        if (dist < 0.65 && laser.z >= crate.z - 0.15 && laser.z <= crate.z + crate.h + 0.15) {
          const l2 = (laser.endX - laser.startX) ** 2 + (laser.endY - laser.startY) ** 2;
          if (l2 > 0) {
            let t =
              ((crate.x - laser.startX) * (laser.endX - laser.startX) +
                (crate.y - laser.startY) * (laser.endY - laser.startY)) /
              l2;
            t = Math.max(0, Math.min(1, t));
            if (t < minBlockT) {
              minBlockT = t;
            }
          }
        }
      }

      // Calculate player projection on laser line
      const l2 = (laser.endX - laser.startX) ** 2 + (laser.endY - laser.startY) ** 2;
      let playerT = 0;
      if (l2 > 0) {
        playerT =
          ((this.player.x - laser.startX) * (laser.endX - laser.startX) +
            (this.player.y - laser.startY) * (laser.endY - laser.startY)) /
          l2;
        playerT = Math.max(0, Math.min(1, playerT));
      }

      // If player is past the block point, laser cannot hit player!
      if (playerT > minBlockT + 0.05) {
        continue;
      }

      // Distance from player point to unblocked laser line segment
      const effectiveEndX = laser.startX + minBlockT * (laser.endX - laser.startX);
      const effectiveEndY = laser.startY + minBlockT * (laser.endY - laser.startY);
      const dist = this.pointToSegmentDistance(
        this.player.x,
        this.player.y,
        laser.startX,
        laser.startY,
        effectiveEndX,
        effectiveEndY
      );

      if (dist < 0.45 && Math.abs(this.player.z - laser.z) < 0.8) {
        this.damagePlayer(25, (laser.startX + effectiveEndX) / 2, (laser.startY + effectiveEndY) / 2);
      }
    }
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return distance2D(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distance2D(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
  }

  // ----------------------------------------------------
  // TELEPORTERS & ELEVATORS
  // ----------------------------------------------------
  private checkTeleporters() {
    for (const tele of this.currentRoom.teleporters) {
      const dist = distance2D(this.player.x, this.player.y, tele.x, tele.y);
      if (dist < 0.6 && Math.abs(this.player.z - tele.z) < 0.5) {
        // Warp player
        this.player.x = tele.targetX;
        this.player.y = tele.targetY;
        this.player.z = tele.targetZ;
        sound.playTeleport();
        this.spawnSparks(this.player.x, this.player.y, this.player.z, tele.color);
        this.triggerNotify(`Quantum Beam: Relocated via ${tele.label || 'Portal'}`, 'info');
        break;
      }
    }
  }

  private checkElevators() {
    if (!this.currentRoom.elevators) return;
    for (const elev of this.currentRoom.elevators) {
      const dist = distance2D(this.player.x, this.player.y, elev.x, elev.y);
      if (dist < 0.75 && Math.abs(this.player.z - elev.z) < 0.5) {
        if (elev.isActive === false) {
          this.triggerNotify(
            `LIFT OFFLINE: Requires auxiliary power from pressure plate or energy switch`,
            'warn'
          );
          return;
        }
        sound.playElevator();
        this.spawnSparks(this.player.x, this.player.y, this.player.z, '#38bdf8');
        this.transitionToRoom(elev.targetRoomId, {
          x: elev.targetX,
          y: elev.targetY,
          z: elev.targetZ,
        });
        this.triggerNotify(`TRANSIT: ${elev.label || 'Service Lift'} Engaged`, 'info');
        break;
      }
    }
  }

  // ----------------------------------------------------
  // DOORS & ROOM TRANSITIONS
  // ----------------------------------------------------
  private checkDoors() {
    for (const door of this.currentRoom.doors) {
      const dist = distance2D(this.player.x, this.player.y, door.x, door.y);
      if (dist < 0.85) {
        if (!door.isOpen) {
          // Special Apex door to Sector 20 requires all 5 fragments
          if (door.leadsToRoom === 'sector_20') {
            const fragCount = this.player.nexusFragments?.length || 0;
            if (fragCount >= 5) {
              door.isOpen = true;
              sound.playDoor();
              this.triggerNotify('NEXUS HARMONIZATION COMPLETE: Overmind Gate Unsealed!', 'success');
            } else {
              this.triggerNotify(
                `NEXUS GATE SEALED: Requires all 5 Quantum Fragments (${fragCount}/5 Found)`,
                'warn'
              );
              return;
            }
          } else if (door.requiredSwitchIds && door.requiredSwitchIds.length > 0) {
            this.triggerNotify(
              `BULKHEAD LOCKED: Controlled by ${door.requiredSwitchIds.length} remote pressure/energy relays`,
              'warn'
            );
            return;
          } else if (door.requiredKeycard) {
            const unlocked = PuzzleSystem.handleKeycardDoor(
              door,
              this.player,
              this.triggerNotify.bind(this)
            );
            if (!unlocked) return;
          }
        }

        // Room Transition
        if (door.isOpen && door.leadsToRoom && this.roomsState[door.leadsToRoom]) {
          this.transitionToRoom(door.leadsToRoom, door.spawnCoords);
          break;
        }
      }
    }
  }

  public transitionToRoom(
    newRoomId: string,
    spawnCoords?: { x: number; y: number; z: number },
    directionLabel: 'N' | 'S' | 'E' | 'W' | 'teleport' | 'elevator' = 'E'
  ) {
    const nextRoom = this.roomsState[newRoomId];
    if (!nextRoom) return;

    const targetCoords = spawnCoords || {
      x: nextRoom.defaultPlayerSpawn.x,
      y: nextRoom.defaultPlayerSpawn.y,
      z: nextRoom.defaultPlayerSpawn.z,
    };

    // Trigger smooth room transition with animation
    this.roomNetwork.startTransition(
      newRoomId,
      targetCoords,
      nextRoom.defaultPlayerSpawn.direction,
      directionLabel
    );
  }

  public applyRoomSwap(
    nextRoom: RoomDefinition,
    targetCoords: { x: number; y: number; z: number },
    direction?: Direction
  ) {
    // Check if security drone was in hot pursuit
    const pursuingDrone = this.currentRoom.drones.find(
      (d) => (d.type === 'security' || d.type === 'guardian') && d.alertState === 'chase'
    );

    // Unload previous room (snapshots state)
    this.roomNetwork.unloadRoom(this.currentRoom);

    // Clear active projectiles for clean room transition
    this.projectiles = [];

    // Load and activate new room
    this.currentRoom = nextRoom;
    this.player.x = targetCoords.x;
    this.player.y = targetCoords.y;
    this.player.z = targetCoords.z;
    if (this.player.carriedCrate) {
      this.player.carriedCrate.x = targetCoords.x;
      this.player.carriedCrate.y = targetCoords.y;
      this.player.carriedCrate.z = targetCoords.z + 1.2;
    }
    if (direction) {
      this.player.direction = direction;
    }
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.vz = 0;

    // Multi-room pursuit: if Security drone was actively chasing, it follows through doorway
    if (pursuingDrone) {
      pursuingDrone.x = targetCoords.x - (direction === 'E' ? 1.5 : direction === 'W' ? -1.5 : 0);
      pursuingDrone.y = targetCoords.y - (direction === 'S' ? 1.5 : direction === 'N' ? -1.5 : 0);
      pursuingDrone.currentRoomId = nextRoom.id;
      pursuingDrone.lastKnownPos = { x: targetCoords.x, y: targetCoords.y, z: targetCoords.z };
      nextRoom.drones.push(pursuingDrone);
      sound.playSecuritySiren();
      this.triggerNotify(`SECURITY DRONE: Pursuit breached into ${nextRoom.name}!`, 'warn');
    }

    // Immediately align camera to new player location to avoid visual jumps
    const target = this.calcPlayerScreen(this.player);
    this.cameraX = target.x;
    this.cameraY = target.y;

    // Immediately evaluate puzzle state upon entering room
    PuzzleSystem.updatePuzzles(this.currentRoom, this.player);

    // Guard against instant bounce-back on room entry
    this.transitionCooldown = 0.8;

    sound.playDoor();
    this.triggerNotify(`ENTERING: ${nextRoom.name}`, 'info');

    // Automatic checkpoint save on entering room
    this.saveGame(true);
  }

  // ----------------------------------------------------
  // EXIT PORTAL & VICTORY
  // ----------------------------------------------------
  private checkExitPortal() {
    if (!this.currentRoom.exitPortal) return;

    const portal = this.currentRoom.exitPortal;
    const dist = distance2D(this.player.x, this.player.y, portal.x, portal.y);

    if (dist < 1.0) {
      const hasCells = this.player.energyCells >= (portal.requiredEnergyCells || 3);
      const fragCount = this.player.nexusFragments?.length || 0;
      const reqFrags = portal.requiredFragments ?? 5;
      const hasFragments = fragCount >= reqFrags;

      if (hasCells && hasFragments) {
        this.isVictory = true;
        sound.playVictory();
        this.triggerNotify('MISSION ACCOMPLISHED: All 5 Nexus Fragments Reunified! Station Escaped!', 'success');
      } else {
        if (!hasFragments) {
          this.triggerNotify(
            `EXTRACTION LOCKED: Unify all 5 Nexus Fragments (${fragCount}/${reqFrags} Recovered)`,
            'warn'
          );
        } else {
          this.triggerNotify(
            `EXTRACTION LOCKED: Collect ${portal.requiredEnergyCells} Energy Cells (${this.player.energyCells}/${portal.requiredEnergyCells})`,
            'warn'
          );
        }
      }
    }
  }

  // ----------------------------------------------------
  // PARTICLES
  // ----------------------------------------------------
  private spawnDust(x: number, y: number, z: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.4,
        y: y + (Math.random() - 0.5) * 0.4,
        vz: z,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 0.35,
        maxLife: 0.35,
        color: '#94a3b8',
        size: 2 + Math.random() * 2,
      });
    }
  }

  private spawnSparks(x: number, y: number, z: number, color: string = '#f59e0b') {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x,
        y,
        vz: z + 0.3,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private triggerNotify(msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    if (this.onNotification) {
      this.onNotification(msg, type);
    }
  }

  public restartGame() {
    this.roomNetwork.resetNetwork();
    this.roomsState = this.roomNetwork.roomsState;
    this.currentRoom = this.roomNetwork.loadRoom('sector_01');
    this.player.x = 2;
    this.player.y = 2;
    this.player.z = 0;
    this.player.health = 100;
    this.player.energy = 100;
    this.player.keycards = [];
    this.player.nexusFragments = [];
    this.player.carriedCrate = null;
    this.player.energyCells = 0;
    this.time = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    const target = this.calcPlayerScreen(this.player);
    this.cameraX = target.x;
    this.cameraY = target.y;
    this.triggerNotify('Station Reboot Initialized. Systems Nominal.', 'info');
  }

  public hasSavedGame(): boolean {
    return localStorage.getItem('headoverheels2_save') !== null;
  }

  public saveGame(silent: boolean = false): boolean {
    try {
      // Synchronize latest active room state prior to saving
      this.roomsState[this.currentRoom.id] = this.currentRoom;

      const state = {
        version: '2.0',
        timestamp: Date.now(),
        roomId: this.currentRoom.id,
        player: this.player,
        roomsState: this.roomsState,
        discoveredRooms: Array.from(this.roomNetwork.discoveredRooms),
        time: this.time,
      };
      localStorage.setItem('headoverheels2_save', JSON.stringify(state));
      if (typeof window !== 'undefined' && window.electronAPI?.saveLocal) {
        window.electronAPI.saveLocal('slot_01', state).catch(() => {});
      }
      if (!silent) {
        sound.playKeycardPickup();
        this.triggerNotify('PROGRESS SAVED: Station State Secured in Memory Slot.', 'success');
      }
      return true;
    } catch {
      if (!silent) {
        this.triggerNotify('Failed to save station state.', 'error');
      }
      return false;
    }
  }

  public loadGame(): boolean {
    try {
      const raw = localStorage.getItem('headoverheels2_save');
      if (!raw) {
        this.triggerNotify('No save data found in Memory Slot.', 'warn');
        return false;
      }
      const data = JSON.parse(raw);
      const baseRooms = buildRoomsFromJson();
      this.roomsState = { ...baseRooms, ...(data.roomsState || {}) };
      this.roomNetwork.roomsState = this.roomsState;
      if (Array.isArray(data.discoveredRooms)) {
        this.roomNetwork.discoveredRooms = new Set(data.discoveredRooms);
      }
      // Ensure full compatibility for all enemies across rooms
      for (const rId of Object.keys(this.roomsState)) {
        const r = this.roomsState[rId];
        if (r && Array.isArray(r.drones)) {
          r.drones = r.drones.map((d) => EnemyAISystem.initEnemy(d, r.id));
        }
      }
      this.currentRoom = this.roomNetwork.loadRoom(data.roomId || 'sector_01');
      this.player = data.player;
      if (!this.player.nexusFragments) this.player.nexusFragments = [];
      if (!this.player.keycards) this.player.keycards = [];
      if (this.player.carriedCrate === undefined) this.player.carriedCrate = null;
      this.time = data.time || 0;
      this.isGameOver = false;
      this.isVictory = false;
      this.isPaused = false;
      this.transitionCooldown = 0.8;

      // Re-evaluate puzzle states on loaded room
      PuzzleSystem.updatePuzzles(this.currentRoom, this.player);

      const target = this.calcPlayerScreen(this.player);
      this.cameraX = target.x;
      this.cameraY = target.y;
      sound.playTeleport();
      this.triggerNotify('SAVE RESTORED: Station Systems Re-synchronized.', 'success');
      return true;
    } catch {
      this.triggerNotify('Failed to load station state.', 'error');
      return false;
    }
  }

  public exportSaveJson(): string {
    // Synchronize latest active room state prior to export
    this.roomsState[this.currentRoom.id] = this.currentRoom;

    const state = {
      version: '2.0',
      timestamp: Date.now(),
      roomId: this.currentRoom.id,
      player: this.player,
      roomsState: this.roomsState,
      discoveredRooms: Array.from(this.roomNetwork.discoveredRooms),
      time: this.time,
    };
    return JSON.stringify(state, null, 2);
  }

  public importSaveJson(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.roomId || !data.player || !data.roomsState) {
        throw new Error('Invalid save file format');
      }
      const baseRooms = buildRoomsFromJson();
      this.roomsState = { ...baseRooms, ...(data.roomsState || {}) };
      this.roomNetwork.roomsState = this.roomsState;
      if (Array.isArray(data.discoveredRooms)) {
        this.roomNetwork.discoveredRooms = new Set(data.discoveredRooms);
      }
      // Ensure full compatibility for all enemies across rooms
      for (const rId of Object.keys(this.roomsState)) {
        const r = this.roomsState[rId];
        if (r && Array.isArray(r.drones)) {
          r.drones = r.drones.map((d) => EnemyAISystem.initEnemy(d, r.id));
        }
      }
      this.currentRoom = this.roomNetwork.loadRoom(data.roomId || 'sector_01');
      this.player = data.player;
      if (!this.player.nexusFragments) this.player.nexusFragments = [];
      if (!this.player.keycards) this.player.keycards = [];
      if (this.player.carriedCrate === undefined) this.player.carriedCrate = null;
      this.time = data.time || 0;
      this.isGameOver = false;
      this.isVictory = false;
      this.transitionCooldown = 0.8;
      const target = this.calcPlayerScreen(this.player);
      this.cameraX = target.x;
      this.cameraY = target.y;
      sound.playTeleport();
      this.triggerNotify('CUSTOM SAVE IMPORTED: Mission Resume Point Verified.', 'success');
      return true;
    } catch {
      this.triggerNotify('Import Failed: Invalid Station Log Data.', 'error');
      return false;
    }
  }
}
