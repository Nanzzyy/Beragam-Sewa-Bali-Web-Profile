import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BSB Cashflow — Double-Entry Ledger | PT Praven Bali Production",
  description: "Sistem akuntansi double-entry ledger untuk PT Praven Bali Production. Neraca saldo real-time, jurnal umum, dan ekspor laporan keuangan.",
  keywords: "cashflow, akuntansi, double entry, neraca saldo, jurnal umum, bali, sewa peralatan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f8fafc" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen antialiased transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
