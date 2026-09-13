export interface RoomGraphNode {
  id: string;
  name: string;
  code: string;
  quadrant: 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | 'Omega';
  quadrantName: string;
  gridX: number; // 0 to 4 for map layout
  gridY: number; // 0 to 3 for map layout
  description: string;
  primaryPuzzle: string;
  hasKeycard?: 'BLUE' | 'RED' | 'GREEN';
  hasFragment?: number; // 1 to 5
  hasExitPortal?: boolean;
}

export interface RoomGraphEdge {
  from: string;
  to: string;
  type: 'door' | 'teleport' | 'elevator';
  requiredKeycard?: string; // 'BLUE' | 'RED' | 'GREEN'
  requiredFragments?: number; // 5 for nexus core
  label?: string;
}

export const WORLD_ROOM_NODES: RoomGraphNode[] = [
  // Quadrant Alpha (Docking & Cryo)
  {
    id: 'sector_01',
    name: 'Cryo-Dock Awakening',
    code: 'SEC-01',
    quadrant: 'Alpha',
    quadrantName: 'Alpha: Docking Bay',
    gridX: 0,
    gridY: 3,
    description: 'Awakening bay of Orbital Station Zenith. Restore auxiliary circuits.',
    primaryPuzzle: 'Crate Slide to Pressure Switch',
  },
  {
    id: 'sector_02',
    name: 'Cargo Processing',
    code: 'SEC-02',
    quadrant: 'Alpha',
    quadrantName: 'Alpha: Docking Bay',
    gridX: 1,
    gridY: 3,
    description: 'Automated cargo sorting matrix with industrial conveyor blocks.',
    primaryPuzzle: 'Dual Crate Weight Balance',
    hasKeycard: 'BLUE',
  },
  {
    id: 'sector_03',
    name: 'Ventilation Catwalks',
    code: 'SEC-03',
    quadrant: 'Alpha',
    quadrantName: 'Alpha: Docking Bay',
    gridX: 0,
    gridY: 2,
    description: 'Narrow catwalks suspended over zero-g exhaust shafts.',
    primaryPuzzle: 'Chasm Precision Platforming',
    hasFragment: 1,
  },
  {
    id: 'sector_04',
    name: 'Sub-Atmospheric Lock',
    code: 'SEC-04',
    quadrant: 'Alpha',
    quadrantName: 'Alpha: Docking Bay',
    gridX: 1,
    gridY: 2,
    description: 'Decompression chambers with alternating laser safety fields.',
    primaryPuzzle: 'Alternating Laser Matrix',
  },

  // Quadrant Beta (Engineering & Dynamo)
  {
    id: 'sector_05',
    name: 'Dynamo Matrix',
    code: 'SEC-05',
    quadrant: 'Beta',
    quadrantName: 'Beta: Engineering Core',
    gridX: 2,
    gridY: 3,
    description: 'High-voltage inductive reactors generating station power.',
    primaryPuzzle: 'Patrol Drone Bypass',
  },
  {
    id: 'sector_06',
    name: 'Plasma Conduit',
    code: 'SEC-06',
    quadrant: 'Beta',
    quadrantName: 'Beta: Engineering Core',
    gridX: 2,
    gridY: 2,
    description: 'Superheated energy pipes guarded by stationary laser emitters.',
    primaryPuzzle: 'Ceramic Crate Laser Deflection',
    hasKeycard: 'RED',
  },
  {
    id: 'sector_07',
    name: 'Cooling Tanks',
    code: 'SEC-07',
    quadrant: 'Beta',
    quadrantName: 'Beta: Engineering Core',
    gridX: 0,
    gridY: 1,
    description: 'Cryogenic coolant tanks and pneumatic service elevator.',
    primaryPuzzle: 'Coolant Pump Terminal & Elevator',
  },
  {
    id: 'sector_08',
    name: 'Power Distribution Hub',
    code: 'SEC-08',
    quadrant: 'Beta',
    quadrantName: 'Beta: Engineering Core',
    gridX: 2,
    gridY: 1,
    description: 'Central switching junction routing power to all sectors.',
    primaryPuzzle: '4-Way Switch Parity Alignment',
    hasFragment: 2,
  },

  // Quadrant Gamma (Quantum Research)
  {
    id: 'sector_09',
    name: 'Quantum Relay A',
    code: 'SEC-09',
    quadrant: 'Gamma',
    quadrantName: 'Gamma: Quantum Labs',
    gridX: 3,
    gridY: 3,
    description: 'Sub-space particle transmitter pads connecting isolated platforms.',
    primaryPuzzle: 'Quantum Beam Teleporter Sequence',
  },
  {
    id: 'sector_10',
    name: 'Particle Accelerator',
    code: 'SEC-10',
    quadrant: 'Gamma',
    quadrantName: 'Gamma: Quantum Labs',
    gridX: 3,
    gridY: 2,
    description: 'Circular magnetic accelerator track monitored by Guardian Drone.',
    primaryPuzzle: 'Guardian Drone Evasion & Lure',
  },
  {
    id: 'sector_11',
    name: 'Sub-Zero Cryo-Lab',
    code: 'SEC-11',
    quadrant: 'Gamma',
    quadrantName: 'Gamma: Quantum Labs',
    gridX: 0,
    gridY: 0,
    description: 'Deep freeze containment chamber with multi-elevation ledges.',
    primaryPuzzle: 'Crate Staircase Assembly',
    hasFragment: 3,
  },
  {
    id: 'sector_12',
    name: 'Teleportation Matrix',
    code: 'SEC-12',
    quadrant: 'Gamma',
    quadrantName: 'Gamma: Quantum Labs',
    gridX: 3,
    gridY: 1,
    description: 'Dual-frequency teleport hubs connecting upper and lower decks.',
    primaryPuzzle: 'Teleport Loop & Gate Override',
    hasKeycard: 'GREEN',
  },

  // Quadrant Delta (Security & Defense)
  {
    id: 'sector_13',
    name: 'Security Checkpoint',
    code: 'SEC-13',
    quadrant: 'Delta',
    quadrantName: 'Delta: Security Bastion',
    gridX: 2,
    gridY: 0,
    description: 'Armored blast gates regulating entrance into inner sectors.',
    primaryPuzzle: 'Multi-Keycard Security Gate',
  },
  {
    id: 'sector_14',
    name: 'Drone Assembly Line',
    code: 'SEC-14',
    quadrant: 'Delta',
    quadrantName: 'Delta: Security Bastion',
    gridX: 4,
    gridY: 2,
    description: 'Automated fabrication bay spawning patrol and hunter drones.',
    primaryPuzzle: 'Dual Drone Interception Avoidance',
  },
  {
    id: 'sector_15',
    name: 'Armory Vault',
    code: 'SEC-15',
    quadrant: 'Delta',
    quadrantName: 'Delta: Security Bastion',
    gridX: 4,
    gridY: 1,
    description: 'High-security weapon store protected by green biometric lock.',
    primaryPuzzle: 'Green Vault Laser Grid',
    hasFragment: 4,
  },
  {
    id: 'sector_16',
    name: 'Surveillance Array',
    code: 'SEC-16',
    quadrant: 'Delta',
    quadrantName: 'Delta: Security Bastion',
    gridX: 4,
    gridY: 3,
    description: 'Long-range station sensors with rotating perimeter sweep beams.',
    primaryPuzzle: 'Timed Laser Shadow Seeking',
  },

  // Quadrant Omega (Central AI Nexus)
  {
    id: 'sector_17',
    name: 'Data Conduits',
    code: 'SEC-17',
    quadrant: 'Omega',
    quadrantName: 'Omega: Nexus Apex',
    gridX: 1,
    gridY: 0,
    description: 'Massive optical fiber conduits leading directly to the AI core.',
    primaryPuzzle: 'Pneumatic Apex Elevator',
  },
  {
    id: 'sector_18',
    name: 'AI Processing Vault',
    code: 'SEC-18',
    quadrant: 'Omega',
    quadrantName: 'Omega: Nexus Apex',
    gridX: 3,
    gridY: 0,
    description: 'Crystalline server towers guarded by an elite Guardian Drone.',
    primaryPuzzle: 'Guardian Drone Containment Crate',
    hasFragment: 5,
  },
  {
    id: 'sector_19',
    name: 'Sanctum Antechamber',
    code: 'SEC-19',
    quadrant: 'Omega',
    quadrantName: 'Omega: Nexus Apex',
    gridX: 1,
    gridY: 1,
    description: 'The ceremonial gateway sealed by 5 Quantum Fragment Locks.',
    primaryPuzzle: '5-Fragment Nexus Lock Matrix',
  },
  {
    id: 'sector_20',
    name: 'Nexus Overmind Core',
    code: 'SEC-20',
    quadrant: 'Omega',
    quadrantName: 'Omega: Nexus Apex',
    gridX: 4,
    gridY: 0,
    description: 'The central AI supercomputer core housing the Hyperspace Exit Portal.',
    primaryPuzzle: 'Extraction Portal Final Step',
    hasExitPortal: true,
  },
];

