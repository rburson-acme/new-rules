#!/bin/bash
# Build script for srvthreds-builder base image
# This image contains pre-compiled thredlib and srvthreds artifacts
# Usage: ./build-builder.sh [--no-cache] [--platform PLATFORMS]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Default values
NO_CACHE=""
PLATFORM="linux/amd64,linux/arm64"
TAG="srvthreds-builder:latest"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--no-cache] [--platform PLATFORMS] [--tag TAG]"
      exit 1
      ;;
  esac
done

echo "Building srvthreds-builder image..."
echo "Context: $PROJECT_ROOT"
echo "Dockerfile: $SCRIPT_DIR/Dockerfile.builder"
echo "Platform: $PLATFORM"
echo "Tag: $TAG"

cd "$PROJECT_ROOT"

docker build \
  $NO_CACHE \
  --platform "$PLATFORM" \
  -f srvthreds/infrastructure/dockerCompose/Dockerfile.builder \
  -t "$TAG" \
  .

echo ""
echo "✓ Builder image created successfully: $TAG"
echo ""
echo "You can now build the service images with:"
echo "  docker-compose -f infrastructure/dockerCompose/docker-compose-services.yml build"
