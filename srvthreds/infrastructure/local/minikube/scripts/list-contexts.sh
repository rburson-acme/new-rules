#!/bin/bash
# List all kubectl contexts and show current context

echo "Available kubectl contexts:"
echo ""
kubectl config get-contexts

echo ""
echo "Current context: $(kubectl config current-context)"
echo ""
echo "To switch contexts:"
echo "  kubectl config use-context <context-name>"
echo ""
echo "To switch to Minikube:"
echo "  ./infrastructure/kubernetes/scripts/switch-to-minikube.sh"
