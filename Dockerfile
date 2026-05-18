# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js evaluates rewrites() in next.config.ts at build time and serializes
# the result into routes-manifest.json. In standalone output the runtime
# server reads from that manifest, so API_BASE must be set during `next build`
# — setting it only at runtime has no effect on the rewrite destinations.
ARG API_BASE=http://backend:8080
ENV API_BASE=${API_BASE}
ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only the production output
COPY --from=builder /app/public       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# API_BASE points to the Flask backend; override at runtime via -e or compose.
# ENV API_BASE=http://127.0.0.1:5001

CMD ["node", "server.js"]
