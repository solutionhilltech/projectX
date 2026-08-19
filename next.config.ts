import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slim Docker images: only traced files + a minimal server.js are copied in,
  // instead of the full node_modules tree. Vercel ignores this and traces its
  // own function bundles, which is why outputFileTracingIncludes (below) is
  // still needed there.
  output: "standalone",
  // @sparticuz/chromium reads its bin/*.br assets via a runtime-computed path,
  // so Next's import/require tracer drops them on both Docker and Vercel —
  // force them into this route's bundle explicitly.
  outputFileTracingIncludes: {
    "/api/redesign": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
