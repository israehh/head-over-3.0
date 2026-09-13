export interface Vector3 {
  x: number; // grid x
  y: number; // grid y
  z: number; // elevation / height
}

export interface BoundingBox3D {
  x: number;
  y: number;
  z: number;
  w: number; // width along x
  d: number; // depth along y
  h: number; // height along z
}

export type Direction = 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'N';

export type RoomCategory = 'tutorial' | 'puzzle' | 'storage' | 'energy' | 'security' | 'vertical';

export interface RoomExits {
  north?: string | null;
  south?: string | null;
  east?: string | null;
  west?: string | null;
}

export interface RoomGridCoords {
  col: number;
  row: number;
}

export interface TransitionAnimationState {
  active: boolean;
  phase: 'idle' | 'out' | 'in';
  progress: number;
  direction?: 'N' | 'S' | 'E' | 'W' | 'teleport' | 'elevator';
  targetRoomName?: string;
  targetRoomCode?: string;
  targetCategory?: RoomCategory;
}

export type KeycardType = 'BLUE' | 'RED' | 'GREEN' | 'ALPHA' | 'BETA';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  direction: Direction;
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  keycards: string[]; // e.g. 'BLUE', 'RED', 'GREEN', 'ALPHA', 'BETA'
  energyCells: number;
  nexusFragments: number[]; // e.g. [1, 2, 3, 4, 5]
  walkFrame: number;
  invulnerableTimer: number;
  fallStartZ?: number;
  lastSafeX?: number;
  lastSafeY?: number;
  lastSafeZ?: number;
}

export interface TileBlock {
  type: 'floor' | 'wall' | 'elevated' | 'hazard' | 'pit' | 'glass';
  elevation: number;
  colorVariant?: number;
  decor?: string;
}

export interface CrateEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  isMoving: boolean;
  targetX?: number;
  targetY?: number;
  color?: string;
  vz?: number;
  isFalling?: boolean;
}

export interface SwitchEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'pressure' | 'toggle' | 'terminal';
  isActivated: boolean;
  targetDoorId?: string;
  targetLaserId?: string;
  targetElevatorId?: string;
  label?: string;
  puzzleTag?: string;
}

export interface DoorEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  orientation: 'EW' | 'NS';
  isOpen: boolean;
  requiredKeycard?: string; // 'ALPHA' | 'BETA' | 'BLUE' | 'RED' | 'GREEN'
  consumeKeycard?: boolean; // When true, keycard is spent upon single-use opening
  requiredSwitchIds?: string[]; // Multiple switches required (e.g. dual pressure plates)
  leadsToRoom?: string;
  spawnCoords?: { x: number; y: number; z: number };
}

export interface LaserBarrier {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  z: number;
  isActive: boolean;
  switchId?: string;
}

export interface PatrolDrone {
  id: string;
  x: number;
  y: number;
  z: number;
  waypoints: { x: number; y: number }[];
  currentWaypointIndex: number;
  speed: number;
  direction: Direction;
  damage: number;
  bobOffset: number;
  type?: 'patrol' | 'guardian';
  detectionRadius?: number;
  isChasing?: boolean;
  chaseSpeed?: number;
  originX?: number;
  originY?: number;
}

export interface ItemCollectible {
  id: string;
  x: number;
  y: number;
  z: number;
  type:
    | 'keycard_blue'
    | 'keycard_red'
    | 'keycard_green'
    | 'keycard_alpha'
    | 'keycard_beta'
    | 'energy_cell'
    | 'medkit'
    | 'nexus_fragment';
  isCollected: boolean;
  name: string;
  description: string;
  fragmentId?: number; // 1 to 5
}

export interface ElevatorPad {
  id: string;
  x: number;
  y: number;
  z: number;
  targetRoomId: string;
  targetX: number;
  targetY: number;
  targetZ: number;
  label?: string;
  isActive?: boolean;
  requiredSwitchId?: string;
}

export interface MovingElevator {
  id: string;
  x: number;
  y: number;
  z: number;
  minZ: number;
  maxZ: number;
  speed: number;
  direction: 1 | -1;
  width?: number; // default 1.2
  depth?: number; // default 1.2
  isMoving?: boolean;
  pauseTimer?: number;
  pauseDuration?: number; // seconds to pause at top/bottom/deck
  requiredSwitchId?: string;
  floorHeights?: number[]; // Multi-deck tower stops e.g. [0, 2, 4, 6]
  currentFloorIndex?: number;
  label?: string;
}

export interface TeleporterPad {
  id: string;
  x: number;
  y: number;
  z: number;
  targetRoomId: string;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: string;
  label?: string;
}

export interface ExitPortal {
  id: string;
  x: number;
  y: number;
  z: number;
  isActive: boolean;
  requiredEnergyCells: number;
  requiredFragments?: number;
}

export interface RoomDefinition {
  id: string;
  name: string;
  code: string;
  category?: RoomCategory;
  categoryLabel?: string;
  exits?: RoomExits;
  gridCoords?: RoomGridCoords;
  quadrant?: string; // 'Alpha (Docking)', 'Beta (Engineering)', 'Gamma (Quantum)', 'Delta (Security)', 'Omega (Nexus Core)'
  description: string;
  width: number; // grid columns
  depth: number; // grid rows
  defaultPlayerSpawn: { x: number; y: number; z: number; direction: Direction };
  floorGrid: TileBlock[][];
  crates: CrateEntity[];
  switches: SwitchEntity[];
  doors: DoorEntity[];
  lasers: LaserBarrier[];
  drones: PatrolDrone[];
  items: ItemCollectible[];
  teleporters: TeleporterPad[];
  elevators?: ElevatorPad[];
  movingElevators?: MovingElevator[];
  exitPortal?: ExitPortal;
  ambientColor: string;
  accentColor: string;
}

export interface SaveStateData {
  version: string;
  timestamp: number;
  roomId: string;
  player: PlayerState;
  roomsState: { [roomId: string]: RoomDefinition };
  visitedRooms?: string[];
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  controlMode: 'isometric' | 'screen'; // whether arrow UP goes North-East or Screen-Up
  crtFilter: boolean;
  showCoordinates: boolean;
}

export interface Particle {
  x: number;
  y: number;
  screenX?: number;
  screenY?: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
