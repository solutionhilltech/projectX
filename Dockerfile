# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------------
# Installs the full dependency tree (needed for the build step below).
# PUPPETEER_SKIP_DOWNLOAD keeps npm from pulling Puppeteer's own ~300MB
# full-Chrome-for-Testing build — the runner stage runs on
# @sparticuz/chromium instead, a Brotli-compressed headless-only
# Chromium that's inflated to /tmp at container startup rather than
# baked into the image uncompressed.
FROM node:22-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner ---------------------------------------------------------
# Debian slim (glibc) — not the deps/builder layers — this is the image
# that actually ships. @sparticuz/chromium stores Chromium Brotli-
# compressed and inflates it to /tmp on first launch, so the image
# itself never holds an uncompressed browser.
FROM node:22-slim AS runner
WORKDIR /app

# Runtime shared libraries the headless Chromium binary links against.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates fonts-liberation \
      libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
      libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 \
      libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcomposite1 \
      libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    USE_SERVERLESS_CHROMIUM=true \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# `output: standalone` (next.config.ts) traces only the files each route
# actually needs, so this is a fraction of the full node_modules tree.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# @sparticuz/chromium reads its bin/*.br assets via a runtime-computed
# relative path rather than a static import, so Next's file tracer
# (built for import/require analysis) drops them — copy the package in
# directly instead of trusting the trace for this one dependency.
# (Its tar-fs/pump/tar-stream deps are plain static imports, so the
# trace already carries those correctly.)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@sparticuz /app/node_modules/@sparticuz

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
