import { sound } from '../audio/soundEffects';
import {
  Direction,
  EnemyAlertState,
  EnemyProjectile,
  EnemyType,
  PatrolDrone,
  PlayerState,
  RoomDefinition,
} from '../types/game';
import { distance2D, worldToScreen } from './isometric';

export interface EnemyAICallbacks {
  damagePlayer: (amount: number, sourceX: number, sourceY: number) => void;
  triggerNotify: (msg: string, type: 'info' | 'warn' | 'error' | 'success') => void;
  spawnSparks: (x: number, y: number, z: number) => void;
  spawnDust: (x: number, y: number, z: number) => void;
  onEnemyRoomTransition?: (enemy: PatrolDrone, fromRoomId: string, toRoomId: string) => void;
}

/**
 * Advanced Enemy AI System:
 * - Patrol Drone: Standard security patrol following waypoints, investigates sights, returns to patrol
 * - Security Drone: High-speed agile pursuit unit, broadcasts alert to peers, siren alarm, high damage
 * - Turret: Stationary defensive battery, sweeping laser sight, locks on target and fires high-energy laser bolts
 * - Flying Sentinel: High-altitude airborne drone, wide cone, flies over crates/pits, fires plasma bursts
 */
export class EnemyAISystem {
  /**
   * Initializes or normalizes an enemy entity ensuring all advanced AI attributes exist.
   */
  public static initEnemy(drone: PatrolDrone, roomId?: string): PatrolDrone {
    // Determine canonical enemy type
    if (!drone.type) {
      drone.type = 'patrol';
    } else if ((drone.type as string) === 'guardian') {
      drone.type = 'security';
    }

    drone.currentRoomId = drone.currentRoomId || roomId || 'sector_01';
    drone.alertState = drone.alertState || 'patrol';
    drone.alertLevel = drone.alertLevel ?? 0;
    drone.alertTimer = drone.alertTimer ?? 0;
    drone.bobOffset = drone.bobOffset ?? Math.random() * Math.PI * 2;

    if (drone.originX === undefined) drone.originX = drone.x;
    if (drone.originY === undefined) drone.originY = drone.y;
    if (drone.originZ === undefined) drone.originZ = drone.z;

    // Direction to angle mapping
    if (drone.visionAngle === undefined) {
      drone.visionAngle = this.directionToAngle(drone.direction || 'S');
    }

    // Specialize per enemy type
    switch (drone.type) {
      case 'turret':
        drone.speed = 0;
        drone.chaseSpeed = 0;
        drone.damage = drone.damage || 22;
        drone.visionRange = drone.visionRange || 6.8;
        drone.visionFov = drone.visionFov || Math.PI * 0.38; // ~68 degrees focused laser cone
        drone.turretSweepArc = drone.turretSweepArc || Math.PI * 0.8;
        drone.baseAngle = drone.baseAngle ?? drone.visionAngle;
        drone.attackInterval = drone.attackInterval || 1.3;
        drone.attackCooldown = drone.attackCooldown ?? 0.5;
        drone.chargeTimer = 0;
        drone.sweepDirection = drone.sweepDirection ?? 1;
        break;

      case 'security':
        drone.speed = drone.speed || 2.4;
        drone.chaseSpeed = drone.chaseSpeed || 3.4;
        drone.damage = drone.damage || 28;
        drone.visionRange = drone.visionRange || 5.8;
        drone.visionFov = drone.visionFov || Math.PI * 0.44; // ~80 degrees
        drone.searchDuration = drone.searchDuration || 4.0;
        drone.detectionRadius = drone.detectionRadius || 5.8;
        break;

      case 'sentinel':
        drone.speed = drone.speed || 1.9;
        drone.chaseSpeed = drone.chaseSpeed || 2.7;
        drone.damage = drone.damage || 20;
        drone.visionRange = drone.visionRange || 6.2;
        drone.visionFov = drone.visionFov || Math.PI * 0.52; // ~94 degrees broad cone
        drone.attackInterval = drone.attackInterval || 2.0;
        drone.attackCooldown = drone.attackCooldown ?? 1.0;
        drone.searchDuration = drone.searchDuration || 3.8;
        if (drone.z < 1.4) drone.z = 1.8; // Air cruising altitude
        break;

      case 'patrol':
      default:
        drone.speed = drone.speed || 1.8;
        drone.chaseSpeed = drone.chaseSpeed || 2.5;
        drone.damage = drone.damage || 16;
        drone.visionRange = drone.visionRange || 4.8;
        drone.visionFov = drone.visionFov || Math.PI * 0.4; // ~72 degrees
        drone.searchDuration = drone.searchDuration || 3.5;
        drone.detectionRadius = drone.detectionRadius || 4.8;
        break;
    }

    return drone;
  }

