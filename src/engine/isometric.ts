import { BoundingBox3D, Vector3 } from '../types/game';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_Z_HEIGHT = 24; // Pixel height per 1.0 elevation unit

/**
 * Transforms 3D grid coordinate (x, y, z) into 2D screen coordinate (sx, sy).
 */
export function worldToScreen(x: number, y: number, z: number): { x: number; y: number } {
  const sx = (x - y) * (TILE_WIDTH / 2);
  const sy = (x + y) * (TILE_HEIGHT / 2) - z * TILE_Z_HEIGHT;
  return { x: sx, y: sy };
}

/**
 * Transforms 2D screen coordinate back to world ground plane (z = elevation).
 */
export function screenToWorld(sx: number, sy: number, z: number = 0): { x: number; y: number } {
  const adjY = sy + z * TILE_Z_HEIGHT;
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  const x = (sx / halfW + adjY / halfH) / 2;
  const y = (adjY / halfH - sx / halfW) / 2;
  return { x, y };
}

/**
 * Depth sort key for isometric rendering.
 * Objects with lower depth values are drawn before objects with higher depth values.
 */
export function getIsometricDepth(x: number, y: number, z: number, offset: number = 0): number {
  return (x + y) * 1000 + z * 100 + offset;
}

/**
 * Checks 3D Axis-Aligned Bounding Box (AABB) collision between two boxes.
 */
export function checkAABBCollision(a: BoundingBox3D, b: BoundingBox3D): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.d &&
    a.y + a.d > b.y &&
    a.z < b.z + b.h &&
    a.z + a.h > b.z
  );
}

/**
 * Check distance between two 2D/3D points
 */
export function distance2D(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(p1: Vector3, p2: Vector3): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
