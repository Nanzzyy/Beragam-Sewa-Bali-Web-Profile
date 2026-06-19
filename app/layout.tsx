import "./globals.css";
import type { Metadata } from "next";

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
        url: "https://beragamsewabali.com/src/assets/images/OG-image-1.jpg",
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
    images: ["https://beragamsewabali.com/src/assets/images/OG-image-1.jpg"],
  },
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
