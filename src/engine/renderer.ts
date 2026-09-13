import {
  CrateEntity,
  Direction,
  DoorEntity,
  EnemyProjectile,
  ExitPortal,
  ItemCollectible,
  LaserBarrier,
  MovingElevator,
  Particle,
  PatrolDrone,
  PlayerState,
  RoomDefinition,
  SwitchEntity,
  TeleporterPad,
} from '../types/game';
import { TILE_HEIGHT, TILE_WIDTH, TILE_Z_HEIGHT, worldToScreen } from './isometric';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  time: number;
  room: RoomDefinition;
  player: PlayerState;
  particles: Particle[];
  projectiles?: EnemyProjectile[];
  showGrid?: boolean;
}

export class IsometricRenderer {
  public render(params: RenderContext) {
    const { ctx, canvasWidth, canvasHeight, cameraX, cameraY, zoom, time, room, player, particles, projectiles } = params;

    // Clear background with deep space nebula gradient
    const bgGrad = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      50,
      canvasWidth / 2,
      canvasHeight / 2,
      Math.max(canvasWidth, canvasHeight)
    );
    bgGrad.addColorStop(0, room.ambientColor);
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Save state and apply camera transformation
    ctx.save();
    ctx.translate(canvasWidth / 2 - cameraX * zoom, canvasHeight / 2 - cameraY * zoom);
    ctx.scale(zoom, zoom);

    // Gather all drawable elements with depth values for Painter's sorting algorithm
    const renderQueue: { depth: number; draw: () => void }[] = [];

    // 1. Draw floor tiles & static walls
    this.queueMapTiles(room, renderQueue, time);

    // 2. Queue teleporters & switches (drawn near floor level)
    this.queueFloorObjects(room, renderQueue, time);

    // 2.5 Queue in-room moving elevators
    if (room.movingElevators && room.movingElevators.length > 0) {
      this.queueMovingElevators(room.movingElevators, renderQueue, time);
    }

    // 3. Queue crates
    this.queueCrates(room.crates, room, renderQueue);

    // 4. Queue doors & lasers
    this.queueDoorsAndLasers(room, renderQueue, time);

    // 5. Queue items
    this.queueItems(room.items, renderQueue, time);

    // 5.5 Queue Enemy Vision Cones (Floor projected)
    this.queueVisionCones(room.drones, renderQueue, time);

    // 6. Queue patrol drones & advanced enemies
    this.queueDrones(room.drones, renderQueue, time);

    // 6.5 Queue Enemy Projectiles
    if (projectiles && projectiles.length > 0) {
      this.queueProjectiles(projectiles, renderQueue, time);
    }

    // 7. Queue exit portal
    if (room.exitPortal) {
      this.queueExitPortal(room.exitPortal, renderQueue, time, player.energyCells);
    }

    // 8. Queue Player
    this.queuePlayer(player, room, renderQueue, time);

    // Sort queue by depth: ascending order
    renderQueue.sort((a, b) => a.depth - b.depth);

    // Execute draw operations
    for (const item of renderQueue) {
      item.draw();
    }

    // Draw active dynamic particles
    this.drawParticles(ctx, particles);

