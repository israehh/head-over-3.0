import { TileBlock } from '../types/game';

export interface GridConfig {
  width: number;
  depth: number;
  wallHeight?: number;
  elevations?: { [coord: string]: number };
  pits?: string[]; // "x,y" coordinates that are holes/pits
  hazards?: string[]; // "x,y" coordinates that are hazard floor
  doorOpenings?: { x: number; y: number }[];
}

export function buildRoomGrid(config: GridConfig): TileBlock[][] {
  const {
    width,
    depth,
    wallHeight = 2,
    elevations = {},
    pits = [],
    hazards = [],
    doorOpenings = [],
  } = config;

  const grid: TileBlock[][] = [];
  const pitSet = new Set(pits);
  const hazardSet = new Set(hazards);
  const doorSet = new Set(doorOpenings.map((d) => `${d.x},${d.y}`));

  for (let x = 0; x < width; x++) {
    grid[x] = [];
    for (let y = 0; y < depth; y++) {
      const key = `${x},${y}`;
      const isBoundary = x === 0 || y === 0 || x === width - 1 || y === depth - 1;

      if (doorSet.has(key)) {
        // Doorway opening on perimeter
        grid[x][y] = {
          type: 'floor',
          elevation: 0,
          colorVariant: (x + y) % 2,
        };
      } else if (isBoundary) {
        grid[x][y] = {
          type: 'wall',
          elevation: wallHeight,
          colorVariant: (x + y) % 3,
        };
      } else if (pitSet.has(key)) {
        grid[x][y] = {
          type: 'pit',
          elevation: -1,
        };
      } else if (hazardSet.has(key)) {
        grid[x][y] = {
          type: 'hazard',
          elevation: 0,
          colorVariant: 1,
        };
      } else {
        const customElev = elevations[key] ?? 0;
        grid[x][y] = {
          type: customElev > 0 ? 'elevated' : 'floor',
          elevation: customElev,
          colorVariant: (x + y) % 2,
        };
      }
    }
  }

  return grid;
}
