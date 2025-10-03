# Production build for SrvThreds services
# Uses pre-built artifacts from srvthreds-builder image
# This significantly improves build times for multi-service deployments

# Use builder image as source for compiled artifacts
ARG BUILDER_IMAGE=srvthreds-builder:latest
FROM ${BUILDER_IMAGE} AS builder

# Production stage
FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Copy package files from srvthreds
COPY srvthreds/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/srvthreds/dist-server ./dist-server

# Copy run-config directory
COPY --from=builder /app/srvthreds/run-profiles ./dist-server/run-profiles

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S srvthreds -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R srvthreds:nodejs /app

# Switch to non-root user
USER srvthreds

# Expose common ports (can be overridden in compose)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1

# Default entrypoint - can be overridden in docker-compose
ENTRYPOINT ["node", "dist-server/index.js"]

# Default service type - can be overridden in docker-compose
CMD ["--service-type", "engine", "--config-name", "engine"]