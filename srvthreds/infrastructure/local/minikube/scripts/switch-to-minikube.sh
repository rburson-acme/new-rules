#!/bin/bash
# Switch kubectl context to Minikube

set -e

# Get current context
CURRENT_CONTEXT=$(kubectl config current-context 2>/dev/null || echo "none")
echo "Current kubectl context: $CURRENT_CONTEXT"

# Switch to Minikube
if [ "$CURRENT_CONTEXT" != "minikube" ]; then
  echo "Switching to Minikube context..."
  kubectl config use-context minikube
  echo "✓ Switched to Minikube context"
else
  echo "✓ Already using Minikube context"
fi

# Verify cluster is running
if minikube status &>/dev/null; then
  echo "✓ Minikube cluster is running"
else
  echo "⚠️  Warning: Minikube cluster may not be running. Use 'minikube start' to start it."
fi
