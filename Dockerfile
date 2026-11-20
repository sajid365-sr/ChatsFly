# ============================================================
# Stage 1: Dependencies
# Install all node_modules (including devDependencies for build)
# ============================================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package and prisma configuration files
COPY package.json package-lock.json* ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Fallback dummy URL so prisma generate during postinstall does not fail
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatsfly"

# Install dependencies
RUN npm ci

# ============================================================
# Stage 2: Builder
# Build the Next.js application in standalone mode
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy env vars needed during Next.js static page analysis / build
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatsfly"
ENV NEXT_PUBLIC_APP_URL="https://chatsfly.com"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_dummy"
ENV CLERK_SECRET_KEY="sk_dummy"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client using multi-file schema directory
RUN npx prisma generate --schema=prisma/schema

# Build Next.js app
RUN npm run build

# ============================================================
# Stage 3: Runner
# Minimal production image using Next.js standalone output
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy Next.js standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files needed at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone Next.js server
CMD ["node", "server.js"]
