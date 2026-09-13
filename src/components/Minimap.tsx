import React, { useState } from 'react';
import { Compass, Eye, MapPin, Maximize2, Minimize2, Shield, Zap, Box, HelpCircle, Layers } from 'lucide-react';
import { roomNetwork } from '../engine/roomNetwork';
import { RoomCategory, RoomDefinition } from '../types/game';

interface MinimapProps {
  currentRoom: RoomDefinition;
  onSelectRoom?: (roomId: string) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<
  RoomCategory,
  { bg: string; text: string; border: string; glow: string; label: string }
> = {
  tutorial: {
    bg: 'bg-cyan-950/70',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    glow: 'rgba(6, 182, 212, 0.4)',
    label: 'Tutorial',
  },
  puzzle: {
    bg: 'bg-purple-950/70',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    glow: 'rgba(168, 85, 247, 0.4)',
    label: 'Puzzle',
  },
  storage: {
    bg: 'bg-amber-950/70',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    glow: 'rgba(245, 158, 11, 0.4)',
    label: 'Storage',
  },
  energy: {
    bg: 'bg-yellow-950/70',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    glow: 'rgba(234, 179, 8, 0.4)',
    label: 'Energy',
  },
  security: {
    bg: 'bg-rose-950/70',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    glow: 'rgba(244, 63, 94, 0.4)',
    label: 'Security',
  },
  vertical: {
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'rgba(16, 185, 129, 0.4)',
    label: 'Vertical',
  },
};

export const Minimap: React.FC<MinimapProps> = ({ currentRoom, onSelectRoom, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const discovered = roomNetwork.discoveredRooms;
  const allRooms = roomNetwork.roomsState;
  const totalRoomsCount = Object.keys(allRooms).length || 29;

  // Station layout: Rows 0-4 = Sectors 1-20 (4 rooms each), Row 5 = Vertical Sector (9 rooms)
  const rows = [
    { cat: 'tutorial' as RoomCategory, label: '01. TUTORIAL', start: 1, count: 4 },
    { cat: 'puzzle' as RoomCategory, label: '02. PUZZLE', start: 5, count: 4 },
    { cat: 'storage' as RoomCategory, label: '03. STORAGE', start: 9, count: 4 },
    { cat: 'energy' as RoomCategory, label: '04. ENERGY', start: 13, count: 4 },
    { cat: 'security' as RoomCategory, label: '05. SECURITY', start: 17, count: 4 },
    { cat: 'vertical' as RoomCategory, label: '06. VERTICAL (Z-AXIS)', start: 21, count: 9 },
  ];

  const totalDiscovered = discovered.size;
  const hoveredRoom = hoveredRoomId ? allRooms[hoveredRoomId] : null;

  return (
    <div
      id="hud-station-minimap"
      className={`transition-all duration-300 pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-cyan-900/60 rounded-xl shadow-2xl overflow-hidden font-mono ${
        isExpanded ? 'w-[360px] sm:w-[440px]' : 'w-[200px] sm:w-[240px]'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-cyan-900/40 text-xs">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span className="font-bold tracking-wider text-cyan-300">STATION RADAR</span>
          <span className="text-[10px] text-slate-500">
            [{totalDiscovered}/{totalRoomsCount}]
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse Radar' : 'Expand Station Map'}
          className="p-1 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 rounded transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Grid Layout of Station Rooms */}
      <div className="p-2.5 space-y-1.5 max-h-[360px] overflow-y-auto">
        {rows.map((rowInfo) => {
          const roomNumbers = Array.from({ length: rowInfo.count }, (_, i) => rowInfo.start + i);
          const gridColsClass = rowInfo.count > 4 ? (isExpanded ? 'grid-cols-5' : 'grid-cols-3') : 'grid-cols-4';

          return (
            <div key={rowInfo.cat} className="space-y-0.5">
              {isExpanded && (
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1 flex items-center justify-between">
                  <span>{rowInfo.label}</span>
                  <span className="text-[8px] text-slate-500">
                    SECTORS {rowInfo.start}–{rowInfo.start + rowInfo.count - 1}
                  </span>
                </div>
              )}
              <div className={`grid ${gridColsClass} gap-1.5`}>
                {roomNumbers.map((roomNum) => {
                  const roomId = `sector_${roomNum < 10 ? '0' + roomNum : roomNum}`;
                  const room = allRooms[roomId];
                  const isCurrent = room?.id === currentRoom.id;
                  const isDiscovered = discovered.has(roomId);
                  const cat = room?.category || rowInfo.cat;
                  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.tutorial;

                  const exits = room?.exits || {};

                  return (
                    <div
                      key={roomId}
                      onMouseEnter={() => setHoveredRoomId(roomId)}
                      onMouseLeave={() => setHoveredRoomId(null)}
                      onClick={() => onSelectRoom?.(roomId)}
                      className={`relative flex flex-col items-center justify-center rounded transition-all cursor-pointer select-none ${
                        isExpanded ? 'h-11' : 'h-7'
                      } ${
                        isCurrent
                          ? 'ring-2 ring-cyan-400 bg-cyan-950/90 shadow-[0_0_12px_rgba(6,182,212,0.6)] z-10'
                          : isDiscovered
                          ? `${colors.bg} border ${colors.border} hover:brightness-125`
                          : 'bg-slate-900/40 border border-slate-800/60 opacity-40 hover:opacity-60'
                      }`}
                    >
                      {/* Compass Exit Indicators (N, S, E, W) */}
                      {isDiscovered && exits.north && (
                        <div
                          title="North Exit Available"
                          className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-2 h-[2px] bg-cyan-400 shadow-[0_0_4px_#22d3ee] rounded-full"
                        />
                      )}
                      {isDiscovered && exits.south && (
                        <div
                          title="South Exit Available"
                          className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-2 h-[2px] bg-cyan-400 shadow-[0_0_4px_#22d3ee] rounded-full"
                        />
                      )}
                      {isDiscovered && exits.west && (
                        <div
                          title="West Exit Available"
                          className="absolute top-1/2 -left-[2px] -translate-y-1/2 h-2 w-[2px] bg-cyan-400 shadow-[0_0_4px_#22d3ee] rounded-full"
                        />
                      )}
                      {isDiscovered && exits.east && (
                        <div
                          title="East Exit Available"
                          className="absolute top-1/2 -right-[2px] -translate-y-1/2 h-2 w-[2px] bg-cyan-400 shadow-[0_0_4px_#22d3ee] rounded-full"
                        />
                      )}

                      {/* Content */}
                      {isDiscovered ? (
                        <div className="flex flex-col items-center justify-center w-full h-full px-0.5">
                          <span
                            className={`font-bold tracking-tighter ${
                              isCurrent ? 'text-cyan-200' : colors.text
                            } ${isExpanded ? 'text-xs' : 'text-[10px]'}`}
                          >
                            {roomNum < 10 ? `0${roomNum}` : roomNum}
                          </span>
                          {isExpanded && (
                            <span className="text-[8px] text-slate-400 truncate max-w-[90%] text-center">
                              {isCurrent ? '● ACTIVE' : room?.code || `S-${roomNum}`}
                            </span>
                          )}
                          {isCurrent && (
                            <div className="absolute inset-0 border border-cyan-300 rounded animate-pulse pointer-events-none" />
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600">
                          <span className="text-[9px] font-mono">?</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hovered / Current Room Detail Inspection */}
      {isExpanded && (
        <div className="p-2.5 bg-slate-900/90 border-t border-cyan-900/40 text-[11px] space-y-1.5">
          {hoveredRoom ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 truncate max-w-[240px]">
                  {hoveredRoom.name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {hoveredRoom.category?.toUpperCase() || 'SECTOR'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                {hoveredRoom.description}
              </p>
              {/* Exits list */}
              <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                <span className="text-slate-500 font-bold">EXITS:</span>
                <span className={hoveredRoom.exits?.north ? 'text-cyan-400' : 'text-slate-700'}>
                  ▲ N
                </span>
                <span className={hoveredRoom.exits?.south ? 'text-cyan-400' : 'text-slate-700'}>
                  ▼ S
                </span>
                <span className={hoveredRoom.exits?.west ? 'text-cyan-400' : 'text-slate-700'}>
                  ◀ W
                </span>
                <span className={hoveredRoom.exits?.east ? 'text-cyan-400' : 'text-slate-700'}>
                  ▶ E
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Current: <strong className="text-cyan-300">{currentRoom.code}</strong></span>
              </div>
              <span className="text-slate-500 text-[9px]">Hover room for tactical intel</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info & Category Legend */}
      <div className="px-2.5 py-1.5 bg-slate-950 border-t border-cyan-900/30 flex items-center justify-between text-[9px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
          <span>CURRENT: <strong className="text-cyan-300">{currentRoom.code}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-cyan-400" title="Tutorial">●</span>
          <span className="text-purple-400" title="Puzzle">●</span>
          <span className="text-amber-400" title="Storage">●</span>
          <span className="text-yellow-400" title="Energy">●</span>
          <span className="text-rose-400" title="Security">●</span>
          <span className="text-emerald-400" title="Vertical">●</span>
        </div>
      </div>
    </div>
  );
};
