import { RoomDefinition } from '../types/game';
import { buildRoomGrid } from './gridBuilder';

// ----------------------------------------------------
// SECTOR 09: QUANTUM RELAY A
// ----------------------------------------------------
const s09Grid = buildRoomGrid({
  width: 10,
  depth: 10,
  wallHeight: 2,
  pits: ['2,4', '2,5', '3,4', '3,5', '6,4', '6,5', '7,4', '7,5'],
  elevations: {
    '4,4': 1,
    '4,5': 1,
    '5,4': 1,
    '5,5': 1,
  },
  doorOpenings: [{ x: 0, y: 5 }],
});

export const SECTOR_09: RoomDefinition = {
  id: 'sector_09',
  name: 'Sector 09: Quantum Relay A',
  code: 'SEC-09',
  quadrant: 'Gamma: Quantum Labs',
  description: 'Sub-space particle transmitter pads connecting isolated platforms across the station.',
  width: 10,
  depth: 10,
  defaultPlayerSpawn: { x: 1.5, y: 5, z: 0, direction: 'E' },
  floorGrid: s09Grid,
  crates: [
    { id: 'c09_1', x: 2, y: 2, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [
    {
      id: 'sw09_term',
      x: 8,
      y: 2,
      z: 0,
      type: 'terminal',
      isActivated: false,
      label: 'Teleport Frequency Tuner',
    },
  ],
  doors: [
    {
      id: 'door09_west',
      x: 0,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_08',
      spawnCoords: { x: 9.5, y: 5, z: 0 },
    },
  ],
  teleporters: [
    {
      id: 'tele09_to_12',
      x: 4.5,
      y: 4.5,
      z: 1,
      targetRoomId: 'sector_12',
      targetX: 2.5,
      targetY: 4.5,
      targetZ: 0,
      color: '#c084fc',
      label: 'Quantum Pad Alpha -> Sector 12',
    },
  ],
  lasers: [],
  drones: [],
  items: [
    {
      id: 'item09_cell',
      x: 8,
      y: 8,
      z: 0.2,
      type: 'energy_cell',
      isCollected: false,
      name: 'Plasma Energy Cell',
      description: 'Stabilizes orbital gravity regulators.',
    },
  ],
  ambientColor: '#120d1c',
  accentColor: '#c084fc',
};

// ----------------------------------------------------
// SECTOR 10: PARTICLE ACCELERATOR
// ----------------------------------------------------
const s10Grid = buildRoomGrid({
  width: 12,
  depth: 10,
  wallHeight: 2,
  elevations: {
    '5,4': 1,
    '6,4': 1,
    '5,5': 1,
    '6,5': 1,
  },
  doorOpenings: [
    { x: 0, y: 5 },
    { x: 11, y: 5 },
  ],
});

export const SECTOR_10: RoomDefinition = {
  id: 'sector_10',
  name: 'Sector 10: Particle Accelerator',
  code: 'SEC-10',
  quadrant: 'Gamma: Quantum Labs',
  description: 'Circular magnetic accelerator track monitored by an aggressive Guardian Drone.',
  width: 12,
  depth: 10,
  defaultPlayerSpawn: { x: 1.5, y: 5, z: 0, direction: 'E' },
  floorGrid: s10Grid,
  crates: [
    { id: 'c10_cover1', x: 4, y: 3, z: 0, w: 1, d: 1, h: 1, isMoving: false },
    { id: 'c10_cover2', x: 7, y: 6, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [
    {
      id: 'sw10_emp',
      x: 5.5,
      y: 4.5,
      z: 1,
      type: 'pressure',
      isActivated: false,
      label: 'EMP Discharge Capacitor',
    },
  ],
  doors: [
    {
      id: 'door10_west',
      x: 0,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_06',
      spawnCoords: { x: 9.5, y: 5, z: 0 },
    },
    {
      id: 'door10_east',
      x: 11,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_14',
      spawnCoords: { x: 1.5, y: 5, z: 0 },
    },
  ],
  lasers: [],
  drones: [
    {
      id: 'guardian10_1',
      x: 8,
      y: 5,
      z: 0.8,
      waypoints: [
        { x: 8, y: 5 },
        { x: 10, y: 2 },
        { x: 10, y: 7 },
      ],
      currentWaypointIndex: 0,
      speed: 1.5,
      chaseSpeed: 2.6,
      direction: 'W',
      damage: 35,
      bobOffset: 0.1,
      type: 'guardian',
      detectionRadius: 5.5,
      isChasing: false,
    },
  ],
  items: [
    {
      id: 'item10_cell',
      x: 9,
      y: 2,
      z: 0.2,
      type: 'energy_cell',
      isCollected: false,
      name: 'Plasma Energy Cell',
      description: 'Stabilizes orbital gravity regulators.',
    },
    {
      id: 'item10_medkit',
      x: 2,
      y: 8,
      z: 0.2,
      type: 'medkit',
      isCollected: false,
      name: 'Emergency Medkit',
      description: 'Restores 40% hull integrity.',
    },
  ],
  teleporters: [],
  ambientColor: '#170e24',
  accentColor: '#c084fc',
};

// ----------------------------------------------------
// SECTOR 11: SUB-ZERO CRYO-LAB
// ----------------------------------------------------
const s11Grid = buildRoomGrid({
  width: 10,
  depth: 10,
  wallHeight: 2,
  elevations: {
    '2,7': 1,
    '3,7': 1,
    '2,8': 2,
    '3,8': 2,
  },
  doorOpenings: [{ x: 9, y: 5 }],
});

export const SECTOR_11: RoomDefinition = {
  id: 'sector_11',
  name: 'Sector 11: Sub-Zero Cryo-Lab',
  code: 'SEC-11',
  quadrant: 'Gamma: Quantum Labs',
  description: 'Deep freeze containment chamber. Assemble crate steps to reach the upper fragment ledge.',
  width: 10,
  depth: 10,
  defaultPlayerSpawn: { x: 2, y: 2, z: 0, direction: 'SE' },
  floorGrid: s11Grid,
  crates: [
    { id: 'c11_step1', x: 5, y: 4, z: 0, w: 1, d: 1, h: 1, isMoving: false },
    { id: 'c11_step2', x: 6, y: 6, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [],
  doors: [
    {
      id: 'door11_east',
      x: 9,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_12',
      spawnCoords: { x: 1.5, y: 5, z: 0 },
    },
  ],
  elevators: [
    {
      id: 'elev11_to_07',
      x: 2,
      y: 2,
      z: 0,
      targetRoomId: 'sector_07',
      targetX: 8,
      targetY: 2,
      targetZ: 0,
      label: 'Cryo-Lift to Sector 07',
    },
  ],
  lasers: [],
  drones: [],
  items: [
    {
      id: 'frag_03',
      x: 2.5,
      y: 7.5,
      z: 2.3,
      type: 'nexus_fragment',
      fragmentId: 3,
      isCollected: false,
      name: 'Nexus Fragment III (Quantum Prism)',
      description: 'Third of the 5 fragmented quantum crystals of the Overmind.',
    },
  ],
  teleporters: [],
  ambientColor: '#0a1720',
  accentColor: '#38bdf8',
};

// ----------------------------------------------------
// SECTOR 12: TELEPORTATION MATRIX
// ----------------------------------------------------
const s12Grid = buildRoomGrid({
  width: 10,
  depth: 10,
  wallHeight: 2,
  elevations: {
    '6,6': 1,
    '7,6': 1,
    '6,7': 1,
    '7,7': 1,
  },
  doorOpenings: [
    { x: 0, y: 5 },
    { x: 5, y: 9 },
  ],
});

export const SECTOR_12: RoomDefinition = {
  id: 'sector_12',
  name: 'Sector 12: Teleportation Matrix',
  code: 'SEC-12',
  quadrant: 'Gamma: Quantum Labs',
  description: 'Dual-frequency teleport hub. Retrieve the Green Security Keycard on the upper dais.',
  width: 10,
  depth: 10,
  defaultPlayerSpawn: { x: 1.5, y: 5, z: 0, direction: 'E' },
  floorGrid: s12Grid,
  crates: [
    { id: 'c12_1', x: 4, y: 4, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [
    {
      id: 'sw12_pad',
      x: 3,
      y: 7,
      z: 0,
      type: 'pressure',
      isActivated: false,
      label: 'Phase Shifter Plate',
    },
  ],
  doors: [
    {
      id: 'door12_west',
      x: 0,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_11',
      spawnCoords: { x: 8, y: 5, z: 0 },
    },
    {
      id: 'door12_south',
      x: 5,
      y: 9,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'EW',
      isOpen: true,
      leadsToRoom: 'sector_16',
      spawnCoords: { x: 5, y: 1.5, z: 0 },
    },
  ],
  teleporters: [
    {
      id: 'tele12_to_09',
      x: 2.5,
      y: 4.5,
      z: 0,
      targetRoomId: 'sector_09',
      targetX: 4.5,
      targetY: 4.5,
      targetZ: 1,
      color: '#c084fc',
      label: 'Quantum Pad Beta -> Sector 09',
    },
  ],
  lasers: [],
  drones: [],
  items: [
    {
      id: 'item12_green_key',
      x: 6.5,
      y: 6.5,
      z: 1.3,
      type: 'keycard_green',
      isCollected: false,
      name: 'Green Security Keycard',
      description: 'Authorizes highest-tier clearance for the Armory and AI Nexus Sanctum.',
    },
  ],
  ambientColor: '#120d1c',
  accentColor: '#10b981',
};
