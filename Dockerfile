# Stage 1: Builder
FROM node:18-alpine AS builder

# Install PM2 globally as root
RUN npm install -g pm2

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production
COPY . .

# Stage 2: Runtime
FROM node:18-alpine

# Copy PM2 from builder
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin/pm2 /usr/local/bin/pm2

# Set up non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Ensure PM2 is in PATH
ENV PATH="/usr/local/lib/node_modules/pm2/bin:${PATH}"

WORKDIR /usr/src/app

# Copy application files
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app ./

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE $PORT

CMD ["pm2-runtime", "ecosystem.config.cjs"]