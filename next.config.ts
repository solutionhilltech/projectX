import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slim Docker images: only traced files + a minimal server.js are copied in,
  // instead of the full node_modules tree. Vercel's own build tracing expects
  // to write its own .next/*.nft.json files and breaks if "standalone" is on
  // (ENOENT on next-server.js.nft.json), so skip it when VERCEL is set.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