  /**
   * Precise Raymarching Line-of-Sight (LOS) test.
   * Checks for obstructions from walls, closed doors, and tall pushable crates.
   */
  public static hasLineOfSight(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    room: RoomDefinition
  ): boolean {
    const dist = distance2D(x1, y1, x2, y2);
    if (dist <= 0.2) return true;

    const steps = Math.ceil(dist / 0.25);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    const dz = (z2 - z1) / steps;

    let curX = x1;
    let curY = y1;
    let curZ = z1;

    for (let i = 1; i < steps; i++) {
      curX += dx;
      curY += dy;
      curZ += dz;

      const gx = Math.floor(curX);
      const gy = Math.floor(curY);

      // Check wall grid collision
      if (gx >= 0 && gx < room.width && gy >= 0 && gy < room.depth) {
        const tile = room.floorGrid[gx]?.[gy];
        if (tile && tile.type === 'wall') {
          const wallTop = tile.elevation || 2.0;
          if (curZ < wallTop - 0.1) {
            return false; // Obstructed by wall
          }
        }
      }

      // Check closed doors
      for (const door of room.doors) {
        if (!door.isOpen) {
          const dDist = distance2D(curX, curY, door.x, door.y);
          if (dDist < 0.65 && Math.abs(curZ - door.z) < 1.5) {
            return false; // Obstructed by closed security door
          }
        }
      }

      // Check crates
      for (const crate of room.crates) {
        const halfW = (crate.w || 1.0) * 0.5;
        const halfD = (crate.d || 1.0) * 0.5;
        if (
          curX >= crate.x - halfW &&
          curX <= crate.x + halfW &&
          curY >= crate.y - halfD &&
          curY <= crate.y + halfD &&
          curZ >= crate.z &&
          curZ <= crate.z + (crate.h || 1.0)
        ) {
          return false; // Obstructed by crate
        }
      }
    }

    return true;
  }

  /**
   * Evaluates if an enemy can currently perceive the player in its vision cone.
   */
  public static canSeePlayer(
    drone: PatrolDrone,
    player: PlayerState,
    room: RoomDefinition
  ): { canSee: boolean; distance: number; angleDiff: number } {
    const dist = distance2D(drone.x, drone.y, player.x, player.y);
    const range = drone.visionRange || 5.0;

    // Height range: Sentinel can see down further
    const maxZDiff = drone.type === 'sentinel' ? 3.2 : 1.8;
    if (dist > range || Math.abs(drone.z - player.z) > maxZDiff) {
      return { canSee: false, distance: dist, angleDiff: Math.PI };
    }

    // Direction angle check
    const targetAngle = Math.atan2(player.y - drone.y, player.x - drone.x);
    const facingAngle = drone.visionAngle ?? this.directionToAngle(drone.direction || 'S');

    let angleDiff = targetAngle - facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const halfFov = (drone.visionFov || Math.PI * 0.4) * 0.5;
    if (Math.abs(angleDiff) > halfFov) {
      return { canSee: false, distance: dist, angleDiff };
    }

    // Perform obstacle line-of-sight check
    const clearLos = this.hasLineOfSight(
      drone.x,
      drone.y,
      drone.z + 0.3,
      player.x,
      player.y,
      player.z + 0.4,
      room
    );

    return { canSee: clearLos, distance: dist, angleDiff };
  }

