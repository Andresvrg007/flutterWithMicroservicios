# 🐳 DOCKERFILE - API GATEWAY CONTAINERIZATION
# Multi-stage build para optimizar el tamaño de la imagen

# ================================
# 📦 BUILD STAGE
# ================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install --production

# ================================
# 🚀 PRODUCTION STAGE
# ================================
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apigateway -u 1001

# Copy production dependencies
COPY --from=builder --chown=apigateway:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=apigateway:nodejs . .

# Create logs directory
RUN mkdir -p /app/logs && chown apigateway:nodejs /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Switch to non-root user
USER apigateway

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application with dumb-init
CMD ["dumb-init", "node", "src/app.js"]
