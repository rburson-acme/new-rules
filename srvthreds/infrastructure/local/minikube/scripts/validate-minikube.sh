#!/bin/bash
# Validate Minikube SrvThreds deployment by running integration tests
# This script establishes connectivity to in-cluster services and runs the test suite

set -e  # Exit on error

echo "🧪 Starting Minikube environment validation..."

# Configuration
NAMESPACE="srvthreds"
MONGO_LOCAL_PORT=27017
REDIS_LOCAL_PORT=6380
RABBITMQ_LOCAL_PORT=5672
RABBITMQ_MGMT_PORT=15672

# Array to track port-forward PIDs for cleanup
declare -a PORT_FORWARD_PIDS=()

# Cleanup function - kills only the port-forwards we created
cleanup() {
  echo ""
  echo "🧹 Cleaning up port-forwards..."

  # Only kill the specific PIDs we tracked
  for pid in "${PORT_FORWARD_PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "  ✓ Stopped port-forward (PID: $pid)"
    fi
  done

  # Wait a moment for processes to exit gracefully
  sleep 1

  echo "✓ Cleanup complete"
}

# Register cleanup function to run on script exit
trap cleanup EXIT INT TERM

# Function to wait for a port to be accessible
wait_for_port() {
  local port=$1
  local service_name=$2
  local max_attempts=30
  local attempt=0

  echo "⏳ Waiting for $service_name to be accessible on port $port..."

  while [ $attempt -lt $max_attempts ]; do
    if nc -z localhost "$port" 2>/dev/null; then
      echo "  ✓ $service_name is ready on port $port"
      return 0
    fi

    attempt=$((attempt + 1))
    sleep 1
  done

  echo "  ❌ Timeout waiting for $service_name on port $port"
  return 1
}

# 1. Verify Docker is running
echo "🐳 Verifying Docker daemon..."
if ! docker info &>/dev/null; then
  echo "❌ Docker daemon is not running"
  echo "   Please start Docker Desktop and try again"
  echo ""
  echo "   Steps to fix:"
  echo "   1. Open Docker Desktop application"
  echo "   2. Wait for Docker to start (whale icon in menu bar)"
  echo "   3. Run this script again"
  exit 1
fi
echo "  ✓ Docker daemon is running"

# 2. Verify Minikube cluster exists and is running
echo "📋 Verifying Minikube cluster..."
MINIKUBE_STATUS=$(minikube status --format='{{.Host}}' 2>/dev/null || echo "NotFound")

if [ "$MINIKUBE_STATUS" = "NotFound" ]; then
  echo "❌ Minikube cluster not found"
  echo "   Please create the cluster first: npm run minikube-create"
  exit 1
elif [ "$MINIKUBE_STATUS" != "Running" ]; then
  echo "⚠️  Minikube cluster exists but is not running (Status: $MINIKUBE_STATUS)"
  echo "   Starting Minikube..."
  minikube start || {
    echo "❌ Failed to start Minikube"
    exit 1
  }
fi
echo "  ✓ Minikube cluster is running"

# 3. Update kubectl context to ensure we have the correct API server address
echo "🔄 Updating kubectl context..."
if ! minikube update-context 2>/dev/null; then
  echo "⚠️  Warning: Could not update context, but continuing..."
fi

CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
if [ "$CURRENT_CONTEXT" != "minikube" ]; then
  echo "   Switching to minikube context..."
  kubectl config use-context minikube
fi
echo "  ✓ Using context: $(kubectl config current-context)"

# 4. Verify we can connect to the API server
echo "🔌 Testing Kubernetes API connectivity..."
if ! kubectl cluster-info &>/dev/null; then
  echo "❌ Cannot connect to Kubernetes API server"
  echo "   Attempting to refresh connection..."
  minikube update-context
  sleep 2
  if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Still cannot connect to API server"
    echo "   Try running: minikube delete && npm run minikube-create"
    exit 1
  fi
fi
echo "  ✓ Connected to Kubernetes API server"

# 5. Verify all pods are running
echo "🔍 Verifying pod status in namespace '$NAMESPACE'..."
kubectl wait --for=condition=ready --timeout=120s \
  pod -l app.kubernetes.io/name=srvthreds-engine \
  -n "$NAMESPACE" || {
  echo "❌ Engine pods are not ready"
  kubectl get pods -n "$NAMESPACE"
  exit 1
}

