# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Skip linting during build to avoid ESLint configuration issues
ENV NEXT_LINT_IGNORE=true

# Build the Next.js application with standalone output and skip linting
RUN npm run build:docker

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions for Next.js 15 output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose the listening port
EXPOSE 3000

# Set resource limits - this is commented as it's set in Kubernetes
# These are recommendations; adjust based on your specific workload
# CPU: 1 core for moderate traffic, increase for higher loads
# Memory: 512MB-1GB minimum, 2-4GB recommended for production
# ENV NODE_OPTIONS="--max-old-space-size=1536"

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"] 