import DownloadClient from './DownloadClient';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-5">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📱</div>
        <h1 className="text-2xl font-bold mb-2">Download BSB Dashboard</h1>
        <p className="text-slate-400 mb-6">
          Install aplikasi di Android atau iPhone untuk akses cepat dashboard rental & event management.
        </p>

        <a
          href="https://www.pwabuilder.com/?url=https://dashboard.beragamsewabali.com/manifest.json"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold mb-3 transition shadow-lg shadow-red-500/25"
        >
          ⚡ Generate APK (PWABuilder)
        </a>

        <button
          id="installPWA"
          className="w-full py-4 px-6 rounded-xl bg-transparent text-slate-300 font-bold border-2 border-slate-600 hover:border-slate-500 mb-6 transition"
        >
          📲 Install via Browser
        </button>

        <div className="text-left bg-slate-900 rounded-xl p-4">
          <h3 className="text-slate-400 mb-3">📋 Cara Manual</h3>
          <ol className="text-slate-300 text-sm list-decimal pl-5 space-y-2">
            <li>Buka <b>dashboard.beragamsewabali.com</b> di <b>Chrome</b></li>
            <li>Tunggu 10 detik sampai muncul popup install</li>
            <li>Atau klik <b>⋮ → Add to Home Screen</b></li>
            <li>Aplikasi akan muncul di home screen</li>
          </ol>
        </div>
      </div>
      <DownloadClient />
    </div>
  );
}