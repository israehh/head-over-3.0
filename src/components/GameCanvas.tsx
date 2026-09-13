import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, InputState } from '../engine/gameLoop';
import { renderer } from '../engine/renderer';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Zap } from 'lucide-react';

interface GameCanvasProps {
  engine: GameEngine;
  onOpenPause: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onOpenPause }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showTouchControls, setShowTouchControls] = useState(false);

  // Input states
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
    run: false,
    interact: false,
  });

  // Detect mobile or touch capability
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      setShowTouchControls(true);
    }
  }, []);

  // Responsive Canvas Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling on arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = true;
          break;
        case 'Space':
          inputRef.current.jump = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.run = true;
          break;
        case 'KeyE':
        case 'KeyF':
        case 'Enter':
          inputRef.current.interact = true;
          break;
        case 'KeyP':
        case 'Escape':
          onOpenPause();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = false;
          break;
        case 'Space':
          inputRef.current.jump = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputRef.current.run = false;
          break;
        case 'KeyE':
        case 'KeyF':
        case 'Enter':
          inputRef.current.interact = false;
          break;
      }
    };

    const handleBlur = () => {
      // Reset all inputs on window blur
      inputRef.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        jump: false,
        run: false,
        interact: false,
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onOpenPause]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Update engine physics & logic
      engine.update(dt, inputRef.current);

      // Render to Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Expose ctx globally for renderer closures
          (window as unknown as { __currentRenderCtx: CanvasRenderingContext2D }).__currentRenderCtx = ctx;

          renderer.render({
            ctx,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            cameraX: engine.cameraX,
            cameraY: engine.cameraY,
            zoom: 1.0,
            time: engine.time,
            room: engine.currentRoom,
            player: engine.player,
            particles: engine.particles,
            showGrid: engine.settings.showCoordinates,
          });
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [engine]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Canvas Element */}
      <canvas
        id="game-isometric-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full cursor-crosshair"
      />

      {/* CRT Scanline & Vignette Effect */}
      {engine.settings.crtFilter && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), radial-gradient(circle at center, transparent 60%, rgba(0, 0, 0, 0.5) 100%)',
            backgroundSize: '100% 4px, 100% 100%',
          }}
        />
      )}

      {/* Bottom Controls Legend (Desktop) */}
      <div className="absolute bottom-3 left-4 pointer-events-none hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg z-20">
        <span className="text-cyan-400 font-bold">MOVE:</span> WASD / Arrows
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400 font-bold">JUMP:</span> Space
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400 font-bold">RUN:</span> Shift
        <span className="text-slate-600">|</span>
        <span className="text-cyan-400 font-bold">INTERACT:</span> E / F
      </div>

      {/* On-Screen Touch Gamepad Controls (For Mobile / Touch / Quick Click) */}
      <div className="absolute bottom-4 inset-x-4 flex items-end justify-between pointer-events-none z-20">
        {/* Virtual D-Pad */}
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5 p-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl">
          <div />
          <button
            id="touch-dpad-up"
            onPointerDown={() => (inputRef.current.up = true)}
            onPointerUp={() => (inputRef.current.up = false)}
            onPointerLeave={() => (inputRef.current.up = false)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 active:text-white transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            id="touch-dpad-left"
            onPointerDown={() => (inputRef.current.left = true)}
            onPointerUp={() => (inputRef.current.left = false)}
            onPointerLeave={() => (inputRef.current.left = false)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 active:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-950/60 text-[10px] font-mono text-slate-500 font-bold">
            ISO
          </div>
          <button
            id="touch-dpad-right"
            onPointerDown={() => (inputRef.current.right = true)}
            onPointerUp={() => (inputRef.current.right = false)}
            onPointerLeave={() => (inputRef.current.right = false)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 active:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div />
          <button
            id="touch-dpad-down"
            onPointerDown={() => (inputRef.current.down = true)}
            onPointerUp={() => (inputRef.current.down = false)}
            onPointerLeave={() => (inputRef.current.down = false)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 active:text-white transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <div />
        </div>

        {/* Action Buttons (Jump, Run, Interact) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Run Toggle Button */}
          <button
            id="touch-action-run"
            onPointerDown={() => (inputRef.current.run = true)}
            onPointerUp={() => (inputRef.current.run = false)}
            onPointerLeave={() => (inputRef.current.run = false)}
            className="w-12 h-12 flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-amber-600 border border-slate-700 text-slate-200 active:text-white shadow-xl transition-colors"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] font-mono font-bold">RUN</span>
          </button>

          {/* Interact Button */}
          <button
            id="touch-action-act"
            onPointerDown={() => (inputRef.current.interact = true)}
            onPointerUp={() => (inputRef.current.interact = false)}
            onPointerLeave={() => (inputRef.current.interact = false)}
            className="w-12 h-12 flex flex-col items-center justify-center rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-purple-600 border border-slate-700 text-slate-200 active:text-white shadow-xl transition-colors"
          >
            <span className="text-xs font-mono font-bold text-purple-400">ACT</span>
            <span className="text-[9px] font-mono text-slate-400">[E]</span>
          </button>

          {/* Jump Button */}
          <button
            id="touch-action-jump"
            onPointerDown={() => (inputRef.current.jump = true)}
            onPointerUp={() => (inputRef.current.jump = false)}
            onPointerLeave={() => (inputRef.current.jump = false)}
            className="w-14 h-14 flex flex-col items-center justify-center rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 text-white shadow-2xl shadow-cyan-500/40 transition-transform active:scale-95"
          >
            <span className="text-xs font-mono font-black tracking-wider">JUMP</span>
            <span className="text-[9px] opacity-80">[SPACE]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
