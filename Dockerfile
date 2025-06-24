# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runtime

# Install PostgreSQL client and OpenSSL for Prisma compatibility
RUN apk add --no-cache postgresql-client openssl openssl-dev

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application and Prisma files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy scripts
COPY --chown=nodejs:nodejs scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node dist/src/healthcheck.js || exit 1

# Expose port
EXPOSE 3000

# Start command with database wait
CMD ["./scripts/wait-for-db.sh", "node", "dist/src/server.enhanced.js"]
