import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.beragamsewabali.com',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // WAJIB DIISI DI COOLIFY: Masukkan URL Internal DNS Backend Anda ke dalam variabel NEXT_PRIVATE_API_URL
        destination: `${process.env.NEXT_PRIVATE_API_URL || "http://TOLONG-ISI-VARIABLE-INI-DI-COOLIFY:3005"}/api/:path*`,
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