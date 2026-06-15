import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beragam Sewa Bali",
  description: "Solusi rental terpercaya di Bali",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