    ctx.restore();
  }

  // ----------------------------------------------------
  // MAP TILES (Floors, elevated blocks, walls)
  // ----------------------------------------------------
  private queueMapTiles(
    room: RoomDefinition,
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;

    for (let x = 0; x < room.width; x++) {
      for (let y = 0; y < room.depth; y++) {
        const tile = room.floorGrid[x][y];
        const elev = tile.elevation || 0;
        // Depth sort key for tiles: (x + y) * 100 + z * 10
        const depth = (x + y) * 100 + elev * 10;

        queue.push({
          depth,
          draw: () => {
            const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
            if (!ctx) return;
            const screen = worldToScreen(x, y, elev);

            if (tile.type === 'wall' || elev > 0) {
              // Draw elevated block / wall column
              const baseScreen = worldToScreen(x, y, 0);
              const totalHeight = elev * TILE_Z_HEIGHT;

              // Left Face (Shadowed)
              ctx.fillStyle = tile.type === 'wall' ? '#1e293b' : '#334155';
              ctx.beginPath();
              ctx.moveTo(screen.x - halfW, screen.y);
              ctx.lineTo(screen.x, screen.y + halfH);
              ctx.lineTo(screen.x, screen.y + halfH + totalHeight);
              ctx.lineTo(screen.x - halfW, screen.y + totalHeight);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Right Face (Lit)
              ctx.fillStyle = tile.type === 'wall' ? '#334155' : '#475569';
              ctx.beginPath();
              ctx.moveTo(screen.x, screen.y + halfH);
              ctx.lineTo(screen.x + halfW, screen.y);
              ctx.lineTo(screen.x + halfW, screen.y + totalHeight);
              ctx.lineTo(screen.x, screen.y + halfH + totalHeight);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Top Face
              ctx.fillStyle = tile.type === 'wall' ? '#475569' : '#64748b';
              ctx.beginPath();
              ctx.moveTo(screen.x, screen.y - halfH);
              ctx.lineTo(screen.x + halfW, screen.y);
              ctx.lineTo(screen.x, screen.y + halfH);
              ctx.lineTo(screen.x - halfW, screen.y);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = room.accentColor;
              ctx.lineWidth = 0.6;
              ctx.stroke();

              // Decorative top cyber pattern
              if (tile.type === 'wall') {
                ctx.fillStyle = room.accentColor;
                ctx.fillRect(screen.x - 2, screen.y - 2, 4, 4);
              }
            } else {
              // Standard floor diamond
              ctx.beginPath();
              ctx.moveTo(screen.x, screen.y - halfH);
              ctx.lineTo(screen.x + halfW, screen.y);
              ctx.lineTo(screen.x, screen.y + halfH);
              ctx.lineTo(screen.x - halfW, screen.y);
              ctx.closePath();

              const isAlt = (x + y) % 2 === 0;
              ctx.fillStyle = isAlt ? '#0f172a' : '#141e33';
              ctx.fill();

              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 0.8;
              ctx.stroke();

              // Subtle tech grid lines
              if (isAlt && (x * 7 + y * 3) % 5 === 0) {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.fill();
              }
            }
          },
        });
      }
    }
  }

  // ----------------------------------------------------
  // FLOOR OBJECTS (Switches, Teleporters)
  // ----------------------------------------------------
  private queueFloorObjects(
    room: RoomDefinition,
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    // Switches (Pressure Plates & Energy Terminals)
    for (const sw of room.switches) {
      const isTerminal = sw.type === 'terminal' || sw.type === 'toggle';
      const depth = (sw.x + sw.y) * 100 + sw.z * 10 + (isTerminal ? 25 : 5);
      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;
          const pos = worldToScreen(sw.x, sw.y, sw.z);

          if (isTerminal) {
            // Energy Terminal / Wall Console
            ctx.save();
            // Terminal Stand
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(pos.x - 5, pos.y - 20, 10, 20);
            ctx.fill();
            ctx.stroke();

            // Holographic Display Panel
            const screenGlow = sw.isActivated ? '#10b981' : '#38bdf8';
            ctx.fillStyle = sw.isActivated ? 'rgba(16, 185, 129, 0.85)' : 'rgba(56, 189, 248, 0.85)';
            ctx.strokeStyle = screenGlow;
            ctx.shadowColor = screenGlow;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(pos.x - 12, pos.y - 32, 24, 14, 3);
            ctx.fill();
            ctx.stroke();

            // Console Text
            ctx.font = 'bold 6px JetBrains Mono, monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 0;
            ctx.fillText(sw.isActivated ? 'PWR ON' : 'OFFLINE', pos.x, pos.y - 23);
            ctx.restore();
          } else {
            // Heavy Isometric Pressure Plate
            const halfW = 20;
            const halfH = 10;
            const isDown = sw.isActivated;
            const isHeavy = !!(sw.requiredWeight && sw.requiredWeight > 1);

            ctx.save();

            // Extra outer hydraulic stabilizer ring if heavy multi-weight plate
            if (isHeavy) {
              ctx.beginPath();
              ctx.ellipse(pos.x, pos.y + 2, halfW * 1.25, halfH * 1.25, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#090d16';
              ctx.fill();
              ctx.strokeStyle = isDown ? '#059669' : '#d97706';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              // Weight requirement readout
              ctx.font = 'bold 7px JetBrains Mono, monospace';
              ctx.fillStyle = isDown ? '#34d399' : '#fbbf24';
              ctx.textAlign = 'center';
              ctx.fillText(`${sw.requiredWeight}t DUAL-MASS`, pos.x, pos.y + 16);
            }

            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, halfW, halfH, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = isDown ? '#10b981' : isHeavy ? '#f59e0b' : '#f59e0b';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner compression pad
            const padY = pos.y - (isDown ? 1 : 4);
            ctx.beginPath();
            ctx.ellipse(pos.x, padY, halfW * 0.75, halfH * 0.75, 0, 0, Math.PI * 2);
            ctx.fillStyle = isDown ? '#065f46' : '#78350f';
            ctx.fill();
            ctx.strokeStyle = isDown ? '#34d399' : '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing status node
            const glowColor = isDown ? '#34d399' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(pos.x, padY, 4, 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();
          }
        },
      });
    }

    // Teleporters
    for (const tele of room.teleporters) {
      const depth = (tele.x + tele.y) * 100 + tele.z * 10 + 2;
      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;
          const pos = worldToScreen(tele.x, tele.y, tele.z);
          const pulse = (Math.sin(time * 4) + 1) * 0.5;

          // Rotating rings
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y, 26 + pulse * 4, 13 + pulse * 2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = tele.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = tele.color;
          ctx.shadowBlur = 12;
          ctx.stroke();

          // Inner energy beam
          const beamGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - 45);
          beamGrad.addColorStop(0, tele.color);
          beamGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(pos.x - 12, pos.y - 45, 24, 45);
          ctx.restore();
        },
      });
    }

    // Elevators
    if (room.elevators) {
      for (const elev of room.elevators) {
        const depth = (elev.x + elev.y) * 100 + elev.z * 10 + 3;
        const isOnline = elev.isActive !== false;
        queue.push({
          depth,
          draw: () => {
            const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
            if (!ctx) return;
            const pos = worldToScreen(elev.x, elev.y, elev.z);
            const pulse = (Math.sin(time * 3) + 1) * 0.5;

            ctx.save();
            // Metallic octagonal base platform
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, 24, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = isOnline ? '#1e293b' : '#18181b';
            ctx.fill();
            ctx.strokeStyle = isOnline ? '#38bdf8' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (isOnline) {
              // Upward chevron arrows when active
              ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.6})`;
              ctx.lineWidth = 2.5;
              for (let i = 0; i < 2; i++) {
                const yOffset = -((time * 20 + i * 14) % 28);
                ctx.beginPath();
                ctx.moveTo(pos.x - 8, pos.y + yOffset);
                ctx.lineTo(pos.x, pos.y + yOffset - 5);
                ctx.lineTo(pos.x + 8, pos.y + yOffset);
                ctx.stroke();
              }
            } else {
              // Offline warning cross & pulse
              ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.5})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(pos.x - 7, pos.y - 4);
              ctx.lineTo(pos.x + 7, pos.y + 4);
              ctx.moveTo(pos.x + 7, pos.y - 4);
              ctx.lineTo(pos.x - 7, pos.y + 4);
              ctx.stroke();
            }

            // Platform label
            ctx.font = 'bold 7px monospace';
            ctx.fillStyle = isOnline ? '#94a3b8' : '#f87171';
            ctx.textAlign = 'center';
            ctx.fillText(isOnline ? 'LIFT [ONLINE]' : 'LIFT [NO POWER]', pos.x, pos.y + 10);
            ctx.restore();
          },
        });
      }
    }
  }

  // ----------------------------------------------------
  // CRATES (Pushable isometric cargo blocks)
  // ----------------------------------------------------
  private queueCrates(
    crates: CrateEntity[],
    room: RoomDefinition,
    queue: { depth: number; draw: () => void }[]
  ) {
    for (const crate of crates) {
      const depth = (crate.x + crate.y + 0.5) * 100 + crate.z * 10 + 20;
      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          const screen = worldToScreen(crate.x, crate.y, crate.z);
          const halfW = (TILE_WIDTH / 2) * crate.w * 0.82;
          const halfH = (TILE_HEIGHT / 2) * crate.d * 0.82;
          const boxH = crate.h * TILE_Z_HEIGHT * 1.1;

          // Dynamic surface drop shadow
          const surfaceZ = this.getSurfaceBelow(crate.x, crate.y, room, crate.id);
          const groundScreen = worldToScreen(crate.x, crate.y, surfaceZ);
          const heightAbove = Math.max(0, crate.z - surfaceZ);
          const shadowScale = Math.max(0.35, 1 - (heightAbove / 4) * 0.4);

          ctx.beginPath();
          ctx.ellipse(groundScreen.x, groundScreen.y, halfW * 0.9 * shadowScale, halfH * 0.9 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
          ctx.fill();

          // Left Face
          ctx.fillStyle = crate.color || '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(screen.x - halfW, screen.y);
          ctx.lineTo(screen.x, screen.y + halfH);
          ctx.lineTo(screen.x, screen.y + halfH - boxH);
          ctx.lineTo(screen.x - halfW, screen.y - boxH);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fill(); // shade
          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Right Face
          ctx.fillStyle = crate.color || '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y + halfH);
          ctx.lineTo(screen.x + halfW, screen.y);
          ctx.lineTo(screen.x + halfW, screen.y - boxH);
          ctx.lineTo(screen.x, screen.y + halfH - boxH);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fill();
          ctx.stroke();

          // Top Face
          ctx.fillStyle = crate.color || '#60a5fa';
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - halfH - boxH);
          ctx.lineTo(screen.x + halfW, screen.y - boxH);
          ctx.lineTo(screen.x, screen.y + halfH - boxH);
          ctx.lineTo(screen.x - halfW, screen.y - boxH);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Crate Cross Trim & Tech Icon
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screen.x - 3, screen.y - boxH - 3, 6, 6);
        },
      });
    }
  }

  // ----------------------------------------------------
  // DOORS & LASER HAZARDS
  // ----------------------------------------------------
  private queueDoorsAndLasers(
    room: RoomDefinition,
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    // Doors
    for (const door of room.doors) {
      const depth = (door.x + door.y) * 100 + door.z * 10 + 30;
      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;
          const pos = worldToScreen(door.x, door.y, door.z);
          const isEW = door.orientation === 'EW';

          // Frame pillars
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = door.isOpen ? '#10b981' : door.requiredKeycard ? '#f59e0b' : '#ef4444';
          ctx.lineWidth = 2;

          // Door Archway
          ctx.beginPath();
          ctx.rect(pos.x - 18, pos.y - 45, 36, 45);
          ctx.stroke();

          // Sliding door panels
          if (!door.isOpen) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(pos.x - 15, pos.y - 42, 30, 42);

            // Keycard indicator logo
            let cardColor = '#ef4444';
            let cardLabel = 'X';

            if (door.requiredKeycard === 'BLUE' || door.requiredKeycard === 'ALPHA') {
              cardColor = '#38bdf8';
              cardLabel = 'B';
            } else if (door.requiredKeycard === 'RED') {
              cardColor = '#ef4444';
              cardLabel = 'R';
            } else if (door.requiredKeycard === 'GREEN') {
              cardColor = '#10b981';
              cardLabel = 'G';
            } else if (door.requiredKeycard === 'BETA') {
              cardColor = '#c084fc';
              cardLabel = 'β';
            } else if (!door.requiredKeycard && door.leadsToRoom === 'sector_20') {
              cardColor = '#fbbf24';
              cardLabel = '5F';
            }

            ctx.fillStyle = cardColor;
            ctx.fillRect(pos.x - 7, pos.y - 25, 14, 9);
            ctx.font = 'bold 8px JetBrains Mono, monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(cardLabel, pos.x, pos.y - 18);
          } else {
            // Open door green gateway shimmer
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(pos.x - 14, pos.y - 40, 28, 40);
          }
        },
      });
    }

    // Lasers
    for (const laser of room.lasers) {
      if (!laser.isActive) continue;
      const midX = (laser.startX + laser.endX) / 2;
      const midY = (laser.startY + laser.endY) / 2;
      const depth = (midX + midY) * 100 + laser.z * 10 + 35;

      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          // Calculate if any crate blocks this laser beam
          let minT = 1.0;
          let hitCrate: CrateEntity | null = null;
          for (const crate of room.crates) {
            if (crate.isCarried) continue;
            if (laser.z >= crate.z - 0.15 && laser.z <= crate.z + crate.h + 0.15) {
              const l2 = (laser.endX - laser.startX) ** 2 + (laser.endY - laser.startY) ** 2;
              if (l2 > 0) {
                let t =
                  ((crate.x - laser.startX) * (laser.endX - laser.startX) +
                    (crate.y - laser.startY) * (laser.endY - laser.startY)) /
                  l2;
                t = Math.max(0, Math.min(1, t));
                const px = laser.startX + t * (laser.endX - laser.startX);
                const py = laser.startY + t * (laser.endY - laser.startY);
                const d = Math.hypot(crate.x - px, crate.y - py);
                if (d < 0.65 && t < minT) {
                  minT = t;
                  hitCrate = crate;
                }
              }
            }
          }

          const effectiveEndX = laser.startX + minT * (laser.endX - laser.startX);
          const effectiveEndY = laser.startY + minT * (laser.endY - laser.startY);

          const p1 = worldToScreen(laser.startX, laser.startY, laser.z);
          const p2 = worldToScreen(effectiveEndX, effectiveEndY, laser.z);
          const fullEnd = worldToScreen(laser.endX, laser.endY, laser.z);

          // Pulsing laser beam
          const pulse = (Math.sin(time * 12) + 1) * 0.5;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 6 + pulse * 3;
          ctx.stroke();

          // Laser white-hot core
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.stroke();

          // If blocked by crate, draw impact sparks
          if (hitCrate && minT < 0.98) {
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, 4 + pulse * 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Emitter posts (at original endpoints)
          [p1, fullEnd].forEach((pt) => {
            ctx.fillStyle = '#475569';
            ctx.fillRect(pt.x - 3, pt.y - 8, 6, 8);
          });
          ctx.restore();
        },
      });
    }
  }

  // ----------------------------------------------------
  // ITEMS & COLLECTIBLES (Keycards, Energy cells, Medkits)
  // ----------------------------------------------------
  private queueItems(
    items: ItemCollectible[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const item of items) {
      if (item.isCollected) continue;
      const bob = Math.sin(time * 4 + item.x * 2) * 5;
      const depth = (item.x + item.y) * 100 + item.z * 10 + 25;

      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;
          const pos = worldToScreen(item.x, item.y, item.z);
          const py = pos.y + bob;

          // Shadow on ground
          const ground = worldToScreen(item.x, item.y, 0);
          ctx.beginPath();
          ctx.ellipse(ground.x, ground.y, 10, 5, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fill();

          if (
            item.type === 'keycard_alpha' ||
            item.type === 'keycard_beta' ||
            item.type === 'keycard_blue' ||
            item.type === 'keycard_red' ||
            item.type === 'keycard_green'
          ) {
            let cardColor = '#38bdf8';
            let cardGlyph = 'B';
            if (item.type === 'keycard_alpha') {
              cardColor = '#38bdf8';
              cardGlyph = 'α';
            } else if (item.type === 'keycard_beta') {
              cardColor = '#c084fc';
              cardGlyph = 'β';
            } else if (item.type === 'keycard_blue') {
              cardColor = '#38bdf8';
              cardGlyph = 'B';
            } else if (item.type === 'keycard_red') {
              cardColor = '#ef4444';
              cardGlyph = 'R';
            } else if (item.type === 'keycard_green') {
              cardColor = '#10b981';
              cardGlyph = 'G';
            }

            ctx.save();
            ctx.translate(pos.x, py - 15);
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = cardColor;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = cardColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(-10, -7, 20, 14, 2);
            ctx.fill();
            ctx.stroke();

            // Chip and stripe
            ctx.fillStyle = cardColor;
            ctx.fillRect(-8, -4, 4, 8);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px monospace';
            ctx.fillText(cardGlyph, 3, 2);
            ctx.restore();
          } else if (item.type === 'nexus_fragment') {
            // Nexus Quantum Crystal Fragment
            const pulse = (Math.sin(time * 5) + 1) * 0.5;
            ctx.save();
            ctx.translate(pos.x, py - 20);

            // Radiant diamond glow
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 14 + pulse * 6;

            // Rotating crystalline octahedron
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Inner facet lines
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.lineTo(0, 12);
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Roman numeral fragment identifier
            const numerals = ['I', 'II', 'III', 'IV', 'V'];
            const roman = item.fragmentId ? numerals[item.fragmentId - 1] || 'F' : 'F';
            ctx.font = 'bold 7px JetBrains Mono, monospace';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 0;
            ctx.fillText(roman, 0, -15);
            ctx.restore();
          } else if (item.type === 'energy_cell') {
            ctx.save();
            ctx.translate(pos.x, py - 18);
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 12;

            // Plasma cylinder
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.roundRect(-6, -10, 12, 20, 3);
            ctx.fill();

            ctx.fillStyle = '#065f46';
            ctx.fillRect(-7, -12, 14, 3);
            ctx.fillRect(-7, 9, 14, 3);
            ctx.restore();
          } else if (item.type === 'medkit') {
            ctx.save();
            ctx.translate(pos.x, py - 15);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(-8, -8, 16, 16, 3);
            ctx.fill();
            ctx.stroke();

            // Red Cross
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-2, -6, 4, 12);
            ctx.fillRect(-6, -2, 12, 4);
            ctx.restore();
          }
        },
      });
    }
  }

  // ----------------------------------------------------
  // ADVANCED ENEMY AI: VISION CONES & SCAN ARCS
  // ----------------------------------------------------
  private queueVisionCones(
    drones: PatrolDrone[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const drone of drones) {
      // Vision cones are projected at floor level
      const depth = (drone.x + drone.y) * 100 + 12;

      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          const fov = drone.visionFov || Math.PI * 0.4;
          const range = drone.visionRange || 5.0;
          const facing = drone.visionAngle ?? 0;
          const state = drone.alertState || 'patrol';

          // Center of enemy projected to floor plane (z = 0 or relative)
          const apex = worldToScreen(drone.x, drone.y, 0.05);

          // Sample arc points along FOV
          const segments = 12;
          const arcPoints: { x: number; y: number }[] = [];
          const startAngle = facing - fov * 0.5;
          const endAngle = facing + fov * 0.5;

          for (let s = 0; s <= segments; s++) {
            const angle = startAngle + (fov * s) / segments;
            const wx = drone.x + Math.cos(angle) * range;
            const wy = drone.y + Math.sin(angle) * range;
            arcPoints.push(worldToScreen(wx, wy, 0.05));
          }

          ctx.save();

          // Configure styling according to alert state
          let fillCol = 'rgba(16, 185, 129, 0.12)';
          let strokeCol = 'rgba(52, 211, 153, 0.45)';
          let edgeGlow = 'rgba(16, 185, 129, 0.8)';

          if (state === 'suspicious') {
            const pulse = (Math.sin(time * 12) + 1) * 0.5;
            fillCol = `rgba(245, 158, 11, ${0.16 + pulse * 0.12})`;
            strokeCol = 'rgba(251, 191, 36, 0.75)';
            edgeGlow = 'rgba(245, 158, 11, 0.9)';
          } else if (state === 'search') {
            fillCol = 'rgba(249, 115, 22, 0.2)';
            strokeCol = 'rgba(251, 146, 60, 0.8)';
            edgeGlow = 'rgba(249, 115, 22, 0.9)';
          } else if (state === 'chase') {
            const strobe = (Math.sin(time * 20) + 1) * 0.5;
            fillCol = `rgba(239, 68, 68, ${0.22 + strobe * 0.16})`;
            strokeCol = 'rgba(239, 68, 68, 0.95)';
            edgeGlow = 'rgba(239, 68, 68, 1.0)';
          }

          // Render cone fan
          ctx.beginPath();
          ctx.moveTo(apex.x, apex.y);
          for (const pt of arcPoints) {
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();

          ctx.fillStyle = fillCol;
          ctx.fill();

          ctx.lineWidth = state === 'chase' ? 2.0 : 1.2;
          ctx.strokeStyle = strokeCol;
          ctx.stroke();

          // Outer arc scanline pulse
          ctx.beginPath();
          if (arcPoints.length > 0) {
            ctx.moveTo(arcPoints[0].x, arcPoints[0].y);
            for (let i = 1; i < arcPoints.length; i++) {
              ctx.lineTo(arcPoints[i].x, arcPoints[i].y);
            }
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = edgeGlow;
            ctx.stroke();
          }

          // Turret Laser Sight Beam
          if (drone.type === 'turret') {
            const beamDist = state === 'chase' ? range : range * 0.85;
            const targetX = drone.x + Math.cos(facing) * beamDist;
            const targetY = drone.y + Math.sin(facing) * beamDist;
            const targetScreen = worldToScreen(targetX, targetY, 0.05);

            ctx.beginPath();
            ctx.moveTo(apex.x, apex.y - 12);
            ctx.lineTo(targetScreen.x, targetScreen.y);
            ctx.strokeStyle = state === 'chase' ? '#ef4444' : '#f59e0b';
            ctx.lineWidth = state === 'chase' ? 2.0 : 1.0;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = state === 'chase' ? 8 : 4;
            ctx.stroke();

            // Laser target dot
            ctx.beginPath();
            ctx.arc(targetScreen.x, targetScreen.y, state === 'chase' ? 4 : 2.5, 0, Math.PI * 2);
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
          }

          ctx.restore();
        },
      });
    }
  }

  // ----------------------------------------------------
  // ADVANCED ENEMY AI: CHASSIS & OVERHEAD ALERTS
  // ----------------------------------------------------
  private queueDrones(
    drones: PatrolDrone[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const drone of drones) {
      const isSentinel = drone.type === 'sentinel';
      const isTurret = drone.type === 'turret';
      const isSecurity = drone.type === 'security' || drone.type === 'guardian';
      const bob = isTurret ? 0 : Math.sin(time * 5 + drone.bobOffset) * (isSentinel ? 6 : 4);
      const depth = (drone.x + drone.y) * 100 + drone.z * 10 + 40;
      const state = drone.alertState || 'patrol';
      const isChasing = state === 'chase';

      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          const pos = worldToScreen(drone.x, drone.y, drone.z);
          const py = pos.y + bob - 18;

          // Ground shadow
          const ground = worldToScreen(drone.x, drone.y, 0);
          ctx.beginPath();
          const shadowRadius = isSentinel ? 20 : isSecurity ? 18 : 14;
          ctx.ellipse(ground.x, ground.y, shadowRadius, shadowRadius * 0.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = isChasing ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0, 0, 0, 0.4)';
          ctx.fill();

          ctx.save();

          // ----------------------------------------------------
          // 1. TURRET
          // ----------------------------------------------------
          if (isTurret) {
            // Bolted base platform with hazard stripes
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y - 4, 16, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Hazard chevrons on base
            ctx.fillStyle = '#eab308';
            ctx.fillRect(pos.x - 10, pos.y - 7, 4, 6);
            ctx.fillRect(pos.x + 6, pos.y - 7, 4, 6);

            // Rotating Armored Turret Dome
            ctx.fillStyle = isChasing ? '#450a0a' : '#334155';
            ctx.strokeStyle = isChasing ? '#ef4444' : '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 14, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Dual Heavy Laser Barrels pointing towards visionAngle
            const angle = drone.visionAngle ?? 0;
            const barrelLen = 14;
            const bx = Math.cos(angle) * barrelLen;
            const by = Math.sin(angle) * (barrelLen * 0.6);

            ctx.lineWidth = 3.5;
            ctx.strokeStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(pos.x - 3, pos.y - 14);
            ctx.lineTo(pos.x - 3 + bx, pos.y - 14 + by);
            ctx.moveTo(pos.x + 3, pos.y - 14);
            ctx.lineTo(pos.x + 3 + bx, pos.y - 14 + by);
            ctx.stroke();

            // Central Core Sensor Eye
            ctx.fillStyle = isChasing ? '#ef4444' : '#f59e0b';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = isChasing ? 12 : 6;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - 14, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Weapon Charging Glow
            if (drone.isCharging) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 16;
              ctx.beginPath();
              ctx.arc(pos.x + bx, pos.y - 14 + by, 5 + Math.random() * 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }

          // ----------------------------------------------------
          // 2. FLYING SENTINEL
          // ----------------------------------------------------
          else if (isSentinel) {
            // Aerodynamic triangular / hexagonal hull
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = isChasing ? '#ef4444' : '#38bdf8';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(pos.x, py - 14);
            ctx.lineTo(pos.x + 16, py + 4);
            ctx.lineTo(pos.x, py + 8);
            ctx.lineTo(pos.x - 16, py + 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Triple Anti-Gravity Hover Pods
            const podOffset = Math.sin(time * 6) * 2;
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;

            // Left pod
            ctx.beginPath();
            ctx.ellipse(pos.x - 14, py + 3 + podOffset, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Right pod
            ctx.beginPath();
            ctx.ellipse(pos.x + 14, py + 3 + podOffset, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rear pod
            ctx.beginPath();
            ctx.ellipse(pos.x, py - 12 - podOffset, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Ion Thruster Plumes (Cyan / Violet)
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 10;
            ctx.fillRect(pos.x - 15, py + 7, 3, 6 + Math.random() * 5);
            ctx.fillRect(pos.x + 12, py + 7, 3, 6 + Math.random() * 5);
            ctx.shadowBlur = 0;

            // Central Optic Core Sensor
            const opticColor = isChasing ? '#ef4444' : '#00f2fe';
            ctx.fillStyle = opticColor;
            ctx.shadowColor = opticColor;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(pos.x, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // ----------------------------------------------------
          // 3. SECURITY DRONE (High-speed pursuit unit)
          // ----------------------------------------------------
          else if (isSecurity) {
            // Aggressive Crimson Armored Chassis
            ctx.fillStyle = '#450a0a';
            ctx.strokeStyle = isChasing ? '#ef4444' : '#f87171';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, py, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Police emergency strobe beacon
            const strobeToggle = Math.sin(time * 25) > 0;
            const beaconColor = isChasing ? (strobeToggle ? '#ef4444' : '#3b82f6') : '#ea580c';
            ctx.fillStyle = beaconColor;
            ctx.shadowColor = beaconColor;
            ctx.shadowBlur = isChasing ? 18 : 8;
            ctx.beginPath();
            ctx.arc(pos.x, py - 14, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Hunter Sensor Visor
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(pos.x, py, 6, 0, Math.PI * 2);
            ctx.fill();

            // Twin Heavy Weapon Pods
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(pos.x - 20, py - 4, 6, 8);
            ctx.fillRect(pos.x + 14, py - 4, 6, 8);

            // High Energy Thruster Flames
            ctx.fillStyle = isChasing ? '#ef4444' : '#f97316';
            ctx.fillRect(pos.x - 19, py + 4, 4, 5 + Math.random() * 6);
            ctx.fillRect(pos.x + 15, py + 4, 4, 5 + Math.random() * 6);
          }

          // ----------------------------------------------------
          // 4. PATROL DRONE (Standard security unit)
          // ----------------------------------------------------
          else {
            // Standard Patrol Drone Chassis (Hexagonal cyber sphere)
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pos.x, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rotating scanner eye
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(pos.x + Math.sin(time * 3) * 4, py, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Thruster stabilizers
            ctx.fillStyle = '#64748b';
            ctx.fillRect(pos.x - 18, py - 3, 6, 6);
            ctx.fillRect(pos.x + 12, py - 3, 6, 6);

            // Thruster flame particles
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(pos.x - 17, py + 3, 4, 4 + Math.random() * 4);
            ctx.fillRect(pos.x + 13, py + 3, 4, 4 + Math.random() * 4);
          }

          // ----------------------------------------------------
          // OVERHEAD ALERT STATUS INDICATOR BADGE
          // ----------------------------------------------------
          if (state !== 'patrol') {
            const badgeY = py - (isTurret ? 26 : 28);

            if (state === 'suspicious') {
              // Amber badge with '?'
              ctx.fillStyle = '#f59e0b';
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;

              // Alert Level progress ring
              const progress = drone.alertLevel ?? 0;
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 11, -Math.PI * 0.5, -Math.PI * 0.5 + progress * Math.PI * 2);
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              // Icon text
              ctx.fillStyle = '#0f172a';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('?', pos.x, badgeY);
            } else if (state === 'search') {
              // Orange badge with '!'
              ctx.fillStyle = '#f97316';
              ctx.shadowColor = '#f97316';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 9, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;

              // Search radar sweep arc
              const sweep = Math.sin(time * 8) * Math.PI;
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 13, sweep - 0.6, sweep + 0.6);
              ctx.strokeStyle = '#fdba74';
              ctx.lineWidth = 2;
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('!', pos.x, badgeY);
            } else if (state === 'chase') {
              // Neon Red diamond with '!!'
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 14;

              ctx.beginPath();
              ctx.moveTo(pos.x, badgeY - 11);
              ctx.lineTo(pos.x + 11, badgeY);
              ctx.lineTo(pos.x, badgeY + 11);
              ctx.lineTo(pos.x - 11, badgeY);
              ctx.closePath();
              ctx.fill();
              ctx.shadowBlur = 0;

              // Pulsing Danger Ring
              const pulse = (Math.sin(time * 15) + 1) * 3;
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 13 + pulse, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 10px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('!!', pos.x, badgeY);
            } else if (state === 'return') {
              // Soft blue return chevron
              ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
              ctx.beginPath();
              ctx.arc(pos.x, badgeY, 6, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⟲', pos.x, badgeY);
            }
          }

          ctx.restore();
        },
      });
    }
  }

  // ----------------------------------------------------
  // ADVANCED ENEMY AI: PROJECTILES
  // ----------------------------------------------------
  private queueProjectiles(
    projectiles: EnemyProjectile[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const p of projectiles) {
      const depth = (p.x + p.y) * 100 + p.z * 10 + 42;

      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          const screenPos = worldToScreen(p.x, p.y, p.z);

          ctx.save();
          // Luminous Outer Glow
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14;

          // Energy Bolt Core
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Hot White Center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Motion Streak Trail
          ctx.beginPath();
          const trailLength = 8;
          ctx.moveTo(screenPos.x, screenPos.y);
          ctx.lineTo(screenPos.x - p.vx * 1.5, screenPos.y - p.vy * 1.5);
          ctx.strokeStyle = p.glowColor;
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.restore();
        },
      });
    }
  }

  // ----------------------------------------------------
  // EXIT PORTAL (Quantum Extraction Gateway)
  // ----------------------------------------------------
  private queueExitPortal(
    portal: ExitPortal,
    queue: { depth: number; draw: () => void }[],
    time: number,
    playerCells: number
  ) {
    const depth = (portal.x + portal.y) * 100 + portal.z * 10 + 45;
    const isPrimed = playerCells >= portal.requiredEnergyCells;

    queue.push({
      depth,
      draw: () => {
        const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
        if (!ctx) return;
        const pos = worldToScreen(portal.x, portal.y, portal.z);

        ctx.save();
        // Portal arch frame
        ctx.strokeStyle = isPrimed ? '#10b981' : '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y - 30, 36, 48, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Swirling vortex interior
        const vortexGrad = ctx.createRadialGradient(pos.x, pos.y - 30, 5, pos.x, pos.y - 30, 34);
        if (isPrimed) {
          vortexGrad.addColorStop(0, '#ffffff');
          vortexGrad.addColorStop(0.4, '#34d399');
          vortexGrad.addColorStop(0.8, '#065f46');
          vortexGrad.addColorStop(1, 'transparent');
        } else {
          vortexGrad.addColorStop(0, '#475569');
          vortexGrad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = vortexGrad;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y - 30, 32, 44, 0, 0, Math.PI * 2);
        ctx.fill();

        // Status text banner
        ctx.font = 'bold 9px Chakra Petch, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isPrimed ? '#34d399' : '#f59e0b';
        ctx.fillText(
          isPrimed ? 'GATEWAY ACTIVE [ENTER]' : `REQUIRES ${portal.requiredEnergyCells} CELLS (${playerCells}/${portal.requiredEnergyCells})`,
          pos.x,
          pos.y - 82
        );
        ctx.restore();
      },
    });
  }

  // ----------------------------------------------------
  // PLAYER (Head Over Heels Cybernetic Operative)
  // ----------------------------------------------------
  private queuePlayer(
    player: PlayerState,
    room: RoomDefinition,
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    // Player depth
    const depth = (player.x + player.y) * 100 + player.z * 10 + 32;

    queue.push({
      depth,
      draw: () => {
        const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
        if (!ctx) return;

        const screen = worldToScreen(player.x, player.y, player.z);
        const surfaceZ = this.getSurfaceBelow(player.x, player.y, room);
        const ground = worldToScreen(player.x, player.y, surfaceZ);

        // 1. Dynamic Drop Shadow:
        // Positioned at ground (or top of surface under player). Scales down as player jumps higher!
        const heightFactor = Math.max(0.2, 1 - (Math.max(0, player.z - surfaceZ) / 3.5) * 0.45);
        ctx.beginPath();
        ctx.ellipse(ground.x, ground.y, 14 * heightFactor, 7 * heightFactor, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.48 * heightFactor})`;
        ctx.fill();

        // 2. Invulnerability flicker when damaged
        if (player.invulnerableTimer > 0 && Math.floor(time * 20) % 2 === 0) {
          return;
        }

        ctx.save();
        ctx.translate(screen.x, screen.y - 18);

        // Walk cycle animation offset
        const walkBob = player.isMoving ? Math.sin(player.walkFrame * 2) * 2 : 0;
        const legAngle = player.isMoving ? Math.sin(player.walkFrame * 2) * 0.4 : 0;

        // Legs
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Left Leg
        ctx.beginPath();
        ctx.moveTo(-4, 8 + walkBob);
        ctx.lineTo(-4 + Math.sin(legAngle) * 5, 17 + walkBob);
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(4, 8 + walkBob);
        ctx.lineTo(4 - Math.sin(legAngle) * 5, 17 + walkBob);
        ctx.stroke();

        // Cyber Body / Torso
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-8, -4 + walkBob, 16, 14, 3);
        ctx.fill();
        ctx.stroke();

        // Power Core on Chest (Pulsing cyan light)
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 3 + walkBob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Head (Head Over Heels tribute: distinctive robotic head with rounded visor)
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-9, -18 + walkBob, 18, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Visor facing direction
        let visorOffsetX = 0;
        if (player.direction === 'E' || player.direction === 'SE' || player.direction === 'NE') {
          visorOffsetX = 3;
        } else if (player.direction === 'W' || player.direction === 'SW' || player.direction === 'NW') {
          visorOffsetX = -3;
        }

        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 6;
        ctx.fillRect(-5 + visorOffsetX, -14 + walkBob, 10, 5);
        ctx.shadowBlur = 0;

        // Cyber Antenna / Ears (Heels homage)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -18 + walkBob);
        ctx.lineTo(-7, -24 + walkBob);
        ctx.moveTo(5, -18 + walkBob);
        ctx.lineTo(7, -24 + walkBob);
        ctx.stroke();

        // Advanced Crate Carrying: Render raised robotic arms, magnetic clamps, and carried crate
        if (player.carriedCrate) {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-6, -4 + walkBob);
          ctx.lineTo(-12, -18 + walkBob);
          ctx.lineTo(-9, -28 + walkBob);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(6, -4 + walkBob);
          ctx.lineTo(12, -18 + walkBob);
          ctx.lineTo(9, -28 + walkBob);
          ctx.stroke();

          // Magnetic Clamps glowing cyan
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fillRect(-11, -30 + walkBob, 4, 4);
          ctx.fillRect(7, -30 + walkBob, 4, 4);
          ctx.shadowBlur = 0;

          // Draw the Carried Crate hovering securely above the player's head
          const crateY = -48 + walkBob;
          const cw = 16;
          const ch = 8;
          const cDepth = 14;

          // Isometric crate top face
          ctx.beginPath();
          ctx.moveTo(0, crateY - ch);
          ctx.lineTo(cw, crateY);
          ctx.lineTo(0, crateY + ch);
          ctx.lineTo(-cw, crateY);
          ctx.closePath();
          ctx.fillStyle = '#64748b';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Left face
          ctx.beginPath();
          ctx.moveTo(-cw, crateY);
          ctx.lineTo(0, crateY + ch);
          ctx.lineTo(0, crateY + ch + cDepth);
          ctx.lineTo(-cw, crateY + cDepth);
          ctx.closePath();
          ctx.fillStyle = '#475569';
          ctx.fill();
          ctx.stroke();

          // Right face
          ctx.beginPath();
          ctx.moveTo(cw, crateY);
          ctx.lineTo(0, crateY + ch);
          ctx.lineTo(0, crateY + ch + cDepth);
          ctx.lineTo(cw, crateY + cDepth);
          ctx.closePath();
          ctx.fillStyle = '#334155';
          ctx.fill();
          ctx.stroke();

          // Magnetic flux field pulses between clamps and crate
          const fluxPulse = (Math.sin(time * 16) + 1) * 0.5;
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + fluxPulse * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-9, -28 + walkBob);
          ctx.lineTo(-6, crateY + cDepth);
          ctx.moveTo(9, -28 + walkBob);
          ctx.lineTo(6, crateY + cDepth);
          ctx.stroke();

          // Floating mini badge
          ctx.font = 'bold 6px JetBrains Mono, monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText('CARGO', 0, crateY + 1);
        }

        // Jump thruster flame if jumping
        if (!player.isGrounded) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(-3, 14 + walkBob);
          ctx.lineTo(3, 14 + walkBob);
          ctx.lineTo(0, 20 + walkBob + Math.random() * 4);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      },
    });
  }

  // ----------------------------------------------------
  // MOVING ELEVATORS (3D Vertical Lift Platforms)
  // ----------------------------------------------------
  private queueMovingElevators(
    elevators: MovingElevator[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const elev of elevators) {
      const depth = (elev.x + elev.y) * 100 + elev.z * 10 + 15;
      queue.push({
        depth,
        draw: () => {
          const ctx = (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx;
          if (!ctx) return;

          const screen = worldToScreen(elev.x, elev.y, elev.z);
          const baseScreen = worldToScreen(elev.x, elev.y, elev.minZ || 0);
          const halfW = (TILE_WIDTH / 2) * (elev.width || 1.2) * 0.9;
          const halfH = (TILE_HEIGHT / 2) * (elev.depth || 1.2) * 0.9;
          const platformThick = 9;

          ctx.save();

          // 1. Vertical Hydraulic Guide Column / Energy Beams
          if (screen.y < baseScreen.y) {
            // Central piston shaft
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(screen.x - 5, screen.y + platformThick, 10, baseScreen.y - screen.y - platformThick);
            ctx.fill();
            ctx.stroke();

            // Twin laser guide tracks
            const glow = elev.isMoving ? 'rgba(56, 189, 248, 0.7)' : 'rgba(100, 116, 139, 0.35)';
            ctx.strokeStyle = glow;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(screen.x - halfW * 0.65, screen.y + platformThick);
            ctx.lineTo(screen.x - halfW * 0.65, baseScreen.y);
            ctx.moveTo(screen.x + halfW * 0.65, screen.y + platformThick);
            ctx.lineTo(screen.x + halfW * 0.65, baseScreen.y);
            ctx.stroke();
          }

          // 2. Base shadow on ground
          ctx.beginPath();
          ctx.ellipse(baseScreen.x, baseScreen.y, halfW, halfH, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fill();

          // 3. Platform Rim - Left Face
          ctx.beginPath();
          ctx.moveTo(screen.x - halfW, screen.y);
          ctx.lineTo(screen.x, screen.y + halfH);
          ctx.lineTo(screen.x, screen.y + halfH + platformThick);
          ctx.lineTo(screen.x - halfW, screen.y + platformThick);
          ctx.closePath();
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Platform Rim - Right Face
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y + halfH);
          ctx.lineTo(screen.x + halfW, screen.y);
          ctx.lineTo(screen.x + halfW, screen.y + platformThick);
          ctx.lineTo(screen.x, screen.y + halfH + platformThick);
          ctx.closePath();
          ctx.fillStyle = '#334155';
          ctx.fill();
          ctx.stroke();

          // 4. Platform Top Deck (Diamond Plate)
          ctx.beginPath();
          ctx.moveTo(screen.x, screen.y - halfH);
          ctx.lineTo(screen.x + halfW, screen.y);
          ctx.lineTo(screen.x, screen.y + halfH);
          ctx.lineTo(screen.x - halfW, screen.y);
          ctx.closePath();
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // 5. Pulsing Center Energy Reactor Ring
          const pulse = (Math.sin(time * 4) + 1) * 0.5;
          ctx.beginPath();
          ctx.ellipse(screen.x, screen.y, halfW * 0.45, halfH * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + pulse * 0.25})`;
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // 6. Lift Status and Height Display
          ctx.font = 'bold 7px monospace';
          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          const dirSymbol = elev.direction === 1 ? '▲' : '▼';
          ctx.fillText(`LIFT ${dirSymbol} Z:${elev.z.toFixed(1)}`, screen.x, screen.y + 3);

          ctx.restore();
        },
      });
    }
  }

  // ----------------------------------------------------
  // SURFACE HEIGHT HELPER
  // ----------------------------------------------------
  private getSurfaceBelow(
    x: number,
    y: number,
    room: RoomDefinition,
    ignoreCrateId?: string
  ): number {
    let maxHeight = 0;
    const gx = Math.floor(x);
    const gy = Math.floor(y);

    if (gx >= 0 && gx < room.width && gy >= 0 && gy < room.depth) {
      const tile = room.floorGrid[gx]?.[gy];
      maxHeight = tile?.elevation || 0;
    }

    if (room.crates) {
      for (const crate of room.crates) {
        if (crate.id === ignoreCrateId) continue;
        if (
          x >= crate.x - 0.48 * crate.w &&
          x <= crate.x + 0.48 * crate.w &&
          y >= crate.y - 0.48 * crate.d &&
          y <= crate.y + 0.48 * crate.d
        ) {
          const top = crate.z + crate.h;
          if (top > maxHeight) maxHeight = top;
        }
      }
    }

    if (room.movingElevators) {
      for (const elev of room.movingElevators) {
        const halfW = (elev.width || 1.2) * 0.55;
        const halfD = (elev.depth || 1.2) * 0.55;
        if (
          Math.abs(x - elev.x) <= halfW &&
          Math.abs(y - elev.y) <= halfD
        ) {
          if (elev.z > maxHeight) maxHeight = elev.z;
        }
      }
    }

    return maxHeight;
  }

  // ----------------------------------------------------
  // PARTICLES
  // ----------------------------------------------------
  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    ctx.save();
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      const pos = worldToScreen(p.x, p.y, p.vz || 0);
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export const renderer = new IsometricRenderer();
