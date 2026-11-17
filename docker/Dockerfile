# Multi-stage build for Expo React Native web app
# Stage 1: Build dependencies and application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with legacy-peer-deps for Expo compatibility
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build web assets (if needed for static export)
# RUN npm run export

# Stage 2: Production runtime
FROM node:18-alpine

WORKDIR /app

# Set NODE_ENV for production optimizations
ENV NODE_ENV=production

# Copy node_modules and app from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

# Expose Expo Web dev server port (8081) and alternate ports
EXPOSE 8081 3000 19000 19001

# Default command: start Expo web server
CMD ["npm", "run", "web"]
