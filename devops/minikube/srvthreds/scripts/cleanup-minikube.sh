#!/bin/bash
# Cleanup Minikube environment for fresh deployment

set -e

echo "🧹 Cleaning up Minikube environment..."

# Store current context
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")

# Switch to Minikube context if not already there
if [ "$CURRENT_CONTEXT" != "minikube" ]; then
  echo "🔄 Switching to Minikube context..."
  kubectl config use-context minikube 2>/dev/null || echo "⚠️  Minikube context not found"
fi

# 1. Delete Kubernetes resources
echo "🗑️  Deleting Kubernetes resources..."
kubectl delete namespace srvthreds --ignore-not-found=true --timeout=60s

# Wait for namespace to be fully deleted
echo "⏳ Waiting for namespace deletion to complete..."
kubectl wait --for=delete namespace/srvthreds --timeout=60s 2>/dev/null || true

# 2. Stop and delete Minikube cluster
echo "🛑 Stopping Minikube cluster..."
minikube stop 2>/dev/null || echo "⚠️  Minikube was not running"

echo "💥 Deleting Minikube cluster..."
minikube delete

# 3. Clean up Docker images built in Minikube
echo "🐳 Cleaning up Docker resources..."
# Note: Images are deleted with the cluster, but we'll mention it
echo "✓ Docker images removed with cluster deletion"

# 4. Handle host databases
echo ""
echo "📊 Host Database Status:"
echo "   The following databases may still be running on your host Docker:"
echo "   - MongoDB (mongo-repl-1)"
echo "   - Redis"
echo "   - RabbitMQ"
echo ""
echo "⚠️  IMPORTANT: If databases remain running between deployments,"
echo "   MongoDB replica set state may become corrupted, causing startup failures."
echo ""
echo "Recommended: Stop databases for a clean state"
echo ""
read -p "Delete host databases now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "💾 Stopping host databases..."
  cd "$(git rev-parse --show-toplevel)/srvthreds" 2>/dev/null || cd ../../..
  echo "Running command from $(pwd)"
  if npm run deploy-local-down-databases 2>/dev/null; then
    echo "✓ Databases stopped successfully"
  else
    echo "⚠️  Could not stop databases via CLI"
    echo "   You may need to stop them manually: docker compose -f ../srvthreds/infrastructure/local/docker/compose/docker-compose-db.yml down -v"
  fi
else
  echo "⚠️  Databases left running - you may need to manually fix replica set on next startup"
  echo "   To stop databases later: npm run deploymentCli local d_a_dbs"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "To start fresh:"
echo "  npm run minikube-create"
echo ""
echo "Or step by step:"
echo "  1. minikube start"
echo "  2. npm run deploymentCli minikube s_a_dbs"
echo "  3. npm run deploymentCli minikube k8s_apply"
echo ""
echo "💡 Tip: If you encounter MongoDB connection errors on next startup,"
echo "   the setup script will automatically detect and repair the replica set."
