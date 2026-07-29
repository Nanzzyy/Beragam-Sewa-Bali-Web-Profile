'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ---------- Types ----------
type Platform = 'android' | 'ios' | 'desktop' | 'unknown';
type InstallState = 'idle' | 'available' | 'installing' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaInstall?: () => void;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// ---------- Platform Detection ----------
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

// ---------- Icons (inline SVG) ----------
const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M5 16V9h14v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><rect x="7" y="18" width="2" height="4" rx="1" /><rect x="15" y="18" width="2" height="4" rx="1" />
    <rect x="3" y="9" width="2" height="7" rx="1" /><rect x="19" y="9" width="2" height="7" rx="1" /><path d="M7 9V7a5 5 0 0 1 10 0v2" /><circle cx="10" cy="5" r="0.5" fill="currentColor" /><circle cx="14" cy="5" r="0.5" fill="currentColor" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const DesktopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 inline-block mx-1">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

// ---------- Main Component ----------
export default function DownloadClient() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [installState, setInstallState] = useState<InstallState>('idle');
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setAlreadyInstalled(isStandalone());

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Listen for install prompt
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallState('available');
      // Also set global for compatibility with layout.tsx
      window.__pwaInstall = () => {
        e.prompt();
      };
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed after a delay
    const appInstalledHandler = () => {
      setInstallState('installed');
      setAlreadyInstalled(true);
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallPWA = useCallback(async () => {
    if (deferredPrompt) {
      setInstallState('installing');
      try {
        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          setInstallState('installed');
          setAlreadyInstalled(true);
        } else {
          setInstallState('available');
        }
      } catch {
        setInstallState('available');
      }
      setDeferredPrompt(null);
    } else {
      setShowManualGuide(true);
    }
  }, [deferredPrompt]);

  // ---- Feature list ----
  const features = [
    { icon: '⚡', title: 'Akses Instan', desc: 'Buka langsung dari home screen tanpa browser' },
    { icon: '🔔', title: 'Push Notification', desc: 'Terima notifikasi event & jadwal penting' },
    { icon: '📡', title: 'Mode Offline', desc: 'Akses data terakhir tanpa koneksi internet' },
    { icon: '🔒', title: 'Keamanan', desc: 'Terenkripsi end-to-end sama seperti browser' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-red-600/10 mb-6">
            <img src="/icon-192.png" alt="BSB" className="w-14 h-14 rounded-xl" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-3">
            BSB Dashboard
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Aplikasi manajemen rental & event production Beragam Sewa Bali.
            Install untuk pengalaman terbaik.
          </p>
        </div>

        {/* Already Installed Banner */}
        {alreadyInstalled && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckIcon />
            </div>
            <div>
              <p className="font-semibold text-emerald-400 text-sm">Sudah Terinstall!</p>
              <p className="text-slate-400 text-xs">App BSB Dashboard sudah ada di perangkat Anda.</p>
            </div>
          </div>
        )}

        {/* Platform-specific install section */}
        <div className="space-y-3 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          
          {/* Android: APK Download (Primary) */}
          {(platform === 'android' || platform === 'unknown') && (
            <a
              href="/BSB-Dashboard-debug.apk"
              download="BSB-Dashboard.apk"
              id="download-apk-btn"
              className="group flex items-center gap-4 w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold transition-all duration-300 shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <DownloadIcon />
              </div>
              <div className="flex-1 text-left">
                <span className="text-base">Download APK</span>
                <p className="text-red-200/80 text-xs font-normal mt-0.5">
                  Android • Install langsung tanpa Play Store
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          )}

          {/* PWA Install (Cross-platform) */}
          <button
            onClick={handleInstallPWA}
            disabled={installState === 'installing' || installState === 'installed'}
            id="install-pwa-btn"
            className={`group flex items-center gap-4 w-full p-4 rounded-2xl font-semibold transition-all duration-300 active:scale-[0.98] ${
              installState === 'installed'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default'
                : installState === 'installing'
                ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-wait'
                : 'bg-slate-800/80 border border-slate-700/50 text-white hover:bg-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              installState === 'installed' ? 'bg-emerald-500/20' : 'bg-slate-700/50'
            }`}>
              {installState === 'installed' ? <CheckIcon /> :
               installState === 'installing' ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
               ) : (
                platform === 'android' ? <AndroidIcon /> :
                platform === 'ios' ? <AppleIcon /> : <DesktopIcon />
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-base">
                {installState === 'installed' ? 'Sudah Terinstall' :
                 installState === 'installing' ? 'Menginstall...' :
                 installState === 'available' ? 'Install Aplikasi' :
                 'Install via Browser'}
              </span>
              <p className="text-slate-400 text-xs font-normal mt-0.5">
                {installState === 'installed' ? 'BSB Dashboard ada di perangkat Anda' :
                 installState === 'installing' ? 'Tunggu sebentar...' :
                 platform === 'ios' ? 'Tambahkan ke Home Screen via Safari' :
                 installState === 'available' ? 'Install PWA langsung di browser ini' :
                 'Progressive Web App • Semua platform'}
              </p>
            </div>
          </button>

          {/* Desktop: Open in browser */}
          {platform === 'desktop' && (
            <a
              href="/"
              id="open-dashboard-btn"
              className="group flex items-center gap-4 w-full p-4 rounded-2xl bg-slate-800/50 border border-slate-700/30 text-slate-300 hover:text-white hover:bg-slate-700/50 hover:border-slate-600 font-semibold transition-all duration-300 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-700/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <span className="text-base">Buka di Browser</span>
                <p className="text-slate-500 text-xs font-normal mt-0.5">Akses dashboard langsung</p>
              </div>
            </a>
          )}
        </div>

        {/* Manual Install Guide Toggle */}
        {(showManualGuide || installState === 'idle') && !alreadyInstalled && (
          <div className="mb-8 animate-fade-in">
            <button
              onClick={() => setShowManualGuide(!showManualGuide)}
              className="w-full text-left text-sm text-slate-400 hover:text-slate-300 transition flex items-center justify-between py-3"
            >
              <span className="font-medium">📋 Panduan Install Manual</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 transition-transform ${showManualGuide ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            
            {showManualGuide && (
              <div className="space-y-4 mt-2">
                {/* Android Guide */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AndroidIcon />
                    <span className="font-semibold text-sm text-green-400">Android (Chrome)</span>
                  </div>
                  <ol className="text-slate-300 text-xs space-y-2 pl-4 list-decimal">
                    <li>Buka <b className="text-white">dashboard.beragamsewabali.com</b> di <b className="text-white">Chrome</b></li>
                    <li>Ketuk tombol <b className="text-white">⋮</b> (menu) di kanan atas</li>
                    <li>Pilih <b className="text-white">&ldquo;Install app&rdquo;</b> atau <b className="text-white">&ldquo;Add to Home Screen&rdquo;</b></li>
                    <li>Konfirmasi install → Aplikasi muncul di home screen</li>
                  </ol>
                </div>

                {/* iOS Guide */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AppleIcon />
                    <span className="font-semibold text-sm text-blue-400">iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="text-slate-300 text-xs space-y-2 pl-4 list-decimal">
                    <li>Buka <b className="text-white">dashboard.beragamsewabali.com</b> di <b className="text-white">Safari</b></li>
                    <li>Ketuk tombol <ShareIcon /> <b className="text-white">Share</b> di bagian bawah</li>
                    <li>Scroll ke bawah, pilih <b className="text-white">&ldquo;Add to Home Screen&rdquo;</b></li>
                    <li>Ketuk <b className="text-white">&ldquo;Add&rdquo;</b> → Aplikasi muncul di home screen</li>
                  </ol>
                </div>

                {/* Desktop Guide */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <DesktopIcon />
                    <span className="font-semibold text-sm text-violet-400">Desktop (Chrome / Edge)</span>
                  </div>
                  <ol className="text-slate-300 text-xs space-y-2 pl-4 list-decimal">
                    <li>Buka <b className="text-white">dashboard.beragamsewabali.com</b></li>
                    <li>Klik ikon <b className="text-white">⊕</b> di address bar (kanan)</li>
                    <li>Atau: <b className="text-white">⋮ → Install BSB Dashboard</b></li>
                    <li>App terbuka sebagai window terpisah tanpa address bar</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Keuntungan Install</h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/20 hover:border-slate-600/40 transition-colors">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="font-semibold text-sm text-slate-200 mb-1">{f.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Version info */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">v2.0 • PWA + Native</span>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            © {new Date().getFullYear()} Beragam Sewa Bali • PT Praven Bali Production
          </p>
        </div>
      </div>
    </div>
  );
}