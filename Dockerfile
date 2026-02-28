# PHASE 1: Build the code
FROM node:20-slim AS builder
WORKDIR /app
# Install pnpm
RUN npm install -g pnpm
# Copy configuration files
COPY package.json pnpm-lock.yaml ./
# Install ALL dependencies (including dev) to allow building
RUN pnpm install --frozen-lockfile
# Copy the rest of your backed-up source code
COPY . .
# Run the Next.js build process
RUN pnpm build

# PHASE 2: Run the code (The slim production image)
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed to run (saves space and adds speed)
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
# Start the production server
CMD ["npm", "start"]