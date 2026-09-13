import React, { useEffect, useReducer, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { Minimap } from './components/Minimap';
import { RoomTransitionOverlay } from './components/RoomTransitionOverlay';
import { PauseModal } from './components/PauseModal';
import { PythonProjectModal } from './components/PythonProjectModal';
import { EndGameModal } from './components/EndGameModal';
import { GameEngine } from './engine/gameLoop';
import { sound } from './audio/soundEffects';

interface ToastNotice {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export default function App() {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }
  const engine = engineRef.current;

  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [pauseModalTab, setPauseModalTab] = useState<'map' | 'inventory' | 'objectives' | 'save' | 'settings'>('map');
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);

  // Setup Notification bridge from engine
  useEffect(() => {
    engine.onNotification = (msg, type = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { id, message: msg, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    // Global Hotkeys (M for map, I for inventory)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setPauseModalTab('map');
        engine.isPaused = true;
        setIsPauseOpen(true);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setPauseModalTab('inventory');
        engine.isPaused = true;
        setIsPauseOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Periodic HUD update for health/energy/room changes
    const hudInterval = setInterval(() => {
      forceUpdate();
    }, 120);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(hudInterval);
    };
  }, [engine]);

  const handleToggleSound = () => {
    const next = !engine.settings.soundEnabled;
    engine.settings.soundEnabled = next;
    sound.setSoundEnabled(next);
    forceUpdate();
  };

  const handleToggleControlMode = () => {
    engine.settings.controlMode = engine.settings.controlMode === 'screen' ? 'isometric' : 'screen';
    engine.onNotification?.(
      `Control Mode: ${engine.settings.controlMode === 'screen' ? 'Screen-Relative (WASD=Up/Down)' : 'Isometric Diagonal'}`,
      'info'
    );
    forceUpdate();
  };

  const handleRestart = () => {
    engine.restartGame();
    forceUpdate();
  };

  const handleQuickSave = () => {
    engine.saveGame();
    forceUpdate();
  };

  const handleOpenMap = () => {
    setPauseModalTab('map');
    engine.isPaused = true;
    setIsPauseOpen(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Heads Up Display */}
      <GameHUD
        room={engine.currentRoom}
        player={engine.player}
        settings={engine.settings}
        onToggleSound={handleToggleSound}
        onToggleControlMode={handleToggleControlMode}
        onOpenPause={() => {
          setPauseModalTab('map');
          engine.isPaused = true;
          setIsPauseOpen(true);
        }}
        onOpenMap={handleOpenMap}
        onQuickSave={handleQuickSave}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onRestart={handleRestart}
      />

      {/* Main Isometric Game Canvas */}
      <GameCanvas
        engine={engine}
        onOpenPause={() => {
          engine.isPaused = !engine.isPaused;
          setIsPauseOpen(engine.isPaused);
        }}
      />

      {/* Room Transition Sequence Overlay */}
      <RoomTransitionOverlay transition={engine.roomNetwork.transitionState} />

      {/* Interactive Minimap Radar */}
      <div className="fixed bottom-3 right-3 z-30">
        <Minimap
          currentRoom={engine.currentRoom}
          onSelectRoom={(roomId) => {
            setPauseModalTab('map');
            engine.isPaused = true;
            setIsPauseOpen(true);
          }}
        />
      </div>

      {/* Floating System Notifications / Cyber Toasts */}
      <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const borderColor =
            toast.type === 'success'
              ? 'border-emerald-500 bg-emerald-950/90 text-emerald-200'
              : toast.type === 'error'
              ? 'border-rose-500 bg-rose-950/90 text-rose-200'
              : toast.type === 'warn'
              ? 'border-amber-500 bg-amber-950/90 text-amber-200'
              : 'border-cyan-500 bg-slate-900/90 text-cyan-200';

          return (
            <div
              key={toast.id}
              className={`px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl font-mono text-xs animate-in slide-in-from-right-4 duration-200 ${borderColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span>{toast.message}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pause Menu & Sector Map Modal */}
      <PauseModal
        isOpen={isPauseOpen}
        onClose={() => {
          engine.isPaused = false;
          setIsPauseOpen(false);
        }}
        engine={engine}
        initialTab={pauseModalTab}
        onOpenPythonModal={() => {
          setIsPauseOpen(false);
          setIsPythonModalOpen(true);
        }}
        onRestart={handleRestart}
      />

      {/* Python + Pygame Source Code & Zip Downloader */}
      <PythonProjectModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />

      {/* End Game / Victory Modal */}
      <EndGameModal
        engine={engine}
        onRestart={handleRestart}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
      />
    </div>
  );
}
