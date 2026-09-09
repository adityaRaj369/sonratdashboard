import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.API_PROXY_ORIGIN?.replace(/\/$/, "") || "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@sonrat/shared"],
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${API_ORIGIN}/health`,
      },
      {
        source: "/ready",
        destination: `${API_ORIGIN}/ready`,
      },
    ];
  },
};

export default nextConfig;
