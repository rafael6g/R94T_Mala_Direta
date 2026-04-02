# =====================================================================
# Stage 1: Build
# =====================================================================
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests and patches first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# ─── VITE_* vars são injetadas no bundle em tempo de build ───────────
ARG VITE_APP_ID
ARG VITE_APP_TITLE
ARG VITE_XANO_API_BASE_URL
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_FRONTEND_FORGE_API_KEY
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID

ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_XANO_API_BASE_URL=$VITE_XANO_API_BASE_URL
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL
ENV VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID

# Build: Vite (frontend → server/_core/public) + esbuild (server → dist/)
RUN NODE_ENV=production pnpm run build

# =====================================================================
# Stage 2: Production
# =====================================================================
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests and patches
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/_core/public ./server/_core/public

# ─── Runtime env vars (server-side apenas) ──────────────────────────
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
