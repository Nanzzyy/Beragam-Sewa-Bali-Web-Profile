import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Beragam Sewa Bali - Solusi Sewa Perlengkapan Event Terpercaya di Bali",
  description: "Beragam Sewa Bali adalah solusi sewa perlengkapan event terpercaya di Bali. Kami menyediakan sound system, lighting, multimedia, dan berbagai kebutuhan acara Anda dengan layanan prima.",
  keywords: ["Beragam sewa bali", "sewa perlengkapan event bali", "sewa sound system bali", "sewa lighting bali", "sewa tenda bali", "perlengkapan acara bali", "vendor event bali"],
  authors: [{ name: "Beragam Sewa Bali" }],
  openGraph: {
    title: "Beragam Sewa Bali - Solusi Sewa Perlengkapan Event Terpercaya di Bali",
    description: "Beragam Sewa Bali adalah solusi sewa perlengkapan event terpercaya di Bali. Kami menyediakan sound system, lighting, multimedia, dan berbagai kebutuhan acara Anda.",
    url: "https://beragamsewabali.com/",
    siteName: "Beragam Sewa Bali",
    images: [
      {
        url: "https://beragamsewabali.com/src/assets/images/OG-image-1.png",
        width: 800,
        height: 800,
        alt: "Beragam Sewa Bali Logo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beragam Sewa Bali - Solusi Sewa Perlengkapan Event Terpercaya di Bali",
    description: "Beragam Sewa Bali adalah solusi sewa perlengkapan event terpercaya di Bali. Kami menyediakan sound system, lighting, multimedia, dan berbagai kebutuhan acara Anda.",
    images: ["https://beragamsewabali.com/src/assets/images/OG-image-1.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
