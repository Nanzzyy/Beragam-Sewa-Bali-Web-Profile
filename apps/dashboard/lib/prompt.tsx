import { createRoot } from 'react-dom/client';
import { Edit2, X } from 'lucide-react';
import React, { useState } from 'react';

let promptRoot: ReturnType<typeof createRoot> | null = null;
let promptContainer: HTMLDivElement | null = null;

interface PromptProps {
  message: string;
  defaultValue?: string;
  onConfirm: (value: string | null) => void;
  onCancel: () => void;
}

function PromptDialog({ message, defaultValue = '', onConfirm, onCancel }: PromptProps) {
  const [val, setVal] = useState(defaultValue);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-transform">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Edit2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Input Nilai</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">{message}</p>
          <input 
            autoFocus
            type="text" 
            value={val} 
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onConfirm(val);
              if (e.key === 'Escape') onCancel();
            }}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onConfirm(val)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

export function showPrompt(message: string, defaultValue?: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);

    if (!promptContainer) {
      promptContainer = document.createElement('div');
      document.body.appendChild(promptContainer);
      promptRoot = createRoot(promptContainer);
    }

    const cleanup = () => {
      if (promptRoot) {
        promptRoot.render(null);
      }
    };

    const handleConfirm = (val: string | null) => {
      cleanup();
      resolve(val);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    promptRoot?.render(
      <PromptDialog message={message} defaultValue={defaultValue} onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  });
}
