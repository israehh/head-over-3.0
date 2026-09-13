import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, Folder, Terminal, X } from 'lucide-react';
import JSZip from 'jszip';
import { PYTHON_PROJECT_FILES, PythonFileItem } from '../data/pythonSource';

interface PythonProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonProjectModal: React.FC<PythonProjectModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const zip = new JSZip();

      // Add all files into zip respecting directory structure
      for (const item of PYTHON_PROJECT_FILES) {
        zip.file(item.path, item.code);
      }

      // Generate zip blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'head_over_heels_2_python_pygame.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-mono text-slate-100">
                  Head Over Heels 2.0 // Python + Pygame Source
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Standalone Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modular object-oriented architecture as requested in project specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="download-pygame-zip-btn"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'Packaging...' : 'Download Project (.zip)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: File Navigator */}
          <div className="w-64 sm:w-72 border-r border-slate-800 bg-slate-950/60 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Project Structure
            </div>

            {PYTHON_PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-xs font-mono transition-colors ${
                    isSelected
                      ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileCode
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}

            <div className="mt-4 pt-4 border-t border-slate-800 px-2 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                Quick Run Command
              </span>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 select-all">
                pip install pygame<br />
                python main.py
              </div>
            </div>
          </div>

          {/* Right Main: Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* Active File Header */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-cyan-400 font-bold">{selectedFile.path}</span>
                <span className="text-slate-500">—</span>
                <span className="text-slate-400 text-[11px]">{selectedFile.description}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 bg-slate-950/90 leading-relaxed">
              <pre className="overflow-x-auto whitespace-pre">
                <code>{selectedFile.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
