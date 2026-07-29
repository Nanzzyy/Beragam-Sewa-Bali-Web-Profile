'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __pwaInstall?: () => void;
  }
}

export default function DownloadClient() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    let deferredPrompt: any;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      window.__pwaInstall = () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt = null;
        } else {
          alert('Buka halaman ini di Chrome Android, lalu klik ⋮ → "Add to Home Screen".');
        }
      };
    };

    const installButton = document.getElementById('installPWA');
    if (installButton) {
      installButton.addEventListener('click', () => {
        if (window.__pwaInstall) {
          window.__pwaInstall();
          setTimeout(() => {
            if (window.__pwaInstall) {
              alert('Install prompt tidak muncul. Gunakan cara manual di bawah.');
            }
          }, 1000);
        } else {
          alert('Buka halaman ini di Chrome Android, lalu klik ⋮ → "Add to Home Screen".');
        }
      });
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (installButton) {
        installButton.removeEventListener('click', () => {});
      }
    };
  }, []);

  return null;
}