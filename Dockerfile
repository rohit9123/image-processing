# Stage 1: Builder
FROM node:18-alpine AS builder

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

# Install dependencies first
COPY package*.json ./
RUN npm ci --production

# Copy application files
COPY . .

# Stage 2: Runtime
FROM node:18-alpine

# Maintain non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /usr/src/app

# Copy from builder
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app ./

# Application port
EXPOSE 8080

CMD ["node", "--experimental-specifier-resolution=node", "server.js"]