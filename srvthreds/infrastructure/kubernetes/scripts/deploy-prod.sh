#!/bin/bash
set -e

ENVIRONMENT=${1:-prod}
echo "🚀 Deploying SrvThreds to Production (${ENVIRONMENT})"

# Check if kubectl is configured
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "❌ kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Confirm deployment
echo "⚠️  You are about to deploy to PRODUCTION environment: ${ENVIRONMENT}"
echo "Current kubectl context: $(kubectl config current-context)"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Build and push Docker image
echo "🏗️  Building and pushing Docker image..."
IMAGE_TAG=$(git rev-parse --short HEAD)
REGISTRY=${REGISTRY:-your-registry}

# Use multi-platform build script
echo "Building multi-platform images..."
./scripts/build-multiplatform.sh ${IMAGE_TAG} ${REGISTRY} true

# Alternative single-platform build (uncomment if preferred)
# docker build -t ${REGISTRY}/srvthreds:${IMAGE_TAG} -f Dockerfile --build-arg BUILD_CONTEXT=.. ..
# docker push ${REGISTRY}/srvthreds:${IMAGE_TAG}

# Update image in kustomization
cd k8s/prod
kustomize edit set image srvthreds=srvthreds:${IMAGE_TAG}

# Apply Terraform changes first
echo "🏗️  Applying Terraform infrastructure..."
cd ../../terraform/environments/${ENVIRONMENT}
terraform plan
read -p "Apply Terraform changes? (yes/no): " terraform_confirm

if [[ $terraform_confirm == "yes" ]]; then
    terraform apply

    # Get connection strings from Terraform outputs
    MONGO_URL=$(terraform output -raw mongodb_connection_string)
    # REDIS_URL=$(terraform output -raw redis_connection_string)
    # RABBITMQ_URL=$(terraform output -raw rabbitmq_connection_string)

    # Update Kubernetes ConfigMap with connection strings
    cd ../../../k8s/prod
    kubectl create configmap srvthreds-config \
        --from-literal=NODE_ENV=production \
        --from-literal=MONGO_URL="${MONGO_URL}" \
        --from-literal=LOG_LEVEL=INFO \
        --namespace=srvthreds \
        --dry-run=client -o yaml | kubectl apply -f -
fi

# Deploy using Kustomize
echo "📦 Deploying applications..."
cd ../../k8s/prod
kubectl apply -k .

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=srvthreds -n srvthreds --timeout=600s

# Wait for bootstrap job to complete
echo "🔄 Waiting for bootstrap to complete..."
kubectl wait --for=condition=complete job/srvthreds-bootstrap -n srvthreds --timeout=600s

echo "✅ Production deployment complete!"
echo ""
echo "📋 Useful commands:"
echo "kubectl get pods -n srvthreds"
echo "kubectl logs -f deployment/srvthreds-engine -n srvthreds"
echo "kubectl get svc -n srvthreds"