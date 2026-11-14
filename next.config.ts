import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root to this folder. Without it, Next.js finds the
    // unrelated bun.lock one level up (../bun.lock) and prints a warning.
    root: __dirname,
  },
};

export default nextConfig;
