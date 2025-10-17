# Builder stage for SrvThreds - shared across all services
# This image contains compiled thredlib and srvthreds artifacts
# Support for multiple architectures (amd64, arm64)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy both repositories from parent context
COPY --from=thredlib . ./thredlib/
COPY . ./srvthreds/

# Build thredlib first
WORKDIR /app/thredlib
RUN npm ci && npm run build-all

# Build srvthreds
WORKDIR /app/srvthreds
RUN npm ci
RUN npm run build

# Copy run-config directory which contains additional config files
COPY run-profiles/ dist-server/run-profiles/

# Copy env file from assets directory
COPY infrastructure/deploymentAssets/*.* ./dist-server/

# Default command (this image is meant to be used as a base)
CMD ["/bin/sh"]
