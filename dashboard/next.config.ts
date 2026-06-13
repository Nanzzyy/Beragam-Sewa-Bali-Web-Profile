import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "../dashboard-build",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
