import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Download, RotateCcw, Skull } from 'lucide-react';
import { GameEngine } from '../engine/gameLoop';

interface EndGameModalProps {
  engine: GameEngine;
  onRestart: () => void;
  onOpenPythonModal: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  engine,
  onRestart,
  onOpenPythonModal,
}) => {
  const isVictory = engine.isVictory;
  const isGameOver = engine.isGameOver;

  useEffect(() => {
    if (isVictory) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#34d399', '#c084fc', '#fbbf24'],
        });
      } catch {}
    }
  }, [isVictory]);

  if (!isVictory && !isGameOver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-center space-y-5">
        {isVictory ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                MISSION ACCOMPLISHED
              </div>
              <h2 className="text-2xl font-bold text-white font-sans mt-1">
                Reality Restored
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                You gathered the energy cells, navigated the security matrices, and engaged the hyperspace extraction portal!
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div>
                <div className="text-slate-500 text-[10px]">SECTORS</div>
                <div className="text-cyan-400 font-bold text-sm">20 / 20</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">FRAGMENTS</div>
                <div className="text-amber-400 font-bold text-sm">
                  {engine.player.nexusFragments?.length || 0} / 5
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">KEYS</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {engine.player.keycards.length}
                </div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">STATUS</div>
                <div className="text-emerald-400 font-bold text-sm">ESCAPED</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)]">
              <Skull className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">
                CRITICAL MALFUNCTION
              </div>
              <h2 className="text-2xl font-bold text-white font-sans mt-1">
                Hull Breached
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                Station defenses overwhelmed your operative systems. Reinitialize from the cryo-dock to try again.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            id="endgame-restart-btn"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold text-sm font-mono transition-all shadow-lg shadow-cyan-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isVictory ? 'PLAY AGAIN' : 'REINITIALIZE OPERATIVE'}</span>
          </button>

          <button
            id="endgame-python-code-btn"
            onClick={onOpenPythonModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Download Python / Pygame Project (.zip)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
