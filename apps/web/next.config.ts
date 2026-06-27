import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Menggunakan env variable, jika tidak ada baru fallback ke localhost (untuk dev lokal)
        destination: `${process.env.NEXT_PRIVATE_API_URL || "http://localhost:3005"}/api/:path*`,
      },
      {
        source: "/",
        destination: "/home/index.html",
      },
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
      {
        source: "/admin/:path*",
        destination: "/admin/:path*",
      },
      {
        source: "/katalog",
        destination: "/katalog/index.html",
      },
      {
        source: "/katalog/:path*",
        destination: "/katalog/:path*",
      },
      {
        source: "/src/:path*",
        destination: "/src/:path*",
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;