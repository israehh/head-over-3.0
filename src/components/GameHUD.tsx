import React from 'react';
import {
  Activity,
  BatteryCharging,
  Compass,
  Download,
  Gem,
  Key,
  Map as MapIcon,
  Pause,
  RotateCcw,
  Save,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { GameSettings, PlayerState, RoomDefinition } from '../types/game';

interface GameHUDProps {
  room: RoomDefinition;
  player: PlayerState;
  settings: GameSettings;
  onToggleSound: () => void;
  onToggleControlMode: () => void;
  onOpenPause: () => void;
  onOpenMap?: () => void;
  onQuickSave?: () => void;
  onOpenPythonModal: () => void;
  onRestart: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  room,
  player,
  settings,
  onToggleSound,
  onToggleControlMode,
  onOpenPause,
  onOpenMap,
  onQuickSave,
  onOpenPythonModal,
  onRestart,
}) => {
  const hasBlue = player.keycards.includes('BLUE') || player.keycards.includes('ALPHA');
  const hasRed = player.keycards.includes('RED') || player.keycards.includes('BETA');
  const hasGreen = player.keycards.includes('GREEN');
  const fragments = player.nexusFragments || [];

  const healthPercent = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const energyPercent = Math.max(0, Math.min(100, (player.energy / player.maxEnergy) * 100));

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none p-3 sm:p-4 flex flex-col gap-2 z-20">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Left: Sector & Status */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400">
                {room.code}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                2.5D ISO 64x32
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hidden sm:inline">
                {room.quadrant}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 font-sans tracking-wide">
              {room.name}
            </h1>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Quick Save */}
          {onQuickSave && (
            <button
              id="hud-quicksave-btn"
              onClick={onQuickSave}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition-all hover:scale-105 active:scale-95"
              title="Quick Save Progress (Ctrl+S / Click)"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* World Map Button */}
          {onOpenMap && (
            <button
              id="hud-map-btn"
              onClick={onOpenMap}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Open 20-Sector World Map Graph (M)"
            >
              <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">MAP (20)</span>
            </button>
          )}

          {/* Python Code & Export Button */}
          <button
            id="hud-python-code-btn"
            onClick={onOpenPythonModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/70 text-xs font-mono font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="View Python + Pygame Architecture & Download .zip"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Python / Pygame</span>
            <span className="sm:hidden">Pygame</span>
          </button>

          {/* Control Mode Toggle */}
          <button
            id="hud-control-mode-btn"
            onClick={onToggleControlMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition-all"
            title="Toggle between Screen-Relative (WASD=Up/Down) or Isometric Directional Movement"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">
              {settings.controlMode === 'screen' ? 'Screen' : 'Isometric'}
            </span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            id="hud-sound-toggle-btn"
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
            title={settings.soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Reboot Room */}
          <button
            id="hud-restart-btn"
            onClick={onRestart}
            className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all"
            title="Reset to Sector 01"
          >
            <RotateCcw className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
          </button>

          {/* Pause / Menu */}
          <button
            id="hud-pause-btn"
            onClick={onOpenPause}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/80 text-xs font-mono font-bold transition-all"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>MENU</span>
          </button>
        </div>
      </div>

      {/* Vital Gauges & Inventory Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Health & Thrusters */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex items-center gap-4 shadow-xl">
          {/* Health Gauge */}
          <div className="flex flex-col gap-1 w-28 sm:w-36">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <Activity className="w-3 h-3 text-rose-400" /> HULL
              </span>
              <span
                className={`font-bold ${
                  healthPercent > 50
                    ? 'text-emerald-400'
                    : healthPercent > 25
                    ? 'text-amber-400'
                    : 'text-rose-400 animate-pulse'
                }`}
              >
                {Math.round(player.health)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-300 ${
                  healthPercent > 50 ? 'bg-emerald-500' : healthPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Energy Gauge */}
          <div className="flex flex-col gap-1 w-24 sm:w-32">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-slate-400">
                <BatteryCharging className="w-3 h-3 text-cyan-400" /> ENERGY
              </span>
              <span className="text-cyan-400 font-bold">{Math.round(player.energy)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{ width: `${energyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Keycards & Collectibles */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 sm:gap-3 shadow-xl flex-wrap">
          {/* Keycard Blue */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              hasBlue
                ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-600'
            }`}
            title={hasBlue ? 'Blue Keycard [Tier 1 Access]' : 'Blue Keycard [Unacquired]'}
          >
            <Key className={`w-3.5 h-3.5 ${hasBlue ? 'text-cyan-400' : 'text-slate-600'}`} />
            <span>BLUE</span>
          </div>

          {/* Keycard Red */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              hasRed
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-600'
            }`}
            title={hasRed ? 'Red Keycard [Tier 2 Reactor Access]' : 'Red Keycard [Unacquired]'}
          >
            <Key className={`w-3.5 h-3.5 ${hasRed ? 'text-rose-400' : 'text-slate-600'}`} />
            <span>RED</span>
          </div>

          {/* Keycard Green */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              hasGreen
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-600'
            }`}
            title={hasGreen ? 'Green Keycard [Tier 3 Master Apex]' : 'Green Keycard [Unacquired]'}
          >
            <Key className={`w-3.5 h-3.5 ${hasGreen ? 'text-emerald-400' : 'text-slate-600'}`} />
            <span>GREEN</span>
          </div>

          {/* Nexus Fragments Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
              fragments.length > 0
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-600'
            }`}
            title={`Nexus Fragments: ${fragments.length}/5 Collected`}
          >
            <Gem className={`w-3.5 h-3.5 ${fragments.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
            <span className="font-bold">{fragments.length}/5</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">FRAGMENTS</span>
          </div>

          {/* Energy Cells Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            <span className="font-bold">{player.energyCells}</span>
            <span className="text-slate-400 text-[10px]">CELLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
