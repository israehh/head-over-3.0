import React, { useState } from 'react';
import {
  Compass,
  Eye,
  MapPin,
  Maximize2,
  Minimize2,
  Shield,
  Zap,
  Box,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { roomNetwork } from '../engine/roomNetwork';
import { RoomCategory, RoomDefinition } from '../types/game';

interface MinimapProps {
  currentRoom: RoomDefinition;
  discoveredRooms?: Set<string>;
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

export const Minimap: React.FC<MinimapProps> = ({
  currentRoom,
  discoveredRooms,
  onSelectRoom,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const discovered = discoveredRooms || roomNetwork.discoveredRooms;
  const allRooms = roomNetwork.roomsState;
  const totalRoomsCount = Object.keys(allRooms).length || 53;

  // Station layout: Nexus Hub, Wings B & C, and Sectors 1-20
  const rows: { cat: RoomCategory; label: string; subLabel: string; roomIds: string[] }[] = [
    {
      cat: 'vertical',
      label: 'CORE NEXUS HUB',
      subLabel: 'GRAND ATRIUM',
      roomIds: ['sector_00'],
    },
    {
      cat: 'storage',
      label: 'WING B (CARGO & CRYO)',
      subLabel: 'SECTORS 21–27',
      roomIds: ['sector_21', 'sector_22', 'sector_23', 'sector_24', 'sector_25', 'sector_26', 'sector_27'],
    },
    {
      cat: 'energy',
      label: 'WING C (REACTOR & GRID)',
      subLabel: 'SECTORS 28–34',
      roomIds: ['sector_28', 'sector_29', 'sector_30', 'sector_31', 'sector_32', 'sector_33', 'sector_34'],
    },
    {
      cat: 'puzzle',
      label: 'WING D (STACKING YARDS)',
      subLabel: 'SECTORS 35–44',
      roomIds: ['sector_35', 'sector_36', 'sector_37', 'sector_38', 'sector_39', 'sector_40', 'sector_41', 'sector_42', 'sector_43', 'sector_44'],
    },
    {
      cat: 'puzzle',
      label: 'HIDDEN SECRET VAULTS',
      subLabel: 'SECTORS 45–49',
      roomIds: ['sector_45', 'sector_46', 'sector_47', 'sector_48', 'sector_49'],
    },
    {
      cat: 'vertical',
      label: 'EXPRESS BYPASS SHORTCUTS',
      subLabel: 'SECTORS 50–52',
      roomIds: ['sector_50', 'sector_51', 'sector_52'],
    },
    {
      cat: 'tutorial',
      label: '01. TUTORIAL',
      subLabel: 'SECTORS 01–04',
      roomIds: ['sector_01', 'sector_02', 'sector_03', 'sector_04'],
    },
    {
      cat: 'puzzle',
      label: '02. PUZZLE',
      subLabel: 'SECTORS 05–08',
      roomIds: ['sector_05', 'sector_06', 'sector_07', 'sector_08'],
    },
    {
      cat: 'storage',
      label: '03. STORAGE',
      subLabel: 'SECTORS 09–12',
      roomIds: ['sector_09', 'sector_10', 'sector_11', 'sector_12'],
    },
    {
      cat: 'energy',
      label: '04. ENERGY',
      subLabel: 'SECTORS 13–16',
      roomIds: ['sector_13', 'sector_14', 'sector_15', 'sector_16'],
    },
    {
      cat: 'security',
      label: '05. SECURITY',
      subLabel: 'SECTORS 17–20',
      roomIds: ['sector_17', 'sector_18', 'sector_19', 'sector_20'],
    },
  ];

  const totalDiscovered = discovered.size;
  const hoveredRoom = hoveredRoomId ? allRooms[hoveredRoomId] : null;

  return (
    <div
      id="hud-station-minimap"
      className={`transition-all duration-300 pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-cyan-900/60 rounded-xl shadow-2xl overflow-hidden font-mono ${
        isCollapsed
          ? 'w-[200px] sm:w-[220px]'
          : isExpanded
          ? 'w-[360px] sm:w-[440px]'
          : 'w-[200px] sm:w-[240px]'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-cyan-900/40 text-xs select-none">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
          title={isCollapsed ? 'Expand Radar (Click to open map)' : 'Minimize Radar'}
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span className="font-bold tracking-wider text-cyan-300">RADAR</span>
          <span className="text-[10px] text-slate-400 font-semibold">
            [{totalDiscovered}/{totalRoomsCount}]
          </span>
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          )}
        </button>

        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse Radar Grid' : 'Expand Station Map'}
              className="p-1 hover:bg-cyan-950/60 text-slate-400 hover:text-cyan-300 rounded transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Grid Layout of Station Rooms */}
          <div className="p-2.5 space-y-1.5 max-h-[360px] overflow-y-auto">
        {rows.map((rowInfo) => {
          const gridColsClass = rowInfo.roomIds.length === 1 ? 'grid-cols-1' : rowInfo.roomIds.length > 4 ? (isExpanded ? 'grid-cols-7' : 'grid-cols-4') : 'grid-cols-4';

          return (
            <div key={rowInfo.label} className="space-y-0.5">
              {isExpanded && (
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold px-1 flex items-center justify-between">
                  <span>{rowInfo.label}</span>
                  <span className="text-[8px] text-slate-500">
                    {rowInfo.subLabel}
                  </span>
                </div>
              )}
              <div className={`grid ${gridColsClass} gap-1.5`}>
                {rowInfo.roomIds.map((roomId) => {
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
                            {room?.code || roomId.replace('sector_', 'S-')}
                          </span>
                          {isExpanded && (
                            <span className="text-[8px] text-slate-400 truncate max-w-[90%] text-center">
                              {isCurrent ? '● ACTIVE' : room?.name || roomId}
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
        </>
      )}
    </div>
  );
};
