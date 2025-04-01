# Stage 1: Build environment
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install build tools
RUN apk add --no-cache python3 build-base git

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy and build source
COPY . .
RUN npm run build --if-present

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /usr/src/app

# Create app user and set permissions before copying files
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/src/app

# Copy from builder with proper permissions
COPY --chown=appuser:appgroup --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /usr/src/app/package*.json ./
COPY --chown=appuser:appgroup --from=builder /usr/src/app/. .

USER appuser

EXPOSE 3000
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]