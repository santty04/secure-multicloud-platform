import path from "node:path";
import type { NextConfig } from "next";

// The browser talks to this Next.js server on the same origin, and the server
// proxies `/api/*` and `/health` to the real backend. Use API_URL because this
// value is only needed by Next on the server/build side; NEXT_PUBLIC_API_URL is
// kept as a temporary fallback for existing deployments.
const backendOrigin = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // The git repo root (secure-multicloud-platform/) is one level up from
  // this app, and holds a lockfile of its own — pin Turbopack's root here
  // so it doesn't have to guess.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    proxyTimeout: 150_000,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/health", destination: `${backendOrigin}/health` },
    ];
  },
};

export default nextConfig;
