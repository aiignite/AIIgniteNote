# Multi-stage build for AI Ignite Note Backend

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies using Chinese npm mirror
RUN npm install --registry=https://registry.npmmirror.com

# Copy source code
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install runtime and build dependencies (bcrypt needs python make g++, Prisma needs OpenSSL)
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    openssl \
    openssl-libs-static \
    && rm -rf /var/cache/apk/*

# Create non-root user (ignoring if already exists)
RUN addgroup -g 1001 -S appuser 2>/dev/null || true && \
    adduser -S appuser -u 1001 -G appuser 2>/dev/null || true

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install production dependencies only using Chinese npm mirror
RUN npm install --omit=dev --registry=https://registry.npmmirror.com && \
    npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create directories with proper permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Start the application
# First push schema to database, then start the app
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/app.js"]
