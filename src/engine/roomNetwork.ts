import roomsJson from '../data/roomsNetwork.json';
import { buildRoomGrid } from '../data/gridBuilder';
import { EnemyAISystem } from './enemyAI';
import {
  Direction,
  DoorEntity,
  PlayerState,
  RoomCategory,
  RoomDefinition,
  RoomExits,
  TransitionAnimationState,
  Vector3,
} from '../types/game';

interface RawJsonRoom {
  id: string;
  name: string;
  code: string;
  category: RoomCategory;
  categoryLabel: string;
  quadrant: string;
  description: string;
  gridCoords: { col: number; row: number };
  width: number;
  depth: number;
  exits: RoomExits;
  defaultPlayerSpawn: { x: number; y: number; z: number; direction: Direction };
  ambientColor: string;
  accentColor: string;
  elevations?: { [key: string]: number };
  pits?: string[];
  doorOpenings?: { x: number; y: number }[];
  crates: any[];
  switches: any[];
  doors: any[];
  lasers: any[];
  drones: any[];
  items?: any[];
  collectibles?: any[];
  teleporters: any[];
  elevators: any[];
  movingElevators?: any[];
  exitPortal?: any;
}

/**
 * Parses the pure JSON definition of the station network
 * and instantiates complete RoomDefinition objects with 2.5D floor grids.
 */
export function buildRoomsFromJson(): { [roomId: string]: RoomDefinition } {
  const roomsMap: { [roomId: string]: RoomDefinition } = {};
  const jsonRooms = (roomsJson as { rooms: RawJsonRoom[] }).rooms;

  for (const raw of jsonRooms) {
    const floorGrid = buildRoomGrid({
      width: raw.width,
      depth: raw.depth,
      wallHeight: 2,
      elevations: raw.elevations || {},
      pits: raw.pits || [],
      doorOpenings: raw.doorOpenings || [],
    });

    const room: RoomDefinition = {
      id: raw.id,
      name: raw.name,
      code: raw.code,
      category: raw.category,
      categoryLabel: raw.categoryLabel,
      quadrant: raw.quadrant,
      description: raw.description,
      gridCoords: raw.gridCoords,
      width: raw.width,
      depth: raw.depth,
      exits: raw.exits,
      defaultPlayerSpawn: raw.defaultPlayerSpawn,
      floorGrid,
      crates: JSON.parse(JSON.stringify(raw.crates || [])),
      switches: JSON.parse(JSON.stringify(raw.switches || [])),
      doors: JSON.parse(JSON.stringify(raw.doors || [])),
      lasers: JSON.parse(JSON.stringify(raw.lasers || [])),
      drones: (raw.drones || []).map((d: any) =>
        EnemyAISystem.initEnemy(JSON.parse(JSON.stringify(d)), raw.id)
      ),
      items: JSON.parse(JSON.stringify(raw.items || raw.collectibles || [])),
      teleporters: JSON.parse(JSON.stringify(raw.teleporters || [])),
      elevators: JSON.parse(JSON.stringify(raw.elevators || [])),
      movingElevators: JSON.parse(JSON.stringify(raw.movingElevators || [])),
      doorOpenings: raw.doorOpenings || [],
      exitPortal: raw.exitPortal ? JSON.parse(JSON.stringify(raw.exitPortal)) : undefined,
      ambientColor: raw.ambientColor || '#0a101f',
      accentColor: raw.accentColor || '#38bdf8',
    };

    roomsMap[raw.id] = room;
  }

  return roomsMap;
}

/**
 * Complete Room Network Transition and Memory Manager.
 * Handles automatic loading, automatic unloading, player position preservation,
 * directional North/South/East/West boundary transitions, and transition animation states.
 */
export class RoomNetworkManager {
  public roomsState: { [roomId: string]: RoomDefinition } = {};
  public discoveredRooms: Set<string> = new Set(['sector_01']);
  public currentRoomId: string = 'sector_01';

  // Transition animation lifecycle
  public transitionState: TransitionAnimationState = {
    active: false,
    phase: 'idle',
    progress: 0,
  };

  private transitionDuration: number = 0.38; // seconds
  private transitionTimer: number = 0;
  private pendingTransition: {
    targetRoomId: string;
    targetCoords: Vector3;
    direction?: Direction;
    directionLabel?: 'N' | 'S' | 'E' | 'W' | 'teleport' | 'elevator';
  } | null = null;

  constructor() {
    this.roomsState = buildRoomsFromJson();
  }

