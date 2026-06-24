import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Avoid selecting an unrelated parent lockfile as the workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
