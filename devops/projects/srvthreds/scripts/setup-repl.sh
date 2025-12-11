#!/bin/bash
# Idempotent MongoDB replica set initialization script
# Safe to run multiple times - will only initialize if not already initialized
#
# Usage: ./setup-repl.sh [container-name]
#   container-name: Name of the MongoDB container (default: mongo-repl-1)
#
# Note: This script runs against host Docker daemon (not minikube's Docker)
# because infrastructure services run on host to simulate Azure managed services.

set -e  # Exit on error

# Container name from argument or default
MONGO_CONTAINER="${1:-mongo-repl-1}"

echo "🔍 Checking MongoDB replica set status..."

# Wait for MongoDB to be ready (container needs to be fully up)
echo "⏳ Waiting for MongoDB container to be ready..."
for i in {1..30}; do
  if docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "db.runCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    echo "✓ MongoDB is responding"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Error: MongoDB container not ready after 30 seconds"
    exit 1
  fi
  sleep 1
done

# Check if replica set is already initialized
RS_STATUS=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "try { rs.status().ok } catch(e) { 0 }" || echo "0")

if [ "$RS_STATUS" == "1" ]; then
  echo "✓ MongoDB replica set is already initialized"

  # Verify it has a primary
  PRIMARY_COUNT=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "rs.status().members.filter(m => m.stateStr === 'PRIMARY').length" || echo "0")

  if [ "$PRIMARY_COUNT" == "1" ]; then
    echo "✓ Replica set has a primary node"
  else
    echo "⚠️  Warning: Replica set exists but no primary found. Waiting for election..."
    # Wait up to 30 seconds for primary election
    for i in {1..30}; do
      PRIMARY_COUNT=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "rs.status().members.filter(m => m.stateStr === 'PRIMARY').length" || echo "0")
      if [ "$PRIMARY_COUNT" == "1" ]; then
        echo "✓ Primary elected after ${i} seconds"
        break
      fi
      sleep 1
    done

    if [ "$PRIMARY_COUNT" != "1" ]; then
      echo "❌ Error: No primary elected after 30 seconds"
      exit 1
    fi
  fi
else
  echo "⚙️  Initializing MongoDB replica set..."

  docker exec "$MONGO_CONTAINER" mongosh "mongodb://localhost:27017" --eval "
    rs.initiate({
      _id: 'rs0',
      members: [
        { _id: 0, host: '$MONGO_CONTAINER:27017' }
      ]
    })
  "

  if [ $? -eq 0 ]; then
    echo "✓ Replica set initialized successfully"

    # Wait for primary election
    echo "⏳ Waiting for primary election..."
    for i in {1..30}; do
      PRIMARY_COUNT=$(docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "rs.status().members.filter(m => m.stateStr === 'PRIMARY').length" 2>/dev/null || echo "0")
      if [ "$PRIMARY_COUNT" == "1" ]; then
        echo "✓ Primary elected after ${i} seconds"
        break
      fi
      sleep 1
    done
  else
    echo "❌ Error: Failed to initialize replica set"
    exit 1
  fi
fi

echo "✅ MongoDB replica set is ready"