  /**
   * Main Enemy AI Update routine for a single enemy.
   */
  public static updateEnemy(
    drone: PatrolDrone,
    dt: number,
    player: PlayerState,
    currentRoom: RoomDefinition,
    allRooms: Record<string, RoomDefinition>,
    projectiles: EnemyProjectile[],
    callbacks: EnemyAICallbacks
  ) {
    this.initEnemy(drone, currentRoom.id);

    // Update attack cooldowns
    if (drone.attackCooldown && drone.attackCooldown > 0) {
      drone.attackCooldown -= dt;
    }

    // 1. Check Vision Cone & Line-of-sight to player
    const vision = this.canSeePlayer(drone, player, currentRoom);

    // 2. State Machine Processing
    switch (drone.alertState) {
      case 'patrol':
        this.handleStatePatrol(drone, dt, vision, player, currentRoom, allRooms, callbacks);
        break;

      case 'suspicious':
        this.handleStateSuspicious(drone, dt, vision, player, currentRoom, callbacks);
        break;

      case 'chase':
        this.handleStateChase(drone, dt, vision, player, currentRoom, projectiles, callbacks);
        break;

      case 'search':
        this.handleStateSearch(drone, dt, vision, player, currentRoom, callbacks);
        break;

      case 'return':
        this.handleStateReturn(drone, dt, vision, player, currentRoom, callbacks);
        break;
    }

    // 3. Elevator Navigation & Synchronization
    this.updateElevatorUsage(drone, dt, currentRoom);

    // 4. Contact Damage (Melee collision check)
    if (drone.type !== 'turret') {
      const distToPlayer = distance2D(drone.x, drone.y, player.x, player.y);
      const isVerticallyAligned = Math.abs(drone.z - player.z) < (drone.type === 'sentinel' ? 1.5 : 0.9);
      if (distToPlayer < 0.75 && isVerticallyAligned) {
        callbacks.damagePlayer(drone.damage, drone.x, drone.y);
        if (drone.type === 'security') {
          callbacks.spawnSparks(drone.x, drone.y, drone.z);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // STATE HANDLERS
  // --------------------------------------------------------------------------

  private static handleStatePatrol(
    drone: PatrolDrone,
    dt: number,
    vision: { canSee: boolean; distance: number },
    player: PlayerState,
    currentRoom: RoomDefinition,
    allRooms: Record<string, RoomDefinition>,
    callbacks: EnemyAICallbacks
  ) {
    drone.alertLevel = 0;
    drone.isChasing = false;

    // Vision trigger
    if (vision.canSee) {
      drone.alertState = 'suspicious';
      drone.alertTimer = 0;
      sound.playSuspiciousPing();
      return;
    }

    // Turret Idle Sweeping Behavior
    if (drone.type === 'turret') {
      const sweepArc = drone.turretSweepArc || Math.PI * 0.8;
      const base = drone.baseAngle ?? 0;
      drone.sweepAngle = (drone.sweepAngle ?? 0) + (drone.sweepDirection ?? 1) * dt * 0.8;
      if (Math.abs(drone.sweepAngle) > sweepArc * 0.5) {
        drone.sweepDirection = -(drone.sweepDirection ?? 1);
        drone.sweepAngle = Math.sign(drone.sweepAngle) * sweepArc * 0.5;
      }
      drone.visionAngle = base + drone.sweepAngle;
      drone.direction = this.angleToDirection(drone.visionAngle);
      return;
    }

    // Mobile Units Waypoint Patrol
    if (!drone.waypoints || drone.waypoints.length === 0) return;

    const targetWp = drone.waypoints[drone.currentWaypointIndex];
    if (!targetWp) return;

    // Check Multi-room patrol waypoint
    if (targetWp.roomId && targetWp.roomId !== currentRoom.id && allRooms[targetWp.roomId]) {
      // Drone is at a doorway leading to another room
      const distToExit = distance2D(drone.x, drone.y, targetWp.x, targetWp.y);
      if (distToExit < 0.3) {
        this.transitionDroneToRoom(drone, currentRoom, allRooms[targetWp.roomId], targetWp, callbacks);
        return;
      }
    }

    const dx = targetWp.x - drone.x;
    const dy = targetWp.y - drone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.15) {
      // Reached waypoint: advance
      drone.currentWaypointIndex = (drone.currentWaypointIndex + 1) % drone.waypoints.length;
    } else {
      const moveDist = drone.speed * dt;
      drone.x += (dx / dist) * moveDist;
      drone.y += (dy / dist) * moveDist;
      drone.visionAngle = Math.atan2(dy, dx);
      drone.direction = this.angleToDirection(drone.visionAngle);
    }
  }

  private static handleStateSuspicious(
    drone: PatrolDrone,
    dt: number,
    vision: { canSee: boolean; distance: number },
    player: PlayerState,
    currentRoom: RoomDefinition,
    callbacks: EnemyAICallbacks
  ) {
    if (vision.canSee) {
      // Focus vision directly onto player
      const dx = player.x - drone.x;
      const dy = player.y - drone.y;
      drone.visionAngle = Math.atan2(dy, dx);
      drone.direction = this.angleToDirection(drone.visionAngle);

      // Rapidly raise alert level (faster if closer)
      const proximityFactor = Math.max(1.0, 5.0 / Math.max(1.0, vision.distance));
      drone.alertLevel = Math.min(1.0, (drone.alertLevel ?? 0) + dt * 2.2 * proximityFactor);

      if (drone.alertLevel >= 1.0) {
        // Switch to full combat alert / chase!
        drone.alertState = 'chase';
        drone.isChasing = true;
        drone.lastKnownPos = { x: player.x, y: player.y, z: player.z };

        if (drone.type === 'security') {
          sound.playSecuritySiren();
          callbacks.triggerNotify(`SECURITY DRONE: Alarm broadcast! Intercepting intruder!`, 'warn');
          // Alert peer drones in the same sector
          this.broadcastAlertToPeers(drone, currentRoom, player);
        } else if (drone.type === 'turret') {
          sound.playTurretCharge();
          callbacks.triggerNotify(`DEFENSE TURRET: Target locked! Charging weapon battery!`, 'warn');
        } else {
          sound.playGuardianAlert();
          callbacks.triggerNotify(`${drone.type.toUpperCase()} DRONE: Intruder spotted! Engaging pursuit!`, 'warn');
        }
      }
    } else {
      // Lost sight: alert decays
      drone.alertLevel = Math.max(0, (drone.alertLevel ?? 0) - dt * 1.5);
      if (drone.alertLevel <= 0) {
        drone.alertState = 'patrol';
      }
    }
  }

  private static handleStateChase(
    drone: PatrolDrone,
    dt: number,
    vision: { canSee: boolean; distance: number },
    player: PlayerState,
    currentRoom: RoomDefinition,
    projectiles: EnemyProjectile[],
    callbacks: EnemyAICallbacks
  ) {
    drone.isChasing = true;
    drone.alertLevel = 1.0;

    if (vision.canSee) {
      // Update last known target position
      drone.lastKnownPos = { x: player.x, y: player.y, z: player.z };

      const dx = player.x - drone.x;
      const dy = player.y - drone.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      drone.visionAngle = Math.atan2(dy, dx);
      drone.direction = this.angleToDirection(drone.visionAngle);

      // Behavior per enemy type
      if (drone.type === 'turret') {
        // Turret aims and discharges laser bolts
        this.handleTurretAttack(drone, dt, player, projectiles, callbacks);
      } else if (drone.type === 'sentinel') {
        // Sentinel maintains hover altitude, pursues and fires plasma bursts
        const speed = drone.chaseSpeed || 2.7;
        // Keep slight offset distance when firing
        if (dist > 1.8) {
          drone.x += (dx / dist) * speed * dt;
          drone.y += (dy / dist) * speed * dt;
        }
        this.handleSentinelAttack(drone, dt, player, projectiles, callbacks);
      } else {
        // Patrol & Security drones sprint directly towards player
        const speed = drone.chaseSpeed || 3.2;
        drone.x += (dx / dist) * speed * dt;
        drone.y += (dy / dist) * speed * dt;
      }
    } else {
      // Target broke line of sight! Enter search behavior
      drone.alertState = 'search';
      drone.searchTimer = drone.searchDuration || 3.5;
      drone.sweepDirection = 1;
      drone.sweepAngle = 0;
      sound.playDroneSearch();
      callbacks.triggerNotify(`${drone.type.toUpperCase()}: Visual lost. Investigating last known coordinates.`, 'info');
    }
  }

  private static handleStateSearch(
    drone: PatrolDrone,
    dt: number,
    vision: { canSee: boolean },
    player: PlayerState,
    currentRoom: RoomDefinition,
    callbacks: EnemyAICallbacks
  ) {
    // If player walks back into vision cone during search, re-engage immediately!
    if (vision.canSee) {
      drone.alertState = 'chase';
      drone.isChasing = true;
      drone.lastKnownPos = { x: player.x, y: player.y, z: player.z };
      sound.playGuardianAlert();
      return;
    }

    // Move to last known position first
    if (drone.lastKnownPos && drone.type !== 'turret') {
      const dx = drone.lastKnownPos.x - drone.x;
      const dy = drone.lastKnownPos.y - drone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.4) {
        const speed = (drone.speed || 1.8) * 1.2;
        drone.x += (dx / dist) * speed * dt;
        drone.y += (dy / dist) * speed * dt;
        drone.visionAngle = Math.atan2(dy, dx);
        drone.direction = this.angleToDirection(drone.visionAngle);
        return;
      }
    }

    // At last known position: sweep vision cone back and forth searching
    drone.searchTimer = (drone.searchTimer ?? 3.5) - dt;
    drone.sweepAngle = (drone.sweepAngle ?? 0) + (drone.sweepDirection ?? 1) * dt * 2.2;

    if (Math.abs(drone.sweepAngle) > Math.PI * 0.6) {
      drone.sweepDirection = -(drone.sweepDirection ?? 1);
    }

    const baseAngle = drone.lastKnownPos
      ? Math.atan2(drone.lastKnownPos.y - drone.y, drone.lastKnownPos.x - drone.x)
      : drone.visionAngle ?? 0;
    drone.visionAngle = baseAngle + drone.sweepAngle;
    drone.direction = this.angleToDirection(drone.visionAngle);

    // Search timeout: return to patrol
    if ((drone.searchTimer ?? 0) <= 0) {
      drone.alertState = 'return';
      drone.isChasing = false;
      callbacks.triggerNotify(`${drone.type.toUpperCase()}: Sector clear. Resuming patrol route.`, 'info');
    }
  }

  private static handleStateReturn(
    drone: PatrolDrone,
    dt: number,
    vision: { canSee: boolean },
    player: PlayerState,
    currentRoom: RoomDefinition,
    callbacks: EnemyAICallbacks
  ) {
    if (vision.canSee) {
      drone.alertState = 'suspicious';
      return;
    }

    if (drone.type === 'turret') {
      drone.alertState = 'patrol';
      return;
    }

    // Path back towards nearest waypoint or origin
    let targetX = drone.originX ?? drone.x;
    let targetY = drone.originY ?? drone.y;

    if (drone.waypoints && drone.waypoints.length > 0) {
      const wp = drone.waypoints[drone.currentWaypointIndex];
      if (wp) {
        targetX = wp.x;
        targetY = wp.y;
      }
    }

    const dx = targetX - drone.x;
    const dy = targetY - drone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.25) {
      // Re-anchored to patrol route!
      drone.alertState = 'patrol';
      drone.alertLevel = 0;
    } else {
      const speed = drone.speed * 0.95;
      drone.x += (dx / dist) * speed * dt;
      drone.y += (dy / dist) * speed * dt;
      drone.visionAngle = Math.atan2(dy, dx);
      drone.direction = this.angleToDirection(drone.visionAngle);
    }
  }

  // --------------------------------------------------------------------------
  // ELEVATOR USAGE
  // --------------------------------------------------------------------------

  private static updateElevatorUsage(drone: PatrolDrone, dt: number, currentRoom: RoomDefinition) {
    if (!currentRoom.movingElevators || currentRoom.movingElevators.length === 0) return;

    for (const elev of currentRoom.movingElevators) {
      const halfW = (elev.width || 1.2) * 0.6;
      const halfD = (elev.depth || 1.2) * 0.6;

      const isOnPlatform =
        Math.abs(drone.x - elev.x) <= halfW &&
        Math.abs(drone.y - elev.y) <= halfD;

      if (isOnPlatform) {
        // Drone is on top of moving elevator: ride it smoothly!
        drone.ridingElevatorId = elev.id;
        const hoverOffset = drone.type === 'sentinel' ? 1.6 : 0.45;
        // Vertically bind to elevator height
        drone.z = elev.z + hoverOffset;
        return;
      }
    }

    drone.ridingElevatorId = null;
  }

  // --------------------------------------------------------------------------
  // TURRET & SENTINEL ATTACK WEAPON SYSTEMS
  // --------------------------------------------------------------------------

  private static handleTurretAttack(
    drone: PatrolDrone,
    dt: number,
    player: PlayerState,
    projectiles: EnemyProjectile[],
    callbacks: EnemyAICallbacks
  ) {
    if ((drone.attackCooldown ?? 0) <= 0) {
      drone.isCharging = true;
      drone.chargeTimer = (drone.chargeTimer ?? 0) + dt;

      if (drone.chargeTimer >= 0.35) {
        // Fire high-energy laser projectile!
        drone.chargeTimer = 0;
        drone.isCharging = false;
        drone.attackCooldown = drone.attackInterval || 1.3;

        const dx = player.x - drone.x;
        const dy = player.y - drone.y;
        const dz = (player.z + 0.4) - (drone.z + 0.6);
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const speed = 7.5;

        projectiles.push({
          id: `proj_${Date.now()}_${Math.random()}`,
          x: drone.x,
          y: drone.y,
          z: drone.z + 0.6,
          vx: (dx / len) * speed,
          vy: (dy / len) * speed,
          vz: (dz / len) * speed,
          damage: drone.damage || 20,
          color: '#ef4444',
          glowColor: 'rgba(239, 68, 68, 0.7)',
          radius: 0.18,
          life: 2.2,
          maxLife: 2.2,
          sourceEnemyId: drone.id,
        });

        sound.playLaserFire();
        callbacks.spawnSparks(drone.x, drone.y, drone.z + 0.6);
      }
    }
  }

  private static handleSentinelAttack(
    drone: PatrolDrone,
    dt: number,
    player: PlayerState,
    projectiles: EnemyProjectile[],
    callbacks: EnemyAICallbacks
  ) {
    if ((drone.attackCooldown ?? 0) <= 0) {
      drone.attackCooldown = drone.attackInterval || 2.0;

      const dx = player.x - drone.x;
      const dy = player.y - drone.y;
      const dz = player.z - drone.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const speed = 5.5;

      projectiles.push({
        id: `sent_proj_${Date.now()}_${Math.random()}`,
        x: drone.x,
        y: drone.y,
        z: drone.z,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        vz: (dz / len) * speed,
        damage: drone.damage || 18,
        color: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.8)',
        radius: 0.22,
        life: 2.5,
        maxLife: 2.5,
        sourceEnemyId: drone.id,
      });

      sound.playLaserFire();
      callbacks.spawnSparks(drone.x, drone.y, drone.z);
    }
  }

