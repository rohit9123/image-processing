# Stage 1: Build environment
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    build-base \
    git

# Install node modules
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy and build source code
COPY . .
RUN npm run build --if-present

# Stage 2: Production image
FROM node:18-alpine

# Create app user and directories with proper permissions
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    mkdir -p /app/config /tmp/uploads && \
    chown -R appuser:appgroup /app /tmp/uploads && \
    chmod 755 /app/config && \
    chmod 1777 /tmp/uploads

WORKDIR /app

# Copy credentials with correct permissions
COPY --from=builder --chown=appuser:appgroup /usr/src/app/config/gcp-key.json ./config/
RUN chmod 644 /app/config/gcp-key.json

# Copy application files
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /usr/src/app/. .

# Runtime configuration
USER appuser

ENV NODE_ENV=production \
    PORT=8080 \
    TZ=UTC \
    GOOGLE_APPLICATION_CREDENTIALS=/app/config/gcp-key.json \
    GCP_BUCKET_NAME=imageprocessingrohitkumar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "server.js"]