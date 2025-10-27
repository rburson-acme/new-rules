#!/bin/bash
set -e

echo "🚀 Deploying SrvThreds to Minikube (Development)"

# Check if minikube is running
if ! minikube status > /dev/null 2>&1; then
    echo "🔧 Starting Minikube..."
    minikube start --driver=docker --cpus=4 --memory=8192
fi

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server

# Build Docker image in minikube
echo "🏗️  Building Docker image..."
eval $(minikube docker-env)

# Check if buildx is available for multi-platform builds
if docker buildx version > /dev/null 2>&1; then
    echo "Using Docker Buildx for multi-platform build..."
    # Build for the current platform in minikube
    PLATFORM=$(docker info --format '{{.Architecture}}')
    docker buildx build --platform linux/${PLATFORM} -t srvthreds:dev -f Dockerfile --load ..
else
    echo "Using standard Docker build..."
    docker build -t srvthreds:dev -f Dockerfile --build-arg BUILD_CONTEXT=.. ..
fi

# Deploy using Kustomize
echo "📦 Deploying applications..."
kubectl apply -k kubernetes/overlays/dev/

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=srvthreds -n srvthreds --timeout=300s

# Wait for bootstrap job to complete
echo "🔄 Waiting for bootstrap to complete..."
kubectl wait --for=condition=complete job/srvthreds-bootstrap -n srvthreds --timeout=300s

echo "✅ Deployment complete!"
echo ""
echo "🔗 Access your application:"
echo "Session Agent: minikube service session-agent -n srvthreds --url"
echo "RabbitMQ Management: minikube service rabbitmq -n srvthreds --url"
echo ""
echo "📋 Useful commands:"
echo "kubectl get pods -n srvthreds"
echo "kubectl logs -f deployment/srvthreds-engine -n srvthreds"
echo "kubectl port-forward svc/session-agent 3000:3000 -n srvthreds"