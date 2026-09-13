import {
  CrateEntity,
  Direction,
  DoorEntity,
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
  showGrid?: boolean;
}

export class IsometricRenderer {
  public render(params: RenderContext) {
    const { ctx, canvasWidth, canvasHeight, cameraX, cameraY, zoom, time, room, player, particles } = params;

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

    // 6. Queue patrol drones
    this.queueDrones(room.drones, renderQueue, time);

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

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, halfW, halfH, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = isDown ? '#10b981' : '#f59e0b';
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

          const p1 = worldToScreen(laser.startX, laser.startY, laser.z);
          const p2 = worldToScreen(laser.endX, laser.endY, laser.z);

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

          // Emitter posts
          [p1, p2].forEach((pt) => {
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
  // PATROL & GUARDIAN DRONES (Enemies)
  // ----------------------------------------------------
  private queueDrones(
    drones: PatrolDrone[],
    queue: { depth: number; draw: () => void }[],
    time: number
  ) {
    for (const drone of drones) {
      const bob = Math.sin(time * 5 + drone.bobOffset) * 4;
      const depth = (drone.x + drone.y) * 100 + drone.z * 10 + 40;
      const isGuardian = drone.type === 'guardian';
      const isChasing = drone.isChasing ?? false;

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
          ctx.ellipse(ground.x, ground.y, isGuardian ? 18 : 14, isGuardian ? 9 : 7, 0, 0, Math.PI * 2);
          ctx.fillStyle = isChasing ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 0, 0, 0.4)';
          ctx.fill();

          ctx.save();
          if (isGuardian) {
            // Aggressive Crimson Guardian Chassis
            ctx.fillStyle = '#450a0a';
            ctx.strokeStyle = isChasing ? '#ef4444' : '#f87171';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Octagonal cyber fortress chassis
            ctx.arc(pos.x, py, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Blinking Alert Beacon on top
            const beaconColor = isChasing ? '#ff0033' : '#ea580c';
            ctx.fillStyle = beaconColor;
            ctx.shadowColor = beaconColor;
            ctx.shadowBlur = isChasing ? 16 : 8;
            ctx.beginPath();
            ctx.arc(pos.x, py - 14, 4, 0, Math.PI * 2);
            ctx.fill();

            // Hunter Sensor Eye
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(pos.x, py, 6, 0, Math.PI * 2);
            ctx.fill();

            // Twin Heavy Weapon Pods
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(pos.x - 20, py - 4, 6, 8);
            ctx.fillRect(pos.x + 14, py - 4, 6, 8);

            // Thruster flames (high energy orange/red)
            ctx.fillStyle = '#f97316';
            ctx.fillRect(pos.x - 19, py + 4, 4, 5 + Math.random() * 5);
            ctx.fillRect(pos.x + 15, py + 4, 4, 5 + Math.random() * 5);
          } else {
            // Standard Patrol Drone Chassis (Hexagonal cyber sphere)
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pos.x, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rotating scanner eye (Red / Crimson warning)
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
