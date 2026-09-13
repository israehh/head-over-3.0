import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Compass,
  Copy,
  Download,
  FileText,
  Gem,
  Key,
  Layers,
  Map as MapIcon,
  MapPin,
  Play,
  RotateCcw,
  Save,
  ShieldAlert,
  Tv,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { ALL_ROOMS } from '../data/rooms';
import { GameEngine } from '../engine/gameLoop';

interface PauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine;
  initialTab?: 'map' | 'inventory' | 'objectives' | 'save' | 'settings';
  onOpenPythonModal: () => void;
  onRestart: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onClose,
  engine,
  initialTab = 'map',
  onOpenPythonModal,
  onRestart,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'inventory' | 'objectives' | 'save' | 'settings'>(initialTab);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('ALL');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentRoomId = engine.currentRoom.id;
  const player = engine.player;
  const keycards = player.keycards || [];
  const fragments = player.nexusFragments || [];
  const energyCells = player.energyCells;

  const hasBlue = keycards.includes('BLUE') || keycards.includes('ALPHA');
  const hasRed = keycards.includes('RED') || keycards.includes('BETA');
  const hasGreen = keycards.includes('GREEN');

  const allRoomsList = Object.values(ALL_ROOMS);
  const filteredRooms = selectedQuadrant === 'ALL'
    ? allRoomsList
    : allRoomsList.filter((r) => r.quadrant.toUpperCase().includes(selectedQuadrant));

  const nexusFragmentLore = [
    { id: 1, name: 'Fragment I: Cryo Matrix', sector: 'SEC-04 (Apex Vault)', quadrant: 'Alpha' },
    { id: 2, name: 'Fragment II: Fusion Core', sector: 'SEC-08 (Reactor Core)', quadrant: 'Beta' },
    { id: 3, name: 'Fragment III: Cybernetic Overmind', sector: 'SEC-12 (AI Sub-Brain)', quadrant: 'Gamma' },
    { id: 4, name: 'Fragment IV: Graviton Dynamo', sector: 'SEC-16 (Hangar Sump)', quadrant: 'Delta' },
    { id: 5, name: 'Fragment V: Chrono Resonance', sector: 'SEC-19 (Sanctum Antechamber)', quadrant: 'Omega' },
  ];

  const handleExportJson = () => {
    const jsonStr = engine.exportSaveJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoh2_station_save_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    const jsonStr = engine.exportSaveJson();
    navigator.clipboard.writeText(jsonStr);
  };

  const handleImportSubmit = () => {
    if (!importJsonText.trim()) return;
    const ok = engine.importSaveJson(importJsonText.trim());
    if (ok) {
      setShowImportBox(false);
      setImportJsonText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            <div>
              <h2 className="text-base font-bold font-mono text-slate-100 tracking-wider">
                STATION OVERMIND // TERMINAL
              </h2>
              <span className="text-[11px] font-mono text-cyan-400">
                CURRENT SECTOR: {engine.currentRoom.code} - {engine.currentRoom.name} [{engine.currentRoom.quadrant}]
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Terminal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'map'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>WORLD MAP (20)</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'inventory'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gem className="w-3.5 h-3.5" />
            <span>INVENTORY & FRAGMENTS ({fragments.length}/5)</span>
          </button>

          <button
            onClick={() => setActiveTab('objectives')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'objectives'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>OBJECTIVES</span>
          </button>

          <button
            onClick={() => setActiveTab('save')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'save'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE & LOAD</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>SYSTEM</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. WORLD MAP TAB */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              {/* Quadrant Filters */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                  <span className="text-slate-500 mr-1 text-[11px]">QUADRANT:</span>
                  {['ALL', 'ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuadrant(q)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        selectedQuadrant === q
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" /> Current
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Gem className="w-3 h-3" /> Fragment Sector
                  </span>
                </div>
              </div>

              {/* 20-Room Graph Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredRooms.map((r) => {
                  const isCurrent = r.id === currentRoomId;
                  const hasFragInRoom = r.items.some((i) => i.type === 'nexus_fragment');
                  const fragItem = r.items.find((i) => i.type === 'nexus_fragment');
                  const fragCollected = fragItem ? player.nexusFragments?.includes(fragItem.fragmentId || 1) : false;

                  return (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {r.code}
                          </span>
                          <h4 className="text-xs font-bold text-slate-200">{r.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasFragInRoom && (
                            <span
                              className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                fragCollected
                                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                                  : 'bg-amber-950/70 border-amber-500/70 text-amber-300 animate-pulse'
                              }`}
                              title={fragCollected ? 'Nexus Fragment Recovered' : 'Nexus Fragment Present'}
                            >
                              <Gem className="w-2.5 h-2.5" />
                              {fragCollected ? 'COLLECTED' : 'FRAGMENT'}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                              <MapPin className="w-2.5 h-2.5" /> YOU
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 mb-2">
                        Sector Type: <span className="text-cyan-300 uppercase font-semibold">{r.category || 'Standard'}</span>
                        <span className="mx-2">•</span>
                        Quadrant: <span className="text-slate-300">{r.quadrant}</span>
                        {r.drones.length > 0 && (
                          <span className="ml-2 text-rose-400">
                            • {r.drones.some((d) => d.type === 'guardian') ? 'Guardian Drone Active' : `${r.drones.length} Patrol Drones`}
                          </span>
                        )}
                        {r.lasers.length > 0 && (
                          <span className="ml-2 text-amber-400">
                            • {r.lasers.length} Laser Grid
                          </span>
                        )}
                      </div>

                      {/* Compass Exits (N/S/E/W) */}
                      {r.exits && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-1.5 flex-wrap">
                          <span className="text-slate-500 font-bold">COMPASS EXITS:</span>
                          {r.exits.north && <span className="text-cyan-400 font-semibold">▲ N ({ALL_ROOMS[r.exits.north]?.code || r.exits.north})</span>}
                          {r.exits.south && <span className="text-cyan-400 font-semibold">▼ S ({ALL_ROOMS[r.exits.south]?.code || r.exits.south})</span>}
                          {r.exits.west && <span className="text-cyan-400 font-semibold">◀ W ({ALL_ROOMS[r.exits.west]?.code || r.exits.west})</span>}
                          {r.exits.east && <span className="text-cyan-400 font-semibold">▶ E ({ALL_ROOMS[r.exits.east]?.code || r.exits.east})</span>}
                        </div>
                      )}

                      {/* Exits & Doors Graph */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.doors.map((door) => {
                          const target = ALL_ROOMS[door.leadsToRoom || ''];
                          const targetLabel = target ? target.code : door.leadsToRoom;
                          const reqKey = door.requiredKeycard;
                          return (
                            <span
                              key={door.id}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                reqKey === 'BLUE'
                                  ? 'bg-cyan-950/60 border-cyan-800/80 text-cyan-300'
                                  : reqKey === 'RED'
                                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                                  : reqKey === 'GREEN'
                                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                                  : door.leadsToRoom === 'sector_20'
                                  ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold'
                                  : 'bg-slate-900 border-slate-700/60 text-slate-400'
                              }`}
                            >
                              <span>→ {targetLabel}</span>
                              {reqKey && <span className="text-[9px] opacity-80">[{reqKey}]</span>}
                              {door.leadsToRoom === 'sector_20' && <span className="text-[9px] opacity-90">[5x FRAGS]</span>}
                            </span>
                          );
                        })}

                        {/* Elevator connections */}
                        {r.elevators && r.elevators.map((elev) => {
                          const target = ALL_ROOMS[elev.targetRoomId];
                          return (
                            <span
                              key={elev.id}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 flex items-center gap-1"
                            >
                              <span>▲ LIFT → {target ? target.code : elev.targetRoomId}</span>
                            </span>
                          );
                        })}

                        {/* Teleporters */}
                        {r.teleporters && r.teleporters.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-700/60 text-purple-300">
                            ⚛ Quantum Beam Relay
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. INVENTORY & FRAGMENTS TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Security Keycards Section */}
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Security Access Keycards
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Blue Keycard */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasBlue
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-cyan-400">BLUE KEYCARD</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
                        Tier 1
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Clearance: Auxiliary & Sub-systems</p>
                    <p className="text-[11px] text-slate-500 mt-1">Found in Alpha Quadrant (Sector 02 / Catwalk)</p>
                    <div className="mt-2 text-[10px] font-mono">
                      Status: {hasBlue ? <span className="text-emerald-400 font-bold">VERIFIED</span> : <span className="text-slate-500">LOCKED</span>}
                    </div>
                  </div>

                  {/* Red Keycard */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasRed
                        ? 'bg-rose-950/60 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-rose-400">RED KEYCARD</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700/60 text-rose-300">
                        Tier 2
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Clearance: Reactor & Hangar Gates</p>
                    <p className="text-[11px] text-slate-500 mt-1">Found in Beta Quadrant (Sector 07 / Conduit)</p>
                    <div className="mt-2 text-[10px] font-mono">
                      Status: {hasRed ? <span className="text-emerald-400 font-bold">VERIFIED</span> : <span className="text-slate-500">LOCKED</span>}
                    </div>
                  </div>

                  {/* Green Keycard */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      hasGreen
                        ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-emerald-400">GREEN KEYCARD</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                        Tier 3 Master
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Clearance: Omega Sanctum & High Security</p>
                    <p className="text-[11px] text-slate-500 mt-1">Found in Delta Quadrant (Sector 15 / Defense)</p>
                    <div className="mt-2 text-[10px] font-mono">
                      Status: {hasGreen ? <span className="text-emerald-400 font-bold">VERIFIED</span> : <span className="text-slate-500">LOCKED</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nexus Fragments Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5" /> Quantum Nexus Fragments ({fragments.length} / 5)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Required to unlock Sector 20 (Overmind Apex)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {nexusFragmentLore.map((frag) => {
                    const isRecovered = fragments.includes(frag.id);
                    return (
                      <div
                        key={frag.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          isRecovered
                            ? 'bg-amber-950/40 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                            isRecovered
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-600 border border-slate-700'
                          }`}
                        >
                          {frag.id === 1 ? 'I' : frag.id === 2 ? 'II' : frag.id === 3 ? 'III' : frag.id === 4 ? 'IV' : 'V'}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-slate-200">{frag.name}</h4>
                          <p className="text-[11px] text-slate-400">{frag.sector}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
                            {isRecovered ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> RECOVERED & HARMONIZED
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-1">
                                <Circle className="w-3 h-3" /> UNACQUIRED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plasma Cells & Power Reservoir */}
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Zap className="w-4 h-4 fill-emerald-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Plasma Energy Cells</h4>
                    <p className="text-[11px] text-slate-400">Power source needed to fuel the Sector 20 extraction warp</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">{energyCells} Cells</div>
                  <div className="text-[10px] font-mono text-slate-500">Min. 3 required</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. OBJECTIVES TAB */}
          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Operational Protocols
              </h3>
              <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 font-mono text-xs">
                {/* 1. Keycards */}
                <div className="flex items-start gap-3">
                  {hasBlue && hasRed && hasGreen ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">
                      Phase 1: Acquire Security Keycards (Blue, Red, Green)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clearance levels grant transit through locked blast doors between station quadrants.
                    </p>
                  </div>
                </div>

                {/* 2. Nexus Fragments */}
                <div className="flex items-start gap-3">
                  {fragments.length >= 5 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">
                      Phase 2: Recover all 5 Quantum Nexus Fragments ({fragments.length}/5)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Hidden in deep vaults across Alpha, Beta, Gamma, Delta, and Omega sectors.
                    </p>
                  </div>
                </div>

                {/* 3. Energy Cells */}
                <div className="flex items-start gap-3">
                  {energyCells >= 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">
                      Phase 3: Gather Plasma Energy Cells ({energyCells}/3)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Required to ignite the trans-dimensional extraction drive.
                    </p>
                  </div>
                </div>

                {/* 4. Overmind Gateway */}
                <div className="flex items-start gap-3">
                  {engine.isVictory ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-200">
                      Phase 4: Breach Sector 20 (AI Overmind Apex) & Escape
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Reach Sector 19 with all 5 fragments to trigger the gateway unseal protocol.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SAVE & LOAD TAB */}
          {activeTab === 'save' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Station Memory Slot & Save Data
              </h3>

              {/* Quick Save / Load Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Quick Save Slot</h4>
                    <p className="text-[11px] text-slate-400">Stores full station state, inventory, and puzzles to local storage.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => engine.saveGame()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-colors shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Game
                    </button>
                    <button
                      onClick={() => engine.loadGame()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono transition-colors shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5" /> Load Game
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">JSON File Export / Import</h4>
                    <p className="text-[11px] text-slate-400">Back up or share your save state as a portable JSON file.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportJson}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                      title="Download .json file"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" /> Export File
                    </button>
                    <button
                      onClick={() => setShowImportBox(!showImportBox)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" /> Import JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Box */}
              {showImportBox && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-700/60 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">Paste Station Save JSON</span>
                    <button
                      onClick={() => setShowImportBox(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    rows={4}
                    placeholder="Paste JSON save state here..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleImportSubmit}
                      className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
                    >
                      Apply & Load State
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. SYSTEM SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Station System Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Control Scheme */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Control Mode</span>
                    <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                      {engine.settings.controlMode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Screen mode maps W to screen-up, S to screen-down. Isometric mode aligns W with diagonal NE.
                  </p>
                  <button
                    onClick={() => {
                      engine.settings.controlMode = engine.settings.controlMode === 'screen' ? 'isometric' : 'screen';
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    Switch to {engine.settings.controlMode === 'screen' ? 'Isometric' : 'Screen-Relative'}
                  </button>
                </div>

                {/* Audio Engine */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Synthesizer Audio</span>
                    <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                      {engine.settings.soundEnabled ? 'ENABLED' : 'MUTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time Web Audio synthesizer for footstep reverberations, laser buzzes, and alert sirens.
                  </p>
                  <button
                    onClick={() => {
                      engine.settings.soundEnabled = !engine.settings.soundEnabled;
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    {engine.settings.soundEnabled ? 'Mute Audio Engine' : 'Unmute Audio Engine'}
                  </button>
                </div>

                {/* CRT Scanline Filter */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">CRT Monitor Filter</span>
                    <span className="text-xs font-mono text-amber-400 uppercase font-semibold">
                      {engine.settings.crtFilter ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Applies vintage retro scanlines and phosphor curvature to the 64x32 viewport.
                  </p>
                  <button
                    onClick={() => {
                      engine.settings.crtFilter = !engine.settings.crtFilter;
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    Toggle CRT Filter
                  </button>
                </div>

                {/* Coordinate Overlay */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Coordinate Overlay</span>
                    <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                      {engine.settings.showCoordinates ? 'VISIBLE' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Displays isometric (X, Y, Z) coordinates and painter's depth tags for debugging.
                  </p>
                  <button
                    onClick={() => {
                      engine.settings.showCoordinates = !engine.settings.showCoordinates;
                    }}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
                  >
                    Toggle Coordinates Overlay
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onOpenPythonModal}
            className="flex items-center gap-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Download className="w-4 h-4" /> Python / Pygame Architecture
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRestart();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" /> RESUME GAME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
