import { RoomDefinition } from '../types/game';
import { buildRoomGrid } from './gridBuilder';

// ----------------------------------------------------
// SECTOR 17: DATA CONDUITS
// ----------------------------------------------------
const s17Grid = buildRoomGrid({
  width: 10,
  depth: 10,
  wallHeight: 2,
  elevations: {
    '4,4': 1,
    '5,4': 1,
    '4,5': 1,
    '5,5': 1,
  },
  doorOpenings: [{ x: 5, y: 9 }],
});

export const SECTOR_17: RoomDefinition = {
  id: 'sector_17',
  name: 'Sector 17: Data Conduits',
  code: 'SEC-17',
  quadrant: 'Omega: Nexus Apex',
  description: 'Massive optical fiber conduits leading directly to the Overmind Sanctum.',
  width: 10,
  depth: 10,
  defaultPlayerSpawn: { x: 5, y: 8, z: 0, direction: 'N' },
  floorGrid: s17Grid,
  crates: [
    { id: 'c17_1', x: 3, y: 3, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [
    {
      id: 'sw17_term',
      x: 8,
      y: 2,
      z: 0,
      type: 'terminal',
      isActivated: false,
      label: 'Core Uplink Terminal',
    },
  ],
  doors: [
    {
      id: 'door17_south',
      x: 5,
      y: 9,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'EW',
      isOpen: true,
      leadsToRoom: 'sector_13',
      spawnCoords: { x: 5, y: 1.5, z: 0 },
    },
  ],
  elevators: [
    {
      id: 'elev17_to_19',
      x: 4.5,
      y: 4.5,
      z: 1,
      targetRoomId: 'sector_19',
      targetX: 2,
      targetY: 8,
      targetZ: 0,
      label: 'Sanctum High-Speed Lift',
    },
  ],
  lasers: [],
  drones: [],
  items: [
    {
      id: 'item17_cell',
      x: 8,
      y: 8,
      z: 0.2,
      type: 'energy_cell',
      isCollected: false,
      name: 'Plasma Energy Cell',
      description: 'Stabilizes orbital gravity regulators.',
    },
  ],
  teleporters: [],
  ambientColor: '#0c1626',
  accentColor: '#38bdf8',
};

// ----------------------------------------------------
// SECTOR 18: AI PROCESSING VAULT
// ----------------------------------------------------
const s18Grid = buildRoomGrid({
  width: 11,
  depth: 11,
  wallHeight: 2,
  elevations: {
    '5,2': 1,
    '5,3': 1,
    '5,7': 1,
    '5,8': 1,
  },
  doorOpenings: [
    { x: 5, y: 10 },
    { x: 10, y: 5 },
    { x: 0, y: 5 },
  ],
});

export const SECTOR_18: RoomDefinition = {
  id: 'sector_18',
  name: 'Sector 18: AI Processing Vault',
  code: 'SEC-18',
  quadrant: 'Omega: Nexus Apex',
  description: 'Crystalline server towers guarded by an elite Guardian Drone. Retrieve the final Fragment V.',
  width: 11,
  depth: 11,
  defaultPlayerSpawn: { x: 5, y: 9, z: 0, direction: 'N' },
  floorGrid: s18Grid,
  crates: [
    { id: 'c18_cover1', x: 3, y: 5, z: 0, w: 1, d: 1, h: 1, isMoving: false },
    { id: 'c18_cover2', x: 7, y: 5, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [],
  doors: [
    {
      id: 'door18_south',
      x: 5,
      y: 10,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'EW',
      isOpen: true,
      leadsToRoom: 'sector_15',
      spawnCoords: { x: 5, y: 1.5, z: 0 },
    },
    {
      id: 'door18_east',
      x: 10,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_16',
      spawnCoords: { x: 1.5, y: 5, z: 0 },
    },
    {
      id: 'door18_west',
      x: 0,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_19',
      spawnCoords: { x: 8, y: 5, z: 0 },
    },
  ],
  lasers: [],
  drones: [
    {
      id: 'drone18_guardian',
      x: 5,
      y: 5,
      z: 0.8,
      waypoints: [
        { x: 5, y: 5 },
        { x: 8, y: 2 },
        { x: 2, y: 2 },
      ],
      currentWaypointIndex: 0,
      speed: 1.6,
      chaseSpeed: 2.8,
      direction: 'S',
      damage: 40,
      bobOffset: 0.5,
      type: 'guardian',
      detectionRadius: 6.0,
      isChasing: false,
    },
  ],
  items: [
    {
      id: 'frag_05',
      x: 5,
      y: 2.5,
      z: 1.3,
      type: 'nexus_fragment',
      fragmentId: 5,
      isCollected: false,
      name: 'Nexus Fragment V (Singularity Key)',
      description: 'The final quantum fragment! Unlocks the Nexus Overmind Core gateway.',
    },
  ],
  teleporters: [],
  ambientColor: '#16091f',
  accentColor: '#ec4899',
};

// ----------------------------------------------------
// SECTOR 19: SANCTUM ANTECHAMBER
// ----------------------------------------------------
const s19Grid = buildRoomGrid({
  width: 11,
  depth: 11,
  wallHeight: 2,
  elevations: {
    '3,3': 1,
    '7,3': 1,
    '3,7': 1,
    '7,7': 1,
    '5,3': 1,
  },
  doorOpenings: [
    { x: 10, y: 5 },
    { x: 5, y: 0 },
  ],
});

export const SECTOR_19: RoomDefinition = {
  id: 'sector_19',
  name: 'Sector 19: Sanctum Antechamber',
  code: 'SEC-19',
  quadrant: 'Omega: Nexus Apex',
  description: 'The ceremonial gateway sealed by 5 Quantum Fragment Locks. All 5 fragments are required.',
  width: 11,
  depth: 11,
  defaultPlayerSpawn: { x: 8, y: 5, z: 0, direction: 'W' },
  floorGrid: s19Grid,
  crates: [
    { id: 'c19_pillar', x: 5, y: 6, z: 0, w: 1, d: 1, h: 1, isMoving: false },
  ],
  switches: [
    {
      id: 'sw19_altar',
      x: 5,
      y: 3,
      z: 1,
      type: 'terminal',
      isActivated: false,
      label: 'Fragment Harmonizer Altar',
    },
  ],
  doors: [
    {
      id: 'door19_east',
      x: 10,
      y: 5,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'NS',
      isOpen: true,
      leadsToRoom: 'sector_18',
      spawnCoords: { x: 1.5, y: 5, z: 0 },
    },
    {
      id: 'door19_north_apex',
      x: 5,
      y: 0,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'EW',
      isOpen: false, // Opens only when player collects 5 fragments
      leadsToRoom: 'sector_20',
      spawnCoords: { x: 5, y: 8.5, z: 0 },
    },
  ],
  elevators: [
    {
      id: 'elev19_to_17',
      x: 2,
      y: 8,
      z: 0,
      targetRoomId: 'sector_17',
      targetX: 4.5,
      targetY: 4.5,
      targetZ: 1,
      label: 'Lift to Sector 17 Data Conduits',
    },
  ],
  lasers: [],
  drones: [],
  items: [
    {
      id: 'item19_fullmedkit',
      x: 8,
      y: 2,
      z: 0.2,
      type: 'medkit',
      isCollected: false,
      name: 'Full Restoration Medkit',
      description: 'Restores hull integrity to maximum capacity.',
    },
  ],
  teleporters: [],
  ambientColor: '#120d24',
  accentColor: '#fbbf24',
};

// ----------------------------------------------------
// SECTOR 20: NEXUS OVERMIND CORE (APEX FINALE)
// ----------------------------------------------------
const s20Grid = buildRoomGrid({
  width: 12,
  depth: 12,
  wallHeight: 3,
  elevations: {
    '5,5': 1,
    '6,5': 1,
    '5,6': 1,
    '6,6': 1,
    '3,3': 1,
    '8,3': 1,
    '3,8': 1,
    '8,8': 1,
  },
  doorOpenings: [{ x: 5, y: 11 }],
});

export const SECTOR_20: RoomDefinition = {
  id: 'sector_20',
  name: 'Sector 20: Nexus Overmind Core',
  code: 'SEC-20',
  quadrant: 'Omega: Nexus Apex',
  description: 'The supercomputer core of Zenith. The Hyperspace Exit Portal is energized!',
  width: 12,
  depth: 12,
  defaultPlayerSpawn: { x: 5.5, y: 9.5, z: 0, direction: 'N' },
  floorGrid: s20Grid,
  crates: [],
  switches: [],
  doors: [
    {
      id: 'door20_south',
      x: 5.5,
      y: 11,
      z: 0,
      width: 1,
      height: 2,
      orientation: 'EW',
      isOpen: true,
      leadsToRoom: 'sector_19',
      spawnCoords: { x: 5, y: 1.5, z: 0 },
    },
  ],
  lasers: [],
  drones: [],
  items: [],
  teleporters: [],
  exitPortal: {
    id: 'nexus_core_exit_portal',
    x: 5.5,
    y: 5.5,
    z: 1,
    isActive: true,
    requiredEnergyCells: 3,
    requiredFragments: 5,
  },
  ambientColor: '#0a0d1f',
  accentColor: '#38bdf8',
};
