import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slim Docker images: only traced files + a minimal server.js are copied in,
  // instead of the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
