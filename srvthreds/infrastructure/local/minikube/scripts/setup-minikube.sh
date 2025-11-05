#!/bin/bash
# Setup Minikube for SrvThreds development

set -e  # Exit on error

echo "🚀 Starting Minikube setup for SrvThreds..."

# Store current kubectl context to allow restoration later
PREVIOUS_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
echo "📝 Current kubectl context: $PREVIOUS_CONTEXT"

# 1. Start Minikube with appropriate resources
echo "🔧 Starting Minikube cluster..."
minikube start --driver=docker \
  --cpus=4 \
  --memory=7836 \
  --disk-size=20g

# Set restart policy for Minikube container to survive Docker restarts
echo "🔄 Configuring Minikube container restart policy..."
docker update --restart=unless-stopped minikube
echo "✓ Minikube will now restart automatically with Docker"

# 2. Switch kubectl context to Minikube
echo "🔄 Switching kubectl context to Minikube..."
kubectl config use-context minikube

# Verify we're using the correct context
CURRENT_CONTEXT=$(kubectl config current-context)
echo "✓ kubectl context is now: $CURRENT_CONTEXT"

# Wait for Kubernetes API server to be ready
echo "⏳ Waiting for Kubernetes API server to be ready..."
kubectl wait --for=condition=Ready node/minikube --timeout=120s || {
  echo "⚠️  Warning: Node readiness check timed out, but continuing..."
}

# Give the API server a few extra seconds to stabilize
sleep 5

# 3. Enable addons
echo "📦 Enabling Minikube addons..."
minikube addons enable ingress || echo "⚠️  Warning: ingress addon failed, continuing..."
minikube addons enable metrics-server || echo "⚠️  Warning: metrics-server addon failed, continuing..."
minikube addons enable dashboard || echo "⚠️  Warning: dashboard addon failed, continuing..."
# minikube tunnel

# 4. Build and load Docker images into Minikube
echo "🐳 Building Docker images in Minikube environment..."
eval $(minikube docker-env)

# Create server images
npm run deploymentCli -- minikube build_server

# Tag the builder image as srvthreds:dev for Kubernetes deployments
echo "🏷️  Tagging builder image as srvthreds:dev..."
docker tag srvthreds-builder:latest srvthreds:dev

# 5. Start host databases (MUST run on HOST Docker, not Minikube Docker)
echo "💾 Starting host databases..."
# Reset Docker environment to point to host Docker
eval $(minikube docker-env --unset)
npm run deploymentCli -- minikube s_a_dbs
echo "✓ Host databases started on host Docker"

# 5a. Verify MongoDB replica set health
echo "🏥 Verifying MongoDB replica set health..."
# Check if MongoDB replica set is in a healthy state with a primary
RS_HEALTHY=$(docker exec mongo-repl-1 mongosh --quiet --eval "
  try {
    const status = rs.status();
    if (status.ok === 1) {
      const primaryCount = status.members.filter(m => m.stateStr === 'PRIMARY').length;
      print(primaryCount);
    } else {
      print('0');
    }
  } catch(e) {
    print('0');
  }
" 2>/dev/null || echo "0")

if [ "$RS_HEALTHY" != "1" ]; then
  echo "⚠️  MongoDB replica set needs initialization or repair"
  echo "🔧 Running replica set setup script..."
  bash infrastructure/local/docker/scripts/setup-repl.sh

  # Verify it's now healthy
  RS_HEALTHY=$(docker exec mongo-repl-1 mongosh --quiet --eval "
    try {
      const status = rs.status();
      if (status.ok === 1) {
        const primaryCount = status.members.filter(m => m.stateStr === 'PRIMARY').length;
        print(primaryCount);
      } else {
        print('0');
      }
    } catch(e) {
      print('0');
    }
  " 2>/dev/null || echo "0")

  if [ "$RS_HEALTHY" != "1" ]; then
    echo "❌ Error: MongoDB replica set is still not healthy after initialization"
    echo "   Please check MongoDB logs: docker logs mongo-repl-1"
    exit 1
  fi
  echo "✓ MongoDB replica set is now healthy"
else
  echo "✓ MongoDB replica set is healthy (has primary)"
fi

# 6. Deploy to Minikube
echo "☸️  Deploying to Minikube..."
kubectl apply -k infrastructure/local/minikube/manifests/minikube/

# 7. Wait for deployment
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s \
  deployment/srvthreds-engine \
  deployment/srvthreds-session-agent \
  deployment/srvthreds-persistence-agent \
  -n srvthreds

# 8. Port forward for access
echo "🔌 Setting up port forwarding..."
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds &

echo ""
echo "✅ Minikube setup complete!"
echo "🌐 Access session agent at: http://localhost:3000"
echo "📊 Dashboard: minikube dashboard"
echo ""
echo "💡 Useful commands:"
echo "   kubectl get pods -n srvthreds                    # Check pod status"
echo "   kubectl logs -f deployment/srvthreds-engine -n srvthreds  # View engine logs"
echo "   kubectl config use-context $PREVIOUS_CONTEXT     # Switch back to previous context"