  /**
   * Automatic Room Loading: retrieves room definition, restores state, and registers discovery.
   */
  public loadRoom(roomId: string): RoomDefinition {
    if (!this.roomsState[roomId]) {
      // Re-instantiate from base JSON if needed
      const all = buildRoomsFromJson();
      if (all[roomId]) {
        this.roomsState[roomId] = all[roomId];
      }
    }

    const room = this.roomsState[roomId];
    this.currentRoomId = roomId;
    this.discoveredRooms.add(roomId);
    return room;
  }

  /**
   * Automatic Room Unloading: snapshots current room objects and caches dynamic state.
   */
  public unloadRoom(currentRoom: RoomDefinition) {
    if (!currentRoom) return;
    // Persist current room state into memory
    this.roomsState[currentRoom.id] = currentRoom;
  }

  /**
   * Evaluates if the player crossed a room boundary (North, South, East, West)
   * or a doorway, and initiates seamless room transition with preserved coordinates.
   */
  public checkCompassExits(
    player: PlayerState,
    currentRoom: RoomDefinition,
    onRestrictedNotice?: (msg: string) => void
  ): boolean {
    if (this.transitionState.active) return false;

    const exits = currentRoom.exits;
    if (!exits) return false;

    // Boundary margins and exit openings
    const MARGIN_EDGE = 0.95;
    const centerX = currentRoom.width / 2;
    const centerY = currentRoom.depth / 2;

    // Helper to check if player is at a designated opening or doorway along a given edge
    const hasOpeningNear = (edge: 'N' | 'S' | 'E' | 'W', pCoord: number): boolean => {
      // 1. Check explicit doorOpenings in room geometry
      const openings = currentRoom.doorOpenings || [];
      const edgeOpenings = openings.filter((o) => {
        if (edge === 'N') return o.y === 0;
        if (edge === 'S') return o.y === currentRoom.depth - 1;
        if (edge === 'W') return o.x === 0;
        if (edge === 'E') return o.x === currentRoom.width - 1;
        return false;
      });
      if (edgeOpenings.length > 0) {
        return edgeOpenings.some((o) => Math.abs((edge === 'N' || edge === 'S' ? o.x : o.y) - pCoord) <= 1.9);
      }

      // 2. Check doors placed on that perimeter edge
      const doors = currentRoom.doors || [];
      const edgeDoors = doors.filter((d) => {
        if (edge === 'N') return d.orientation === 'EW' && d.y <= 1.5;
        if (edge === 'S') return d.orientation === 'EW' && d.y >= currentRoom.depth - 2.5;
        if (edge === 'W') return d.orientation === 'NS' && d.x <= 1.5;
        if (edge === 'E') return d.orientation === 'NS' && d.x >= currentRoom.width - 2.5;
        return false;
      });
      if (edgeDoors.length > 0) {
        return edgeDoors.some((d) => Math.abs((edge === 'N' || edge === 'S' ? d.x : d.y) - pCoord) <= 1.9);
      }

      // 3. Standard fallback: within 2.8 of room center
      return Math.abs(pCoord - (edge === 'N' || edge === 'S' ? centerX : centerY)) <= 2.8;
    };

    const isAtNorthEdge = player.y <= MARGIN_EDGE && hasOpeningNear('N', player.x);
    const isAtSouthEdge = player.y >= currentRoom.depth - MARGIN_EDGE && hasOpeningNear('S', player.x);
    const isAtWestEdge = player.x <= MARGIN_EDGE && hasOpeningNear('W', player.y);
    const isAtEastEdge = player.x >= currentRoom.width - MARGIN_EDGE && hasOpeningNear('E', player.y);

    // 1. NORTH EXIT (moving North)
    if (isAtNorthEdge && exits.north && this.roomsState[exits.north]) {
      const targetRoom = this.roomsState[exits.north];
      const northDoor = currentRoom.doors.find((d) => d.orientation === 'EW' && d.y <= 1.5);
      if (northDoor && !northDoor.isOpen) {
        if (northDoor.requiredKeycard) {
          if (!player.keycards.includes(northDoor.requiredKeycard)) {
            onRestrictedNotice?.(`ACCESS LOCKED: Requires ${northDoor.requiredKeycard} Keycard`);
            player.y = MARGIN_EDGE + 0.35;
            return false;
          } else {
            northDoor.isOpen = true;
          }
        } else if (northDoor.requiredSwitchIds && northDoor.requiredSwitchIds.length > 0) {
          onRestrictedNotice?.(`BULKHEAD LOCKED: Controlled by auxiliary switches.`);
          player.y = MARGIN_EDGE + 0.35;
          return false;
        } else {
          onRestrictedNotice?.(`BULKHEAD CLOSED.`);
          player.y = MARGIN_EDGE + 0.35;
          return false;
        }
      }

      const preservedX = Math.max(1.5, Math.min(targetRoom.width - 2.5, player.x));
      const targetY = targetRoom.depth - 2.0;
      const targetElev = targetRoom.floorGrid[Math.floor(preservedX)]?.[Math.floor(targetY)]?.elevation || 0;

      console.log(`[DIAG:TRANSITION] Compass NORTH: ${currentRoom.id} -> ${exits.north} at (${preservedX.toFixed(1)}, ${targetY.toFixed(1)}, ${targetElev.toFixed(1)})`);

      this.startTransition(
        exits.north,
        { x: preservedX, y: targetY, z: targetElev },
        'N',
        'N'
      );
      return true;
    }

    // 2. SOUTH EXIT (moving South)
    if (isAtSouthEdge && exits.south && this.roomsState[exits.south]) {
      const targetRoom = this.roomsState[exits.south];
      const southDoor = currentRoom.doors.find((d) => d.orientation === 'EW' && d.y >= currentRoom.depth - 2.5);
      if (southDoor && !southDoor.isOpen) {
        if (southDoor.requiredKeycard) {
          if (!player.keycards.includes(southDoor.requiredKeycard)) {
            onRestrictedNotice?.(`ACCESS LOCKED: Requires ${southDoor.requiredKeycard} Keycard`);
            player.y = currentRoom.depth - MARGIN_EDGE - 0.35;
            return false;
          } else {
            southDoor.isOpen = true;
          }
        } else if (southDoor.requiredSwitchIds && southDoor.requiredSwitchIds.length > 0) {
          onRestrictedNotice?.(`BULKHEAD LOCKED: Controlled by auxiliary switches.`);
          player.y = currentRoom.depth - MARGIN_EDGE - 0.35;
          return false;
        } else {
          onRestrictedNotice?.(`BULKHEAD CLOSED.`);
          player.y = currentRoom.depth - MARGIN_EDGE - 0.35;
          return false;
        }
      }

      const preservedX = Math.max(1.5, Math.min(targetRoom.width - 2.5, player.x));
      const targetY = 2.0;
      const targetElev = targetRoom.floorGrid[Math.floor(preservedX)]?.[Math.floor(targetY)]?.elevation || 0;

      console.log(`[DIAG:TRANSITION] Compass SOUTH: ${currentRoom.id} -> ${exits.south} at (${preservedX.toFixed(1)}, ${targetY.toFixed(1)}, ${targetElev.toFixed(1)})`);

      this.startTransition(
        exits.south,
        { x: preservedX, y: targetY, z: targetElev },
        'S',
        'S'
      );
      return true;
    }

    // 3. WEST EXIT (moving West)
    if (isAtWestEdge && exits.west && this.roomsState[exits.west]) {
      const targetRoom = this.roomsState[exits.west];
      const westDoor = currentRoom.doors.find((d) => d.orientation === 'NS' && d.x <= 1.5);
      if (westDoor && !westDoor.isOpen) {
        if (westDoor.requiredKeycard) {
          if (!player.keycards.includes(westDoor.requiredKeycard)) {
            onRestrictedNotice?.(`ACCESS LOCKED: Requires ${westDoor.requiredKeycard} Keycard`);
            player.x = MARGIN_EDGE + 0.35;
            return false;
          } else {
            westDoor.isOpen = true;
          }
        } else if (westDoor.requiredSwitchIds && westDoor.requiredSwitchIds.length > 0) {
          onRestrictedNotice?.(`BULKHEAD LOCKED: Controlled by auxiliary switches.`);
          player.x = MARGIN_EDGE + 0.35;
          return false;
        } else {
          onRestrictedNotice?.(`BULKHEAD CLOSED.`);
          player.x = MARGIN_EDGE + 0.35;
          return false;
        }
      }

      const targetX = targetRoom.width - 2.0;
      const preservedY = Math.max(1.5, Math.min(targetRoom.depth - 2.5, player.y));
      const targetElev = targetRoom.floorGrid[Math.floor(targetX)]?.[Math.floor(preservedY)]?.elevation || 0;

      console.log(`[DIAG:TRANSITION] Compass WEST: ${currentRoom.id} -> ${exits.west} at (${targetX.toFixed(1)}, ${preservedY.toFixed(1)}, ${targetElev.toFixed(1)})`);

      this.startTransition(
        exits.west,
        { x: targetX, y: preservedY, z: targetElev },
        'W',
        'W'
      );
      return true;
    }

    // 4. EAST EXIT (moving East)
    if (isAtEastEdge && exits.east && this.roomsState[exits.east]) {
      const targetRoom = this.roomsState[exits.east];
      const eastDoor = currentRoom.doors.find((d) => d.orientation === 'NS' && d.x >= currentRoom.width - 2.5);
      if (eastDoor && !eastDoor.isOpen) {
        if (eastDoor.requiredKeycard) {
          if (!player.keycards.includes(eastDoor.requiredKeycard)) {
            onRestrictedNotice?.(`ACCESS LOCKED: Requires ${eastDoor.requiredKeycard} Keycard`);
            player.x = currentRoom.width - MARGIN_EDGE - 0.35;
            return false;
          } else {
            eastDoor.isOpen = true;
          }
        } else if (eastDoor.requiredSwitchIds && eastDoor.requiredSwitchIds.length > 0) {
          onRestrictedNotice?.(`BULKHEAD LOCKED: Controlled by auxiliary switches.`);
          player.x = currentRoom.width - MARGIN_EDGE - 0.35;
          return false;
        } else {
          onRestrictedNotice?.(`BULKHEAD CLOSED.`);
          player.x = currentRoom.width - MARGIN_EDGE - 0.35;
          return false;
        }
      }

      // Check special Sector 20 Nexus Fragment requirement
      if (exits.east === 'sector_20') {
        const fragCount = player.nexusFragments?.length || 0;
        if (fragCount < 5) {
          onRestrictedNotice?.(`OVERMIND GATE LOCKED: All 5 Nexus Fragments Required (${fragCount}/5)`);
          player.x = currentRoom.width - MARGIN_EDGE - 0.35;
          return false;
        }
      }

      const targetX = 2.0;
      const preservedY = Math.max(1.5, Math.min(targetRoom.depth - 2.5, player.y));
      const targetElev = targetRoom.floorGrid[Math.floor(targetX)]?.[Math.floor(preservedY)]?.elevation || 0;

      console.log(`[DIAG:TRANSITION] Compass EAST: ${currentRoom.id} -> ${exits.east} at (${targetX.toFixed(1)}, ${preservedY.toFixed(1)}, ${targetElev.toFixed(1)})`);

      this.startTransition(
        exits.east,
        { x: targetX, y: preservedY, z: targetElev },
        'E',
        'E'
      );
      return true;
    }

    return false;
  }