  // --------------------------------------------------------------------------
  // MULTI-ROOM TRANSITIONS & PEER ALERT BROADCASTING
  // --------------------------------------------------------------------------

  private static transitionDroneToRoom(
    drone: PatrolDrone,
    fromRoom: RoomDefinition,
    toRoom: RoomDefinition,
    targetWp: { x: number; y: number; roomId?: string },
    callbacks: EnemyAICallbacks
  ) {
    // Remove from current room
    const idx = fromRoom.drones.indexOf(drone);
    if (idx !== -1) {
      fromRoom.drones.splice(idx, 1);
    }

    // Reposition into destination room
    drone.currentRoomId = toRoom.id;
    drone.x = targetWp.x;
    drone.y = targetWp.y;
    drone.currentWaypointIndex = (drone.currentWaypointIndex + 1) % drone.waypoints.length;

    // Add to target room's active roster
    toRoom.drones.push(drone);
    callbacks.onEnemyRoomTransition?.(drone, fromRoom.id, toRoom.id);
  }

  private static broadcastAlertToPeers(
    originDrone: PatrolDrone,
    currentRoom: RoomDefinition,
    player: PlayerState
  ) {
    for (const peer of currentRoom.drones) {
      if (peer.id === originDrone.id) continue;
      const dist = distance2D(originDrone.x, originDrone.y, peer.x, peer.y);
      if (dist <= 6.5 && peer.alertState !== 'chase') {
        peer.alertState = 'chase';
        peer.alertLevel = 1.0;
        peer.isChasing = true;
        peer.lastKnownPos = { x: player.x, y: player.y, z: player.z };
      }
    }
  }