kubectl wait --for=condition=ready --timeout=120s \
  pod -l app.kubernetes.io/name=srvthreds-session-agent \
  -n "$NAMESPACE" || {
  echo "❌ Session agent pods are not ready"
  kubectl get pods -n "$NAMESPACE"
  exit 1
}

kubectl wait --for=condition=ready --timeout=120s \
  pod -l app.kubernetes.io/name=srvthreds-persistence-agent \
  -n "$NAMESPACE" || {
  echo "❌ Persistence agent pods are not ready"
  kubectl get pods -n "$NAMESPACE"
  exit 1
}

echo "  ✓ All SrvThreds pods are ready"

# 6. Get MongoDB service endpoint (host database)
echo "🔌 Establishing connectivity to host databases..."
echo "  ℹ️  MongoDB, Redis, and RabbitMQ are running on host Docker (not in Minikube)"

# For host databases, we need to use the host gateway IP that Minikube can reach
# Get the host IP accessible from within Minikube
HOST_IP=$(minikube ssh "ip route | grep default | awk '{print \$3}'" 2>/dev/null || echo "host.docker.internal")
echo "  📍 Host accessible from Minikube at: $HOST_IP"

# Set environment variables for test execution
export MONGO_HOST="localhost:${MONGO_LOCAL_PORT}"
export MONGO_DIRECT_CONNECTION="true"
export REDIS_HOST="localhost:${REDIS_LOCAL_PORT}"
export RABBITMQ_HOST="localhost"
export RABBITMQ_PORT="${RABBITMQ_LOCAL_PORT}"

# 7. Start port-forwards to host databases
# Note: Since databases are on host, we connect directly from test runner on host
echo "🔌 Port-forwarding host database services..."

# Check if ports are already in use
if lsof -Pi :${MONGO_LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "  ⚠️  Port ${MONGO_LOCAL_PORT} already in use (MongoDB likely already accessible)"
else
  echo "  ℹ️  MongoDB is on host Docker, should be accessible at localhost:${MONGO_LOCAL_PORT}"
fi

if lsof -Pi :${REDIS_LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "  ⚠️  Port ${REDIS_LOCAL_PORT} already in use (Redis likely already accessible)"
else
  echo "  ℹ️  Redis is on host Docker, should be accessible at localhost:${REDIS_LOCAL_PORT}"
fi

if lsof -Pi :${RABBITMQ_LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "  ⚠️  Port ${RABBITMQ_LOCAL_PORT} already in use (RabbitMQ likely already accessible)"
else
  echo "  ℹ️  RabbitMQ is on host Docker, should be accessible at localhost:${RABBITMQ_LOCAL_PORT}"
fi

# 8. Wait for services to be accessible
wait_for_port "$MONGO_LOCAL_PORT" "MongoDB" || {
  echo "❌ Cannot connect to MongoDB on host"
  echo "   Please ensure host databases are running: npm run deploymentCli -- minikube s_a_dbs"
  exit 1
}

wait_for_port "$REDIS_LOCAL_PORT" "Redis" || {
  echo "❌ Cannot connect to Redis on host"
  echo "   Please ensure host databases are running: npm run deploymentCli -- minikube s_a_dbs"
  exit 1
}

wait_for_port "$RABBITMQ_LOCAL_PORT" "RabbitMQ" || {
  echo "❌ Cannot connect to RabbitMQ on host"
  echo "   Please ensure host databases are running: npm run deploymentCli -- minikube s_a_dbs"
  exit 1
}

echo "  ✓ All database services are accessible"

# 9. Run bootstrap to initialize test data
echo "🌱 Bootstrapping test data and configuration..."
npm run bootstrap -- -p ef-detection || {
  echo "❌ Bootstrap failed"
  exit 1
}
echo "  ✓ Bootstrap completed successfully"

# 10. Run integration tests
echo "🧪 Running integration tests against Minikube deployment..."
echo "  Environment configuration:"
echo "    MONGO_HOST: $MONGO_HOST"
echo "    REDIS_HOST: $REDIS_HOST"
echo "    RABBITMQ_HOST: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo ""

npm test || {
  echo ""
  echo "❌ Tests failed!"
  echo ""
  echo "📊 Debugging information:"
  echo "   Pods:"
  kubectl get pods -n "$NAMESPACE"
  echo ""
  echo "   Recent engine logs:"
  kubectl logs -n "$NAMESPACE" -l app=srvthreds-engine --tail=50 || true
  echo ""
  exit 1
}

echo ""
echo "✅ Minikube environment validation complete!"
echo "   All tests passed successfully"
echo ""
echo "💡 The Minikube cluster is fully operational and ready for development"