  /**
   * Triggers an animated room transition with directional effect.
   */
  public startTransition(
    targetRoomId: string,
    targetCoords: Vector3,
    direction?: Direction,
    directionLabel: 'N' | 'S' | 'E' | 'W' | 'teleport' | 'elevator' = 'E'
  ) {
    const targetRoom = this.roomsState[targetRoomId];
    if (!targetRoom) return;

    this.pendingTransition = {
      targetRoomId,
      targetCoords,
      direction,
      directionLabel,
    };

    this.transitionTimer = 0;
    this.transitionState = {
      active: true,
      phase: 'out',
      progress: 0,
      direction: directionLabel,
      targetRoomName: targetRoom.name,
      targetRoomCode: targetRoom.code,
      targetCategory: targetRoom.category,
    };
  }

  /**
   * Advances the room transition animation and performs room swap at mid-point.
   */
  public updateTransition(
    dt: number,
    onPerformSwap: (targetRoom: RoomDefinition, coords: Vector3, direction?: Direction) => void
  ) {
    if (!this.transitionState.active || !this.pendingTransition) return;

    this.transitionTimer += dt;
    const halfTime = this.transitionDuration / 2;

    if (this.transitionTimer < halfTime) {
      // Phase 1: Wiping / Fading Out
      this.transitionState.phase = 'out';
      this.transitionState.progress = Math.min(1, this.transitionTimer / halfTime);
    } else {
      // Phase 2: Ensure room swap is executed at or beyond halfTime
      if (this.transitionState.phase === 'out') {
        const targetRoom = this.loadRoom(this.pendingTransition.targetRoomId);
        onPerformSwap(
          targetRoom,
          this.pendingTransition.targetCoords,
          this.pendingTransition.direction
        );
        this.transitionState.phase = 'in';
      }

      if (this.transitionTimer < this.transitionDuration) {
        this.transitionState.progress = Math.min(1, (this.transitionTimer - halfTime) / halfTime);
      } else {
        // Transition Complete
        this.transitionState.active = false;
        this.transitionState.phase = 'idle';
        this.transitionState.progress = 0;
        this.pendingTransition = null;
      }
    }
  }

  /**
   * Reset the network state to Sector 01.
   */
  public resetNetwork() {
    this.roomsState = buildRoomsFromJson();
    this.discoveredRooms = new Set(['sector_01']);
    this.currentRoomId = 'sector_01';
    this.transitionState = { active: false, phase: 'idle', progress: 0 };
    this.pendingTransition = null;
  }
}

export const roomNetwork = new RoomNetworkManager();
