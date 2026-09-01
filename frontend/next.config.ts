import path from "node:path";
import type { NextConfig } from "next";

// The FastAPI backend does not send CORS headers (confirmed: no
// CORSMiddleware registered). Rather than modify the backend, the browser
// talks to this Next.js server on the same origin, and the server proxies
// `/api/*` and `/health` to the real backend — a plain server-to-server
// request, which is never subject to CORS.
const backendOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // The git repo root (secure-multicloud-platform/) is one level up from
  // this app, and holds a lockfile of its own — pin Turbopack's root here
  // so it doesn't have to guess.
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/health", destination: `${backendOrigin}/health` },
    ];
  },
};

export default nextConfig;
