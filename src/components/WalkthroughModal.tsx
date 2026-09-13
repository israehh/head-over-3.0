import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  Printer,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { WALKTHROUGH_CONTENT_ES } from '../utils/walkthroughData';
import {
  downloadWalkthroughMarkdown,
  downloadWalkthroughTxt,
  printOrSaveAsPdf,
} from '../utils/walkthroughExport';

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalkthroughModal: React.FC<WalkthroughModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(WALKTHROUGH_CONTENT_ES);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredContent = searchFilter.trim()
    ? WALKTHROUGH_CONTENT_ES.split('\n')
        .filter((line) => line.toLowerCase().includes(searchFilter.toLowerCase()))
        .join('\n')
    : WALKTHROUGH_CONTENT_ES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-1.5">
                  <span>Guía Oficial de Estrategia</span>
                  <span className="text-cyan-400 font-normal">// Walkthrough Descargable</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  A4 / PDF / TXT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Solución sector por sector (00-52), 15 Fragmentos Nexus, Tarjetas, Salas Secretas y Atajos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download TXT */}
            <button
              id="download-walkthrough-txt-btn"
              onClick={() => downloadWalkthroughTxt()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-mono font-bold shadow-md shadow-cyan-600/30 transition-all hover:scale-105 active:scale-95"
              title="Descargar Guía Completa en archivo de texto (.txt)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .TXT</span>
            </button>

            {/* Download Markdown */}
            <button
              id="download-walkthrough-md-btn"
              onClick={() => downloadWalkthroughMarkdown()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-mono font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              title="Descargar Guía en Markdown (.md)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Descargar .MD</span>
            </button>

            {/* Print / Save PDF */}
            <button
              id="print-walkthrough-pdf-btn"
              onClick={printOrSaveAsPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-mono font-bold shadow-md shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
              title="Abrir vista de impresión y guardar como PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {/* Copy Clipboard */}
            <button
              id="copy-walkthrough-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
            </button>
          </div>

          {/* Search in Guide */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar sector, fragmento..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-44 sm:w-60"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/95 font-mono text-xs text-slate-300 select-text leading-relaxed">
          <pre className="whitespace-pre-wrap font-mono font-normal">
            {filteredContent}
          </pre>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Documento Oficial Certificado: Estación Orbital Nexus</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/walkthrough_official_es.txt"
              download="Guia_Oficial_Head_Over_Heels_2.txt"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Enlace directo .txt
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
