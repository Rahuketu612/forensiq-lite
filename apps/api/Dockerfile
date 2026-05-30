FROM node:20-alpine AS base
WORKDIR /app

# ===========================================
# Dependencies Stage
# ===========================================
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
RUN pnpm install --frozen-lockfile

# ===========================================
# Build Stage
# ===========================================
FROM deps AS build
COPY . .
RUN pnpm build --filter @forensiq/api

# ===========================================
# Production Stage
# ===========================================
FROM base AS production
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Install only production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @forensiq/database --filter @forensiq/shared

# Copy built application
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start command
CMD ["node", "dist/main.js"]
