import {
  CrateEntity,
  DoorEntity,
  ElevatorPad,
  LaserBarrier,
  PlayerState,
  RoomDefinition,
  SwitchEntity,
} from '../types/game';
import { sound } from '../audio/soundEffects';

export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return distance2D(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance2D(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

export class PuzzleSystem {
  /**
   * Evaluates all pressure plates, energy terminals, laser barriers,
   * multi-switch bulkheads, and powered elevators within the active room.
   */
  public static updatePuzzles(
    room: RoomDefinition,
    player: PlayerState,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ) {
    if (!room) return;

    // 1. Evaluate Pressure Plates
    for (const sw of room.switches) {
      if (sw.type === 'pressure') {
        let isPressed = false;

        // Player standing on plate
        if (
          distance2D(player.x, player.y, sw.x, sw.y) < 0.65 &&
          Math.abs(player.z - sw.z) < 0.4
        ) {
          isPressed = true;
        }

        // Crate resting on plate
        if (!isPressed) {
          for (const crate of room.crates) {
            if (
              distance2D(crate.x, crate.y, sw.x, sw.y) < 0.65 &&
              Math.abs(crate.z - sw.z) < 0.5
            ) {
              isPressed = true;
              break;
            }
          }
        }

        if (isPressed !== sw.isActivated) {
          sw.isActivated = isPressed;
          sound.playSwitch();

          if (isPressed) {
            notify?.(
              `PRESSURE RELAY ENGAGED: [${sw.label || 'Auxiliary Switch'}] Weighted`,
              'success'
            );
          }

          this.applySingleSwitchTargets(room, sw, isPressed, notify);
        }
      }
    }

    // 2. Evaluate Multi-Switch Bulkhead Doors (Combination 2)
    this.evaluateMultiSwitchDoors(room, notify);

    // 3. Evaluate Elevator Power Grid (Combination 4)
    this.evaluateElevators(room, notify);
  }

  /**
   * Applies direct target triggers (Lasers, Doors, Elevators) for a specific switch.
   */
  public static applySingleSwitchTargets(
    room: RoomDefinition,
    sw: SwitchEntity,
    isActivated: boolean,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ) {
    // Target Laser Barrier (Combination 1)
    if (sw.targetLaserId) {
      const laser = room.lasers.find((l) => l.id === sw.targetLaserId);
      if (laser) {
        laser.isActive = !isActivated;
        if (isActivated) {
          notify?.(
            `SECURITY GRID OVERRIDE: Laser Barrier Deactivated`,
            'success'
          );
        } else {
          notify?.(`SECURITY ALERT: Laser Barrier Re-energized`, 'warn');
        }
      }
    }

    // Target Door (Direct 1:1 trigger)
    if (sw.targetDoorId) {
      const door = room.doors.find((d) => d.id === sw.targetDoorId);
      if (door && (!door.requiredSwitchIds || door.requiredSwitchIds.length <= 1)) {
        if (door.isOpen !== isActivated) {
          door.isOpen = isActivated;
          sound.playDoor();
          notify?.(
            isActivated
              ? `SECTOR BULKHEAD: Door Unsealed`
              : `SECTOR BULKHEAD: Door Sealed`,
            isActivated ? 'success' : 'warn'
          );
        }
      }
    }

    // Target Elevator (Combination 4)
    if (sw.targetElevatorId && room.elevators) {
      const elev = room.elevators.find((e) => e.id === sw.targetElevatorId);
      if (elev) {
        elev.isActive = isActivated;
        if (isActivated) {
          sound.playElevator();
          notify?.(
            `AUXILIARY POWER ONLINE: ${elev.label || 'Transit Lift'} Energized`,
            'success'
          );
        } else {
          notify?.(
            `POWER OFFLINE: ${elev.label || 'Transit Lift'} Depowered`,
            'warn'
          );
        }
      }
    }
  }

  /**
   * Evaluates doors that require multiple switches (e.g. Dual Pressure Plates).
   */
  public static evaluateMultiSwitchDoors(
    room: RoomDefinition,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ) {
    for (const door of room.doors) {
      if (door.requiredSwitchIds && door.requiredSwitchIds.length > 0) {
        const allActive = door.requiredSwitchIds.every((swId) => {
          const sw = room.switches.find((s) => s.id === swId);
          return sw ? sw.isActivated : false;
        });

        if (door.isOpen !== allActive) {
          door.isOpen = allActive;
          sound.playDoor();
          if (allActive) {
            notify?.(
              `SYNCHRONIZATION HARMONIZED: All ${door.requiredSwitchIds.length} Relays Active! Bulkhead Opened!`,
              'success'
            );
          } else {
            notify?.(
              `BULKHEAD LOCKDOWN: Remote Relay Lost. Door Resealed.`,
              'warn'
            );
          }
        }
      }
    }
  }

  /**
   * Evaluates elevators with dedicated switch requirements.
   */
  public static evaluateElevators(
    room: RoomDefinition,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ) {
    if (!room.elevators) return;
    for (const elev of room.elevators) {
      if (elev.requiredSwitchId) {
        const sw = room.switches.find((s) => s.id === elev.requiredSwitchId);
        const shouldBeActive = sw ? sw.isActivated : false;
        if (elev.isActive !== shouldBeActive) {
          elev.isActive = shouldBeActive;
          if (shouldBeActive) {
            sound.playElevator();
            notify?.(
              `CIRCUIT COMPLETED: ${elev.label || 'Transit Lift'} is Ready`,
              'success'
            );
          }
        }
      }
    }
  }

  /**
   * Handles interaction with toggle or terminal energy switches.
   */
  public static toggleEnergySwitch(
    room: RoomDefinition,
    sw: SwitchEntity,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ) {
    sw.isActivated = !sw.isActivated;
    sound.playSwitch();

    notify?.(
      `${sw.label || 'Energy Terminal'}: ${sw.isActivated ? 'CIRCUIT ONLINE' : 'CIRCUIT OFFLINE'}`,
      sw.isActivated ? 'success' : 'info'
    );

    this.applySingleSwitchTargets(room, sw, sw.isActivated, notify);
    this.evaluateMultiSwitchDoors(room, notify);
    this.evaluateElevators(room, notify);
  }

  /**
   * Verifies if a crate can physically move to the specified grid coordinates.
   */
  public static canCrateMoveTo(
    x: number,
    y: number,
    crate: CrateEntity,
    room: RoomDefinition
  ): boolean {
    // 1. Boundary constraint
    if (x <= 0 || x >= room.width - 1 || y <= 0 || y >= room.depth - 1) {
      return false;
    }

    // 2. Wall tile and height step constraint
    const tile = room.floorGrid[x]?.[y];
    if (!tile || tile.type === 'wall' || tile.elevation > crate.z + 0.15) {
      return false;
    }

    // 3. Collision with other crates
    for (const other of room.crates) {
      if (other.id === crate.id) continue;
      if (
        Math.round(other.x) === x &&
        Math.round(other.y) === y &&
        Math.abs(other.z - crate.z) < 0.5
      ) {
        return false;
      }
    }

    // 4. Closed doors block crates
    for (const door of room.doors) {
      if (!door.isOpen) {
        if (distance2D(x + 0.5, y + 0.5, door.x, door.y) < 0.85) {
          return false;
        }
      }
    }

    // 5. Active laser barriers block crates
    for (const laser of room.lasers) {
      if (laser.isActive) {
        const dist = pointToSegmentDistance(
          x + 0.5,
          y + 0.5,
          laser.startX,
          laser.startY,
          laser.endX,
          laser.endY
        );
        if (dist < 0.65 && Math.abs(crate.z - laser.z) < 0.8) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Keycard Door clearance & optional consumption
   */
  public static handleKeycardDoor(
    door: DoorEntity,
    player: PlayerState,
    notify?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
  ): boolean {
    if (!door.requiredKeycard) return true;

    const hasCard =
      player.keycards.includes(door.requiredKeycard) ||
      (door.requiredKeycard === 'ALPHA' && player.keycards.includes('BLUE')) ||
      (door.requiredKeycard === 'BLUE' && player.keycards.includes('ALPHA'));

    if (hasCard) {
      door.isOpen = true;
      sound.playDoor();

      if (door.consumeKeycard) {
        const idx = player.keycards.indexOf(door.requiredKeycard);
        if (idx !== -1) {
          player.keycards.splice(idx, 1);
        }
        notify?.(
          `BIOMETRIC LOCK: ${door.requiredKeycard} Keycard consumed by cipher chamber`,
          'success'
        );
      } else {
        notify?.(
          `ACCESS GRANTED: ${door.requiredKeycard} Security Clearance Authenticated`,
          'success'
        );
      }
      return true;
    } else {
      notify?.(
        `ACCESS RESTRICTED: Requires ${door.requiredKeycard} Security Keycard`,
        'warn'
      );
      return false;
    }
  }
}
