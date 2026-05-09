import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  // Allow importing shared TS modules from /config (sibling to /app).
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
