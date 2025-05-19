# Stage 1: Install dependencies only when needed
FROM node:20-alpine AS deps

# Install required system packages
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Auto-detect package manager
RUN \
  if [ -f package-lock.json ]; then npm ci --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable && pnpm install --frozen-lockfile; \
  fi

# Stage 2: Build the Next.js application
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy the installed dependencies from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application code
COPY . .

# Build the Next.js app (optimized for production)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_LINT_IGNORE=true
ENV HOSTNAME="0.0.0.0"

# ARG per build-time (NEXT_PUBLIC_)
ARG NEXT_PUBLIC_OIDC_ISSUER
ARG NEXT_PUBLIC_NEXTAUTH_URL

# ENV per next build-time substitution
ENV NEXT_PUBLIC_OIDC_ISSUER=${NEXT_PUBLIC_OIDC_ISSUER}
ENV NEXT_PUBLIC_NEXTAUTH_URL=${NEXT_PUBLIC_NEXTAUTH_URL}

# Debug log per verifica
RUN echo "NEXT_PUBLIC_OIDC_ISSUER=${NEXT_PUBLIC_OIDC_ISSUER}" 
RUN echo "NEXT_PUBLIC_NEXTAUTH_URL=${NEXT_PUBLIC_NEXTAUTH_URL}"

RUN npm run build:docker

# Stage 3: Production image with minimal footprint
FROM node:20-alpine AS runner

# Optional: prevent Next.js telemetry in production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    mkdir -p /app/certs && \
    chown -R nextjs:1001 /app/certs

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create volume for custom certificates
VOLUME /app/certs

# Set working directory
WORKDIR /app

# Copy only the necessary files for running the app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Define the path to the custom CA certificate
ENV NODE_EXTRA_CA_CERTS=/app/certs/staging-documinds-certs.pem

# Ensure the app runs as non-root
USER nextjs

# Expose the port Next.js will run on
EXPOSE 3000

# Health check to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/api/health || exit 1

# Start the Next.js application in production 
CMD ["node", "server.js"]