import React from 'react';
import { TransitionAnimationState } from '../types/game';

interface RoomTransitionOverlayProps {
  transition: TransitionAnimationState;
}

const CATEGORY_STYLES: Record<string, { badge: string; accent: string }> = {
  tutorial: { badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50', accent: '#06b6d4' },
  puzzle: { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/50', accent: '#a855f7' },
  storage: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/50', accent: '#f59e0b' },
  energy: { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', accent: '#eab308' },
  security: { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50', accent: '#f43f5e' },
};

export const RoomTransitionOverlay: React.FC<RoomTransitionOverlayProps> = ({ transition }) => {
  if (!transition.active) return null;

  const isFadeOut = transition.phase === 'out';
  // Progress 0 -> 1 during phase out, and 0 -> 1 during phase in
  const opacity = isFadeOut
    ? Math.min(1, transition.progress * 1.5)
    : Math.max(0, 1 - transition.progress * 1.2);

  const style = CATEGORY_STYLES[transition.targetCategory || 'tutorial'] || CATEGORY_STYLES.tutorial;

  // Directional slide transform
  let transformSlide = 'translateY(0)';
  if (transition.direction === 'N') {
    transformSlide = isFadeOut
      ? `translateY(-${transition.progress * 10}%)`
      : `translateY(${(1 - transition.progress) * 10}%)`;
  } else if (transition.direction === 'S') {
    transformSlide = isFadeOut
      ? `translateY(${transition.progress * 10}%)`
      : `translateY(-${(1 - transition.progress) * 10}%)`;
  } else if (transition.direction === 'W') {
    transformSlide = isFadeOut
      ? `translateX(-${transition.progress * 10}%)`
      : `translateX(${(1 - transition.progress) * 10}%)`;
  } else if (transition.direction === 'E') {
    transformSlide = isFadeOut
      ? `translateX(${transition.progress * 10}%)`
      : `translateX(-${(1 - transition.progress) * 10}%)`;
  }

  return (
    <div
      id="room-transition-overlay"
      className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center font-mono overflow-hidden transition-opacity"
      style={{
        opacity,
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Cybernetic Horizontal Scanline */}
      <div
        className="absolute w-full h-[2px] bg-cyan-400/80 shadow-[0_0_12px_#22d3ee] animate-pulse"
        style={{
          top: `${Math.round(transition.progress * 100)}%`,
          transition: 'top 0.05s linear',
        }}
      />

      {/* Sector Announcement Banner */}
      <div
        className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-2xl max-w-md text-center mx-4"
        style={{ transform: transformSlide }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="tracking-widest text-slate-400 uppercase font-bold text-[10px]">
            SECTOR TRANSITION SEQUENCE
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-cyan-200 tracking-tight">
          {transition.targetRoomCode || 'SEC-XX'}
        </div>

        <div className="text-sm font-semibold text-slate-300">
          {transition.targetRoomName || 'Transitioning Sector...'}
        </div>

        {transition.targetCategory && (
          <div className="mt-1">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.badge}`}
            >
              {transition.targetCategory} SECTOR
            </span>
          </div>
        )}

        {/* Shutter Animation Bar */}
        <div className="w-48 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-75"
            style={{ width: `${Math.round(transition.progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
