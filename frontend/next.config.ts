import type { NextConfig } from "next";
import path from "node:path";

const backendOrigin = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000/api"
)
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Avoid selecting an unrelated parent lockfile as the workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