  // --------------------------------------------------------------------------
  // PROJECTILE PHYSICS & COLLISION
  // --------------------------------------------------------------------------

  public static updateProjectiles(
    projectiles: EnemyProjectile[],
    dt: number,
    player: PlayerState,
    room: RoomDefinition,
    callbacks: EnemyAICallbacks
  ) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Hit player
      const distToPlayer = distance2D(p.x, p.y, player.x, player.y);
      if (distToPlayer < 0.65 && Math.abs(p.z - player.z) < 1.0) {
        callbacks.damagePlayer(p.damage, p.x, p.y);
        callbacks.spawnSparks(p.x, p.y, p.z);
        projectiles.splice(i, 1);
        continue;
      }

      // Check wall collision
      const gx = Math.floor(p.x);
      const gy = Math.floor(p.y);
      if (gx >= 0 && gx < room.width && gy >= 0 && gy < room.depth) {
        const tile = room.floorGrid[gx]?.[gy];
        if (tile && tile.type === 'wall' && p.z < (tile.elevation || 2.0)) {
          callbacks.spawnDust(p.x, p.y, p.z);
          projectiles.splice(i, 1);
          continue;
        }
      }

      // Check crate collision
      let hitCrate = false;
      for (const crate of room.crates) {
        const halfW = (crate.w || 1.0) * 0.5;
        const halfD = (crate.d || 1.0) * 0.5;
        if (
          p.x >= crate.x - halfW &&
          p.x <= crate.x + halfW &&
          p.y >= crate.y - halfD &&
          p.y <= crate.y + halfD &&
          p.z >= crate.z &&
          p.z <= crate.z + (crate.h || 1.0)
        ) {
          callbacks.spawnDust(p.x, p.y, p.z);
          projectiles.splice(i, 1);
          hitCrate = true;
          break;
        }
      }
      if (hitCrate) continue;
    }
  }

  // --------------------------------------------------------------------------
  // HELPER GEOMETRY & ANGLES
  // --------------------------------------------------------------------------

  public static directionToAngle(dir: Direction): number {
    switch (dir) {
      case 'E': return 0;
      case 'S': return Math.PI * 0.5;
      case 'W': return Math.PI;
      case 'N': return -Math.PI * 0.5;
      default: return Math.PI * 0.5;
    }
  }

  public static angleToDirection(angle: number): Direction {
    // Normalize to [-PI, PI]
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;

    if (a >= -Math.PI * 0.25 && a < Math.PI * 0.25) return 'E';
    if (a >= Math.PI * 0.25 && a < Math.PI * 0.75) return 'S';
    if (a >= -Math.PI * 0.75 && a < -Math.PI * 0.25) return 'N';
    return 'W';
  }
}
