import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://dashboard.beragamsewabali.com'),
  title: "BSB Dashboard — Rental & Event Management | PT Praven Bali Production",
  description: "Sistem manajemen penyewaan peralatan event dan integrasi akuntansi double-entry untuk Beragam Sewa Bali.",
  keywords: "dashboard, rental, sewa peralatan, event, bali, manajemen, ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
          let deferredPrompt;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            window.__pwaInstall = () => {
              if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
            };
          });
          // Fallback: if PWA prompt never fires, show manual install guide after 8 seconds
          window.__pwaFallback = () => {
            const d = document.createElement('div');
            d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
            d.innerHTML = '<div style=\"background:white;padding:32px;border-radius:16px;max-width:400px;text-align:center;font-family:sans-serif\"><h3>📱 Install App</h3><p style=\"font-size:14px;color:#666\"><b>Android:</b> Chrome → ⋮ → Add to Home Screen<br><br><b>iPhone:</b> Safari → Share → Add to Home Screen<br><br><b>Desktop:</b> Klik ikon ⊕ di address bar</p><button onclick=\"this.parentElement.parentElement.remove()\" style=\"margin-top:16px;padding:10px 32px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px\">OK</button></div>';
            document.body.appendChild(d);
          };
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen antialiased transition-colors duration-300">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