export const WORLD_ROOM_EDGES: RoomGraphEdge[] = [
  // Sector 01 connections
  { from: 'sector_01', to: 'sector_02', type: 'door', label: 'East Blast Door' },
  { from: 'sector_01', to: 'sector_03', type: 'door', requiredKeycard: 'BLUE', label: 'North Gate [Blue Key]' },

  // Sector 02 connections
  { from: 'sector_02', to: 'sector_01', type: 'door', label: 'West Door' },
  { from: 'sector_02', to: 'sector_04', type: 'door', label: 'North Door' },
  { from: 'sector_02', to: 'sector_05', type: 'door', label: 'East Door' },

  // Sector 03 connections
  { from: 'sector_03', to: 'sector_01', type: 'door', label: 'South Door' },
  { from: 'sector_03', to: 'sector_07', type: 'door', label: 'North Catwalk' },

  // Sector 04 connections
  { from: 'sector_04', to: 'sector_02', type: 'door', label: 'South Door' },
  { from: 'sector_04', to: 'sector_06', type: 'door', label: 'East Airway' },

  // Sector 05 connections
  { from: 'sector_05', to: 'sector_02', type: 'door', label: 'West Door' },
  { from: 'sector_05', to: 'sector_06', type: 'door', label: 'North Door' },
  { from: 'sector_05', to: 'sector_08', type: 'door', requiredKeycard: 'BLUE', label: 'North Gate [Blue Key]' },

  // Sector 06 connections
  { from: 'sector_06', to: 'sector_04', type: 'door', label: 'West Door' },
  { from: 'sector_06', to: 'sector_05', type: 'door', label: 'South Door' },
  { from: 'sector_06', to: 'sector_10', type: 'door', label: 'East Door' },

  // Sector 07 connections
  { from: 'sector_07', to: 'sector_03', type: 'door', label: 'South Door' },
  { from: 'sector_07', to: 'sector_11', type: 'elevator', label: 'Cryo-Lift Platform' },

  // Sector 08 connections
  { from: 'sector_08', to: 'sector_05', type: 'door', label: 'South Door' },
  { from: 'sector_08', to: 'sector_09', type: 'door', label: 'East Conduit' },
  { from: 'sector_08', to: 'sector_13', type: 'door', requiredKeycard: 'RED', label: 'North Gate [Red Key]' },

  // Sector 09 connections
  { from: 'sector_09', to: 'sector_08', type: 'door', label: 'West Door' },
  { from: 'sector_09', to: 'sector_12', type: 'teleport', label: 'Quantum Beam Pad A' },

  // Sector 10 connections
  { from: 'sector_10', to: 'sector_06', type: 'door', label: 'West Door' },
  { from: 'sector_10', to: 'sector_14', type: 'door', label: 'East Door' },

  // Sector 11 connections
  { from: 'sector_11', to: 'sector_07', type: 'elevator', label: 'Lift to Cooling Tanks' },
  { from: 'sector_11', to: 'sector_12', type: 'door', label: 'East Hatch' },

  // Sector 12 connections
  { from: 'sector_12', to: 'sector_11', type: 'door', label: 'West Door' },
  { from: 'sector_12', to: 'sector_09', type: 'teleport', label: 'Quantum Beam Pad B' },
  { from: 'sector_12', to: 'sector_16', type: 'door', label: 'South Door' },

  // Sector 13 connections
  { from: 'sector_13', to: 'sector_08', type: 'door', label: 'South Door' },
  { from: 'sector_13', to: 'sector_14', type: 'door', label: 'East Door' },
  { from: 'sector_13', to: 'sector_17', type: 'door', requiredKeycard: 'GREEN', label: 'North Gate [Green Key]' },

  // Sector 14 connections
  { from: 'sector_14', to: 'sector_13', type: 'door', label: 'West Door' },
  { from: 'sector_14', to: 'sector_10', type: 'door', label: 'South Door' },
  { from: 'sector_14', to: 'sector_15', type: 'door', requiredKeycard: 'GREEN', label: 'East Gate [Green Key]' },

  // Sector 15 connections
  { from: 'sector_15', to: 'sector_14', type: 'door', label: 'West Door' },
  { from: 'sector_15', to: 'sector_18', type: 'door', label: 'North Hatch' },

  // Sector 16 connections
  { from: 'sector_16', to: 'sector_12', type: 'door', label: 'North Door' },
  { from: 'sector_16', to: 'sector_18', type: 'door', label: 'West Conduit' },

  // Sector 17 connections
  { from: 'sector_17', to: 'sector_13', type: 'door', label: 'South Door' },
  { from: 'sector_17', to: 'sector_19', type: 'elevator', label: 'Sanctum Lift' },

  // Sector 18 connections
  { from: 'sector_18', to: 'sector_15', type: 'door', label: 'South Door' },
  { from: 'sector_18', to: 'sector_16', type: 'door', label: 'East Door' },
  { from: 'sector_18', to: 'sector_19', type: 'door', label: 'West Gate' },

  // Sector 19 connections
  { from: 'sector_19', to: 'sector_17', type: 'elevator', label: 'Lift to Conduits' },
  { from: 'sector_19', to: 'sector_18', type: 'door', label: 'East Door' },
  { from: 'sector_19', to: 'sector_20', type: 'door', requiredFragments: 5, label: 'Apex Gateway [5 Fragments]' },

  // Sector 20 connections
  { from: 'sector_20', to: 'sector_19', type: 'door', label: 'South Gate' },
];

export function getNodeById(id: string): RoomGraphNode | undefined {
  return WORLD_ROOM_NODES.find((n) => n.id === id);
}

export function getConnectedEdges(roomId: string): RoomGraphEdge[] {
  return WORLD_ROOM_EDGES.filter((e) => e.from === roomId);
}
