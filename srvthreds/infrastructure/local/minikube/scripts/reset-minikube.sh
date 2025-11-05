#!/bin/bash
# Reset Minikube deployment without deleting the cluster
# Faster than full cleanup - keeps cluster and databases running

set -e

echo "🔄 Resetting Minikube deployment..."

# Switch to Minikube context
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
if [ "$CURRENT_CONTEXT" != "minikube" ]; then
  echo "🔄 Switching to Minikube context..."
  kubectl config use-context minikube
fi

# Delete the namespace (this removes all resources)
echo "🗑️  Deleting srvthreds namespace..."
kubectl delete namespace srvthreds --ignore-not-found=true --timeout=60s

# Wait for complete deletion
echo "⏳ Waiting for resources to be cleaned up..."
kubectl wait --for=delete namespace/srvthreds --timeout=60s 2>/dev/null || true

echo ""
echo "✅ Reset complete! Minikube cluster still running."
echo ""
echo "To redeploy:"
echo "  npm run deploymentCli local k8s_apply"
