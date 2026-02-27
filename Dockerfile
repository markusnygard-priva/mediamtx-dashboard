## Base stage with pnpm installed
#FROM node:20-alpine AS base
#ENV PNPM_HOME="/pnpm"
#ENV PATH="$PNPM_HOME:$PATH"
#
## Install pnpm explicitly, skip corepack network calls
#RUN npm install -g pnpm@9
#
## Stage 1: Dependencies
#FROM base AS deps
#WORKDIR /app
#
## Copy package files
#COPY package.json pnpm-lock.yaml* ./
#
## Install dependencies with cache
#RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
#    pnpm install --frozen-lockfile --prod=false
#
## Stage 2: Builder
#FROM base AS builder
#WORKDIR /app
#
#COPY --from=deps /app/node_modules ./node_modules
#COPY . .
#
#ENV NEXT_TELEMETRY_DISABLED=1
#ENV NODE_ENV=production
#
#RUN pnpm run build
#
## Stage 3: Runner
#FROM node:20-alpine AS runner
#WORKDIR /app
#
#ENV NODE_ENV=production
#ENV NEXT_TELEMETRY_DISABLED=1
#
## Non-root user
#RUN addgroup --system --gid 1001 nodejs && \
#    adduser --system --uid 1001 nextjs
#
#COPY --from=builder /app/public ./public
#RUN mkdir -p .next && chown nextjs:nodejs .next
#
#COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
#COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
#
#USER nextjs
#EXPOSE 3000
#
#ENV PORT=3000
#ENV HOSTNAME="0.0.0.0"
#
#CMD ["node", "server.js"]



# Use BuildKit features (cache mounts) to speed up installs and Next builds.
# Build with BuildKit enabled:
#   DOCKER_BUILDKIT=1 docker build -t my-next-app .
# or with Buildx in CI (recommended) to persist cache across runs.

# -----------------------
# Stage 1: Base
# -----------------------
FROM node:20-alpine AS base

# Setup pnpm environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install pnpm globally in the base image
RUN npm install -g pnpm@9 --no-audit --no-fund
WORKDIR /app

# -----------------------
# Stage 2: Dependencies
# -----------------------
FROM base AS deps
WORKDIR /app

# Copy only manifest files to install dependencies
COPY package.json pnpm-lock.yaml* ./

# Force a physical install into the image (removed BuildKit cache mounts 
# to ensure node_modules are present for the volume override)
RUN pnpm install --no-frozen-lockfile

# -----------------------
# Stage 3: Development (The "Runner")
# -----------------------
FROM base AS development
WORKDIR /app

# 1. Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# 2. Copy the rest of the source code
COPY . .

# 3. Environment variables (Defaults for your Ubuntu Server .23)
ENV NEXT_PUBLIC_MEDIAMTX_API_URL="http://192.168.8.23:9997"
ENV NEXT_PUBLIC_MEDIAMTX_HLS_URL="http://192.168.8.23:8888"
ENV NODE_ENV=development
ENV PORT=3000
ENV HOST=0.0.0.0

# 4. CRITICAL: Add node_modules bin folder to PATH so 'next' is found
ENV PATH /app/node_modules/.bin:$PATH

# Expose the dashboard port
EXPOSE 3000

# Start the dev server
CMD ["pnpm", "run", "dev"]