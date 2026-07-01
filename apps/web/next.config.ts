import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabase.beragamsewabali.com',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: 'upgrade-insecure-requests' }
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/about', destination: '/#about', permanent: true },
      { source: '/contact', destination: '/#footer', permanent: true },
      { source: '/services', destination: '/#service', permanent: true },
      { source: '/products', destination: '/#package', permanent: true },
      { source: '/login', destination: 'https://admin.beragamsewabali.com/', permanent: true },
      { source: '/register', destination: 'https://admin.beragamsewabali.com/', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Domain-based rewrites for admin panel
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "admin.beragamsewabali.com",
          },
        ],
        destination: "/admin/index.html",
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "admin.beragamsewabali.com",
          },
        ],
        destination: "/admin/:path*",
      },
      // Domain-based rewrites for katalog
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "katalog.beragamsewabali.com",
          },
        ],
        destination: "/katalog/index.html",
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "katalog.beragamsewabali.com",
          },
        ],
        destination: "/katalog/:path*",
      },
      // Normal path-based rewrites for main domain
      {
        source: "/",
        destination: "/home/index.html",
      },
      {
        source: "/detail.html",
        destination: "/home/detail.html",
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