import { createRoot } from 'react-dom/client';
import { AlertCircle, X } from 'lucide-react';

let confirmRoot: ReturnType<typeof createRoot> | null = null;
let confirmContainer: HTMLDivElement | null = null;

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-transform">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Konfirmasi</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);

    if (!confirmContainer) {
      confirmContainer = document.createElement('div');
      document.body.appendChild(confirmContainer);
      confirmRoot = createRoot(confirmContainer);
    }

    const cleanup = () => {
      if (confirmRoot) {
        confirmRoot.render(null);
      }
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmRoot?.render(
      <ConfirmDialog message={message} onConfirm={handleConfirm} onCancel={handleCancel} />
    );
  });
}
