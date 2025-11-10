# SrvThreds Deployment Guide

This guide covers deploying both infrastructure and application code to Azure using three different approaches: Manual Deployment, GitHub Actions, and Azure DevOps Pipelines.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Option 1: Manual Deployment](#option-1-manual-deployment)
- [Option 2: GitHub Actions CI/CD](#option-2-github-actions-cicd)
- [Option 3: Azure DevOps Pipelines](#option-3-azure-devops-pipelines)
- [Comparison Matrix](#comparison-matrix)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Infrastructure Components:**
- Networking (VNet, Subnets, NSGs)
- Key Vault
- Azure Container Registry (ACR)
- CosmosDB (MongoDB API)
- Redis Cache
- Service Bus
- Azure Kubernetes Service (AKS)
- Application Gateway
- Monitoring (Log Analytics + Application Insights)

**Application Components:**
- Node.js/TypeScript application
- Docker containerization
- Kubernetes deployment
- Service exposure via Application Gateway

---

## Prerequisites

### Common Prerequisites (All Options)

1. **Azure Subscription**
   - Active Azure subscription
   - Contributor or Owner role
   - Subscription ID: `f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed`

2. **Local Tools**
   ```bash
   # Verify installations
   az --version          # Azure CLI 2.50+
   terraform --version   # Terraform 1.5+
   docker --version      # Docker 20.10+
   kubectl version       # kubectl 1.28+
   node --version        # Node.js 18+
   npm --version         # npm 9+
   ```

3. **Azure Login**
   ```bash
   az login
   az account set --subscription f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed
   az account show
   ```

4. **Repository Access**
   ```bash
   cd /Users/aresha/Repos/new-rules/srvthreds
   git status
   ```

---

## Option 1: Manual Deployment

**Best for:** Development, testing, learning, quick iterations

**Time to Deploy:** 1-2 hours (first time), 15-30 minutes (subsequent)

### Phase 1: Infrastructure Deployment

#### Step 1: Bootstrap Terraform State Storage (One-Time)

```bash
cd infrastructure/cloud/terraform/bootstrap

# Login to Azure
az login
az account set --subscription f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed

# Initialize and deploy bootstrap
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan

# Note the outputs - you'll need these
# - storage_account_name: srvthredstfstated9jvee
# - container_name: tfstate
# - resource_group_name: srvthreds-terraform-rg
```

#### Step 2: Deploy Infrastructure Stacks

```bash
cd infrastructure/cloud/terraform

# Option A: Deploy all stacks at once (recommended for first deployment)
./scripts/deploy-stack.sh all dev

# Option B: Deploy stacks individually
./scripts/deploy-stack.sh apply networking dev
./scripts/deploy-stack.sh apply keyvault dev
./scripts/deploy-stack.sh apply acr dev
./scripts/deploy-stack.sh apply cosmosdb dev
./scripts/deploy-stack.sh apply redis dev
./scripts/deploy-stack.sh apply servicebus dev
./scripts/deploy-stack.sh apply aks dev
./scripts/deploy-stack.sh apply monitoring dev
./scripts/deploy-stack.sh apply appgateway dev

# Check deployment status
./scripts/deploy-stack.sh status dev
```

**Expected Output:**
```
Stack           Status          Resources
─────────────────────────────────────────────────
networking      ✓ Deployed      17
keyvault        ✓ Deployed      3
acr             ✓ Deployed      2
cosmosdb        ✓ Deployed      1
redis           ✓ Deployed      2
servicebus      ✓ Deployed      5
aks             ✓ Deployed      4
monitoring      ✓ Deployed      3
appgateway      ✓ Deployed      3
```

#### Step 3: Verify Infrastructure

```bash
# Verify AKS cluster
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --overwrite-existing

kubectl get nodes
# Expected: 2 nodes in Ready state

# Verify ACR
az acr list --resource-group CAZ-SRVTHREDS-D-E-RG --output table

# Verify Application Gateway
az network application-gateway show \
  --name CAZ-SRVTHREDS-D-E-AGW \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query "provisioningState" \
  --output tsv
# Expected: Succeeded
```

### Phase 2: Application Deployment

#### Step 1: Build and Push Docker Image

```bash
cd /Users/aresha/Repos/new-rules/srvthreds

# Login to ACR
az acr login --name cazsrvthredsdeacr

# Build Docker image
docker build -t srvthreds:latest .

# Tag for ACR
docker tag srvthreds:latest cazsrvthredsdeacr.azurecr.io/srvthreds:latest
docker tag srvthreds:latest cazsrvthredsdeacr.azurecr.io/srvthreds:v1.0.0

# Push to ACR
docker push cazsrvthredsdeacr.azurecr.io/srvthreds:latest
docker push cazsrvthredsdeacr.azurecr.io/srvthreds:v1.0.0

# Verify image
az acr repository list --name cazsrvthredsdeacr --output table
az acr repository show-tags --name cazsrvthredsdeacr --repository srvthreds --output table
```

#### Step 2: Create Kubernetes Namespace and Secrets

```bash
# Create namespace
kubectl create namespace srvthreds

# Get connection strings from Azure
COSMOS_CONN=$(az cosmosdb keys list \
  --name caz-srvthreds-d-e-cosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

REDIS_KEY=$(az redis list-keys \
  --name CAZ-SRVTHREDS-D-E-REDIS \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query primaryKey \
  --output tsv)

REDIS_HOST=$(az redis show \
  --name CAZ-SRVTHREDS-D-E-REDIS \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query hostName \
  --output tsv)

SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --namespace-name caz-srvthreds-d-e-sbus \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString \
  --output tsv)

APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app CAZ-SRVTHREDS-D-E-APPI \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query instrumentationKey \
  --output tsv)

# Create Kubernetes secrets
kubectl create secret generic srvthreds-secrets \
  --namespace=srvthreds \
  --from-literal=mongodb-uri="$COSMOS_CONN" \
  --from-literal=redis-password="$REDIS_KEY" \
  --from-literal=servicebus-connection="$SERVICEBUS_CONN" \
  --from-literal=appinsights-key="$APP_INSIGHTS_KEY"

# Create ConfigMap
kubectl create configmap srvthreds-config \
  --namespace=srvthreds \
  --from-literal=redis-host="$REDIS_HOST" \
  --from-literal=redis-port="6380" \
  --from-literal=node-env="production"

# Create ACR image pull secret
kubectl create secret docker-registry acr-secret \
  --namespace=srvthreds \
  --docker-server=cazsrvthredsdeacr.azurecr.io \
  --docker-username=cazsrvthredsdeacr \
  --docker-password=$(az acr credential show \
    --name cazsrvthredsdeacr \
    --query "passwords[0].value" \
    --output tsv)
```

#### Step 3: Create Kubernetes Manifests

Create directory structure:
```bash
mkdir -p infrastructure/kubernetes/dev
```

**`infrastructure/kubernetes/dev/deployment.yaml`:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srvthreds
  namespace: srvthreds
  labels:
    app: srvthreds
    environment: dev
spec:
  replicas: 2
  selector:
    matchLabels:
      app: srvthreds
  template:
    metadata:
      labels:
        app: srvthreds
        environment: dev
    spec:
      imagePullSecrets:
        - name: acr-secret
      containers:
        - name: srvthreds
          image: cazsrvthredsdeacr.azurecr.io/srvthreds:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: srvthreds-config
                  key: node-env
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: srvthreds-secrets
                  key: mongodb-uri
            - name: REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  name: srvthreds-config
                  key: redis-host
            - name: REDIS_PORT
              valueFrom:
                configMapKeyRef:
                  name: srvthreds-config
                  key: redis-port
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: srvthreds-secrets
                  key: redis-password
            - name: SERVICEBUS_CONNECTION_STRING
              valueFrom:
                secretKeyRef:
                  name: srvthreds-secrets
                  key: servicebus-connection
            - name: APPINSIGHTS_INSTRUMENTATIONKEY
              valueFrom:
                secretKeyRef:
                  name: srvthreds-secrets
                  key: appinsights-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 60
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

**`infrastructure/kubernetes/dev/service.yaml`:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: srvthreds
  namespace: srvthreds
  labels:
    app: srvthreds
spec:
  type: ClusterIP
  selector:
    app: srvthreds
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 3000
```

**`infrastructure/kubernetes/dev/ingress.yaml`:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: srvthreds
  namespace: srvthreds
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/backend-path-prefix: "/"
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: srvthreds
                port:
                  number: 80
```

#### Step 4: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f infrastructure/kubernetes/dev/

# Verify deployment
kubectl get all -n srvthreds

# Watch pod status
kubectl get pods -n srvthreds -w

# View logs
kubectl logs -n srvthreds -l app=srvthreds --tail=100 -f

# Check deployment status
kubectl rollout status deployment/srvthreds -n srvthreds
```

#### Step 5: Verify Application

```bash
# Port-forward for testing
kubectl port-forward -n srvthreds svc/srvthreds 8080:80

# In another terminal, test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/ready

# Check Application Gateway public IP
az network public-ip show \
  --name CAZ-SRVTHREDS-D-E-AGW-PIP \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query ipAddress \
  --output tsv

# Test via Application Gateway (once ingress is configured)
curl http://<public-ip>/health
```

#### Step 6: Update Application (Rolling Updates)

```bash
# Build new version
docker build -t srvthreds:v1.0.1 .
docker tag srvthreds:v1.0.1 cazsrvthredsdeacr.azurecr.io/srvthreds:v1.0.1
docker push cazsrvthredsdeacr.azurecr.io/srvthreds:v1.0.1

# Update deployment
kubectl set image deployment/srvthreds \
  srvthreds=cazsrvthredsdeacr.azurecr.io/srvthreds:v1.0.1 \
  -n srvthreds

# Watch rollout
kubectl rollout status deployment/srvthreds -n srvthreds

# Rollback if needed
kubectl rollout undo deployment/srvthreds -n srvthreds
```

---

## Option 2: GitHub Actions CI/CD

**Best for:** Open source projects, GitHub-hosted repositories, teams using GitHub

**Time to Setup:** 2-3 hours (first time)

**Automation Level:** Full CI/CD

### Phase 1: Infrastructure Deployment via GitHub Actions

#### Step 1: Create GitHub Repository Secrets

Navigate to: `Settings → Secrets and variables → Actions → New repository secret`

Add the following secrets:
- `AZURE_CREDENTIALS` - Service principal credentials (JSON)
- `AZURE_SUBSCRIPTION_ID` - `f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed`
- `AZURE_TENANT_ID` - Your tenant ID

**Generate Azure Service Principal:**
```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "github-actions-srvthreds" \
  --role contributor \
  --scopes /subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed \
  --sdk-auth

# Output (save this as AZURE_CREDENTIALS secret):
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

#### Step 2: Create Infrastructure Workflow

**`.github/workflows/deploy-infrastructure.yml`:**
```yaml
name: Deploy Infrastructure

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - test
          - prod
      stack:
        description: 'Stack to deploy (or "all")'
        required: true
        default: 'all'
        type: string

env:
  TERRAFORM_VERSION: '1.5.0'
  WORKING_DIR: 'infrastructure/cloud/terraform'

jobs:
  deploy-infrastructure:
    name: Deploy Terraform Stack
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Deploy Bootstrap (if first time)
        if: github.event.inputs.stack == 'bootstrap'
        working-directory: ${{ env.WORKING_DIR }}/bootstrap
        run: |
          terraform init
          terraform plan -out=bootstrap.tfplan
          terraform apply -auto-approve bootstrap.tfplan

      - name: Deploy Stack
        if: github.event.inputs.stack != 'bootstrap'
        working-directory: ${{ env.WORKING_DIR }}
        run: |
          chmod +x scripts/deploy-stack.sh
          ./scripts/deploy-stack.sh build ${{ github.event.inputs.stack }} ${{ github.event.inputs.environment }}
          ./scripts/deploy-stack.sh apply ${{ github.event.inputs.stack }} ${{ github.event.inputs.environment }}

      - name: Check Deployment Status
        working-directory: ${{ env.WORKING_DIR }}
        run: |
          ./scripts/deploy-stack.sh status ${{ github.event.inputs.environment }}
```

#### Step 3: Trigger Infrastructure Deployment

1. Go to GitHub Actions tab
2. Select "Deploy Infrastructure" workflow
3. Click "Run workflow"
4. Select environment: `dev`
5. Enter stack: `all` (or specific stack name)
6. Click "Run workflow"

### Phase 2: Application Deployment via GitHub Actions

#### Step 1: Add Application Secrets

Add these secrets to GitHub:
- `ACR_USERNAME` - ACR admin username
- `ACR_PASSWORD` - ACR admin password

**Get ACR credentials:**
```bash
az acr credential show --name cazsrvthredsdeacr
```

#### Step 2: Create Application Workflow

**`.github/workflows/deploy-app.yml`:**
```yaml
name: Deploy Application

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'src/**'
      - 'package.json'
      - 'Dockerfile'
      - 'infrastructure/kubernetes/**'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'dev'
        type: choice
        options:
          - dev
          - test
          - prod

env:
  ACR_NAME: cazsrvthredsdeacr
  IMAGE_NAME: srvthreds
  AKS_RESOURCE_GROUP: CAZ-SRVTHREDS-D-E-RG
  AKS_CLUSTER_NAME: CAZ-SRVTHREDS-D-E-AKS
  NAMESPACE: srvthreds

jobs:
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.version }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Azure Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.ACR_NAME }}.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.ACR_NAME }}.azurecr.io/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-to-aks:
    name: Deploy to AKS
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Get AKS credentials
        run: |
          az aks get-credentials \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --name ${{ env.AKS_CLUSTER_NAME }} \
            --overwrite-existing

      - name: Create namespace if not exists
        run: |
          kubectl create namespace ${{ env.NAMESPACE }} --dry-run=client -o yaml | kubectl apply -f -

      - name: Create secrets
        run: |
          # Get connection strings from Azure
          COSMOS_CONN=$(az cosmosdb keys list \
            --name caz-srvthreds-d-e-cosmos \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --type connection-strings \
            --query "connectionStrings[0].connectionString" \
            --output tsv)

          REDIS_KEY=$(az redis list-keys \
            --name CAZ-SRVTHREDS-D-E-REDIS \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --query primaryKey \
            --output tsv)

          REDIS_HOST=$(az redis show \
            --name CAZ-SRVTHREDS-D-E-REDIS \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --query hostName \
            --output tsv)

          SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --namespace-name caz-srvthreds-d-e-sbus \
            --name RootManageSharedAccessKey \
            --query primaryConnectionString \
            --output tsv)

          APP_INSIGHTS_KEY=$(az monitor app-insights component show \
            --app CAZ-SRVTHREDS-D-E-APPI \
            --resource-group ${{ env.AKS_RESOURCE_GROUP }} \
            --query instrumentationKey \
            --output tsv)

          # Create secrets
          kubectl create secret generic srvthreds-secrets \
            --namespace=${{ env.NAMESPACE }} \
            --from-literal=mongodb-uri="$COSMOS_CONN" \
            --from-literal=redis-password="$REDIS_KEY" \
            --from-literal=servicebus-connection="$SERVICEBUS_CONN" \
            --from-literal=appinsights-key="$APP_INSIGHTS_KEY" \
            --dry-run=client -o yaml | kubectl apply -f -

          # Create ConfigMap
          kubectl create configmap srvthreds-config \
            --namespace=${{ env.NAMESPACE }} \
            --from-literal=redis-host="$REDIS_HOST" \
            --from-literal=redis-port="6380" \
            --from-literal=node-env="production" \
            --dry-run=client -o yaml | kubectl apply -f -

          # Create ACR secret
          kubectl create secret docker-registry acr-secret \
            --namespace=${{ env.NAMESPACE }} \
            --docker-server=${{ env.ACR_NAME }}.azurecr.io \
            --docker-username=${{ secrets.ACR_USERNAME }} \
            --docker-password=${{ secrets.ACR_PASSWORD }} \
            --dry-run=client -o yaml | kubectl apply -f -

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f infrastructure/kubernetes/dev/ -n ${{ env.NAMESPACE }}

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/srvthreds -n ${{ env.NAMESPACE }} --timeout=5m
          kubectl get all -n ${{ env.NAMESPACE }}

      - name: Run smoke tests
        run: |
          # Wait for service to be ready
          kubectl wait --for=condition=ready pod -l app=srvthreds -n ${{ env.NAMESPACE }} --timeout=300s

          # Port forward and test
          kubectl port-forward -n ${{ env.NAMESPACE }} svc/srvthreds 8080:80 &
          sleep 5

          curl -f http://localhost:8080/health || exit 1
          curl -f http://localhost:8080/ready || exit 1

          echo "✅ Deployment successful and healthy"
```

#### Step 3: Automatic Deployments

Now commits to `main` branch will automatically:
1. Build Docker image
2. Push to ACR
3. Deploy to AKS
4. Run health checks

Manual deployments can be triggered via "Run workflow" button.

---

## Option 3: Azure DevOps Pipelines

**Best for:** Enterprise environments, Azure-native shops, complex workflows

**Time to Setup:** 3-4 hours (first time)

**Automation Level:** Full CI/CD with advanced features

### Phase 1: Azure DevOps Setup

#### Step 1: Create Azure DevOps Organization

1. Go to https://dev.azure.com
2. Sign in with Azure account
3. Create new organization: `srvthreds-org`
4. Create new project: `srvthreds`

#### Step 2: Create Service Connection

1. Project Settings → Service connections
2. New service connection → Azure Resource Manager
3. Choose "Service principal (automatic)"
4. Scope level: Subscription
5. Subscription: Select your subscription
6. Resource group: Leave empty (access all)
7. Service connection name: `azure-srvthreds-dev`
8. Grant access to all pipelines: ✓
9. Click "Save"

#### Step 3: Import Repository

**Option A: From GitHub**
1. Repos → Files → Import
2. Clone URL: Your GitHub repo URL
3. Authentication: Personal Access Token
4. Import

**Option B: Use Azure Repos directly**
1. Push your code to Azure Repos
2. `git remote add azure <azure-repos-url>`
3. `git push azure main`

### Phase 2: Infrastructure Pipeline

#### Step 1: Create Variable Group

1. Pipelines → Library → + Variable group
2. Variable group name: `srvthreds-infrastructure-dev`
3. Add variables:
   - `AZURE_SUBSCRIPTION_ID`: `f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed`
   - `ENVIRONMENT`: `dev`
   - `TERRAFORM_VERSION`: `1.5.0`
4. Save

#### Step 2: Create Infrastructure Pipeline

**`azure-pipelines-infrastructure.yml`:**
```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/cloud/terraform/**
    exclude:
      - infrastructure/cloud/terraform/README.md

parameters:
  - name: environment
    displayName: 'Environment to deploy'
    type: string
    default: 'dev'
    values:
      - dev
      - test
      - prod
  - name: stack
    displayName: 'Stack to deploy'
    type: string
    default: 'all'

variables:
  - group: srvthreds-infrastructure-${{ parameters.environment }}
  - name: terraformVersion
    value: '1.5.0'
  - name: workingDirectory
    value: 'infrastructure/cloud/terraform'

stages:
  - stage: Plan
    displayName: 'Terraform Plan'
    jobs:
      - job: TerraformPlan
        displayName: 'Run Terraform Plan'
        pool:
          vmImage: 'ubuntu-latest'

        steps:
          - task: TerraformInstaller@0
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)

          - task: AzureCLI@2
            displayName: 'Terraform Plan: ${{ parameters.stack }}'
            inputs:
              azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              workingDirectory: $(workingDirectory)
              inlineScript: |
                chmod +x scripts/deploy-stack.sh
                ./scripts/deploy-stack.sh build ${{ parameters.stack }} ${{ parameters.environment }}

          - task: PublishPipelineArtifact@1
            displayName: 'Publish Terraform Plan'
            inputs:
              targetPath: '$(workingDirectory)/stacks/${{ parameters.stack }}/${{ parameters.environment }}.tfplan'
              artifact: 'terraform-plan'
              publishLocation: 'pipeline'

  - stage: Apply
    displayName: 'Terraform Apply'
    dependsOn: Plan
    condition: succeeded()
    jobs:
      - deployment: TerraformApply
        displayName: 'Apply Terraform Changes'
        pool:
          vmImage: 'ubuntu-latest'
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  displayName: 'Download Terraform Plan'
                  inputs:
                    buildType: 'current'
                    artifactName: 'terraform-plan'
                    targetPath: '$(Pipeline.Workspace)/terraform-plan'

                - task: TerraformInstaller@0
                  displayName: 'Install Terraform'
                  inputs:
                    terraformVersion: $(terraformVersion)

                - task: AzureCLI@2
                  displayName: 'Terraform Apply: ${{ parameters.stack }}'
                  inputs:
                    azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    workingDirectory: $(workingDirectory)
                    inlineScript: |
                      chmod +x scripts/deploy-stack.sh
                      ./scripts/deploy-stack.sh apply ${{ parameters.stack }} ${{ parameters.environment }}

                - task: AzureCLI@2
                  displayName: 'Verify Deployment Status'
                  inputs:
                    azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    workingDirectory: $(workingDirectory)
                    inlineScript: |
                      ./scripts/deploy-stack.sh status ${{ parameters.environment }}
```

#### Step 3: Create and Run Pipeline

1. Pipelines → New pipeline
2. Select repository source
3. Select "Existing Azure Pipelines YAML file"
4. Path: `/azure-pipelines-infrastructure.yml`
5. Run pipeline with parameters:
   - Environment: `dev`
   - Stack: `all`

### Phase 3: Application Pipeline

#### Step 1: Create Application Variable Group

1. Pipelines → Library → + Variable group
2. Variable group name: `srvthreds-app-dev`
3. Add variables:
   - `ACR_NAME`: `cazsrvthredsdeacr`
   - `AKS_RESOURCE_GROUP`: `CAZ-SRVTHREDS-D-E-RG`
   - `AKS_CLUSTER_NAME`: `CAZ-SRVTHREDS-D-E-AKS`
   - `IMAGE_NAME`: `srvthreds`
   - `NAMESPACE`: `srvthreds`
4. Save

#### Step 2: Create Application Pipeline

**`azure-pipelines-app.yml`:**
```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - src/**
      - package.json
      - Dockerfile
      - infrastructure/kubernetes/**

parameters:
  - name: environment
    displayName: 'Environment to deploy'
    type: string
    default: 'dev'
    values:
      - dev
      - test
      - prod

variables:
  - group: srvthreds-app-${{ parameters.environment }}
  - name: imageTag
    value: '$(Build.BuildId)'
  - name: imageName
    value: '$(ACR_NAME).azurecr.io/$(IMAGE_NAME)'

stages:
  - stage: Build
    displayName: 'Build and Push Docker Image'
    jobs:
      - job: BuildJob
        displayName: 'Build Docker Image'
        pool:
          vmImage: 'ubuntu-latest'

        steps:
          - task: Docker@2
            displayName: 'Build Docker Image'
            inputs:
              command: build
              repository: $(IMAGE_NAME)
              dockerfile: '$(Build.SourcesDirectory)/Dockerfile'
              tags: |
                $(imageTag)
                latest

          - task: AzureCLI@2
            displayName: 'Push to ACR'
            inputs:
              azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az acr login --name $(ACR_NAME)
                docker tag $(IMAGE_NAME):$(imageTag) $(imageName):$(imageTag)
                docker tag $(IMAGE_NAME):latest $(imageName):latest
                docker push $(imageName):$(imageTag)
                docker push $(imageName):latest

          - task: PublishPipelineArtifact@1
            displayName: 'Publish Kubernetes Manifests'
            inputs:
              targetPath: 'infrastructure/kubernetes/${{ parameters.environment }}'
              artifact: 'k8s-manifests'
              publishLocation: 'pipeline'

  - stage: Deploy
    displayName: 'Deploy to AKS'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployJob
        displayName: 'Deploy to Kubernetes'
        pool:
          vmImage: 'ubuntu-latest'
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: DownloadPipelineArtifact@2
                  displayName: 'Download Manifests'
                  inputs:
                    buildType: 'current'
                    artifactName: 'k8s-manifests'
                    targetPath: '$(Pipeline.Workspace)/k8s-manifests'

                - task: AzureCLI@2
                  displayName: 'Get AKS Credentials'
                  inputs:
                    azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      az aks get-credentials \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --name $(AKS_CLUSTER_NAME) \
                        --overwrite-existing

                - task: Kubernetes@1
                  displayName: 'Create Namespace'
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: 'azure-srvthreds-${{ parameters.environment }}'
                    azureResourceGroup: $(AKS_RESOURCE_GROUP)
                    kubernetesCluster: $(AKS_CLUSTER_NAME)
                    command: 'apply'
                    useConfigurationFile: true
                    inline: |
                      apiVersion: v1
                      kind: Namespace
                      metadata:
                        name: $(NAMESPACE)

                - task: AzureCLI@2
                  displayName: 'Create Secrets and ConfigMaps'
                  inputs:
                    azureSubscription: 'azure-srvthreds-${{ parameters.environment }}'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      # Get connection strings
                      COSMOS_CONN=$(az cosmosdb keys list \
                        --name caz-srvthreds-d-e-cosmos \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --type connection-strings \
                        --query "connectionStrings[0].connectionString" \
                        --output tsv)

                      REDIS_KEY=$(az redis list-keys \
                        --name CAZ-SRVTHREDS-D-E-REDIS \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --query primaryKey \
                        --output tsv)

                      REDIS_HOST=$(az redis show \
                        --name CAZ-SRVTHREDS-D-E-REDIS \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --query hostName \
                        --output tsv)

                      SERVICEBUS_CONN=$(az servicebus namespace authorization-rule keys list \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --namespace-name caz-srvthreds-d-e-sbus \
                        --name RootManageSharedAccessKey \
                        --query primaryConnectionString \
                        --output tsv)

                      APP_INSIGHTS_KEY=$(az monitor app-insights component show \
                        --app CAZ-SRVTHREDS-D-E-APPI \
                        --resource-group $(AKS_RESOURCE_GROUP) \
                        --query instrumentationKey \
                        --output tsv)

                      ACR_PASSWORD=$(az acr credential show \
                        --name $(ACR_NAME) \
                        --query "passwords[0].value" \
                        --output tsv)

                      # Create secrets
                      kubectl create secret generic srvthreds-secrets \
                        --namespace=$(NAMESPACE) \
                        --from-literal=mongodb-uri="$COSMOS_CONN" \
                        --from-literal=redis-password="$REDIS_KEY" \
                        --from-literal=servicebus-connection="$SERVICEBUS_CONN" \
                        --from-literal=appinsights-key="$APP_INSIGHTS_KEY" \
                        --dry-run=client -o yaml | kubectl apply -f -

                      kubectl create configmap srvthreds-config \
                        --namespace=$(NAMESPACE) \
                        --from-literal=redis-host="$REDIS_HOST" \
                        --from-literal=redis-port="6380" \
                        --from-literal=node-env="production" \
                        --dry-run=client -o yaml | kubectl apply -f -

                      kubectl create secret docker-registry acr-secret \
                        --namespace=$(NAMESPACE) \
                        --docker-server=$(ACR_NAME).azurecr.io \
                        --docker-username=$(ACR_NAME) \
                        --docker-password="$ACR_PASSWORD" \
                        --dry-run=client -o yaml | kubectl apply -f -

                - task: KubernetesManifest@0
                  displayName: 'Deploy to AKS'
                  inputs:
                    action: 'deploy'
                    kubernetesServiceConnection: 'azure-srvthreds-${{ parameters.environment }}'
                    namespace: $(NAMESPACE)
                    manifests: |
                      $(Pipeline.Workspace)/k8s-manifests/*.yaml

                - task: Kubernetes@1
                  displayName: 'Verify Deployment'
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: 'azure-srvthreds-${{ parameters.environment }}'
                    azureResourceGroup: $(AKS_RESOURCE_GROUP)
                    kubernetesCluster: $(AKS_CLUSTER_NAME)
                    namespace: $(NAMESPACE)
                    command: 'get'
                    arguments: 'all'

                - task: Kubernetes@1
                  displayName: 'Check Rollout Status'
                  inputs:
                    connectionType: 'Azure Resource Manager'
                    azureSubscriptionEndpoint: 'azure-srvthreds-${{ parameters.environment }}'
                    azureResourceGroup: $(AKS_RESOURCE_GROUP)
                    kubernetesCluster: $(AKS_CLUSTER_NAME)
                    namespace: $(NAMESPACE)
                    command: 'rollout'
                    arguments: 'status deployment/srvthreds'
```

#### Step 3: Create and Run Application Pipeline

1. Pipelines → New pipeline
2. Select repository source
3. Select "Existing Azure Pipelines YAML file"
4. Path: `/azure-pipelines-app.yml`
5. Run pipeline

---

## Comparison Matrix

| Feature | Manual | GitHub Actions | Azure DevOps |
|---------|--------|----------------|--------------|
| **Setup Time** | 1-2 hours | 2-3 hours | 3-4 hours |
| **Automation** | None | Full | Full |
| **Cost** | Free | Free (generous limits) | Free (basic), Paid (advanced) |
| **Best For** | Development, Learning | GitHub repos, Open source | Enterprise, Azure-native |
| **CI/CD** | Manual | Yes | Yes |
| **Infrastructure as Code** | Manual | Yes | Yes |
| **Rollback** | Manual kubectl | Automated | Automated |
| **Multi-Environment** | Manual | Yes (via environments) | Yes (via stages) |
| **Approval Gates** | Manual | Yes (environments) | Yes (approvals) |
| **Build Artifacts** | Local | GitHub Packages | Azure Artifacts |
| **Secrets Management** | Azure Key Vault | GitHub Secrets | Azure Key Vault + Variable Groups |
| **Integration Testing** | Manual | Yes | Yes |
| **Monitoring** | Manual check | Via actions | Advanced (Test Plans) |
| **Learning Curve** | Low | Medium | High |
| **Team Collaboration** | Low | Medium | High |

---

## Troubleshooting

### Common Issues - Infrastructure

**Issue: Terraform state lock timeout**
```bash
# Solution: Release lock manually
cd infrastructure/cloud/terraform/stacks/<stack-name>
terraform force-unlock <lock-id>
```

**Issue: AKS deployment fails**
```bash
# Check quota limits
az vm list-usage --location eastus --output table

# Check AKS diagnostics
az aks show --name CAZ-SRVTHREDS-D-E-AKS --resource-group CAZ-SRVTHREDS-D-E-RG
```

**Issue: Application Gateway NSG rules**
```bash
# Verify NSG rules allow 65200-65535
az network nsg rule list \
  --nsg-name CAZ-SRVTHREDS-D-E-NET-VNET-gateway-nsg \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --output table
```

### Common Issues - Application

**Issue: Pods not starting**
```bash
# Check pod logs
kubectl logs -n srvthreds -l app=srvthreds --tail=100

# Describe pod for events
kubectl describe pod -n srvthreds <pod-name>

# Check secrets exist
kubectl get secrets -n srvthreds
```

**Issue: Image pull errors**
```bash
# Verify ACR secret
kubectl get secret acr-secret -n srvthreds -o yaml

# Test ACR connectivity from AKS
kubectl run test --image=cazsrvthredsdeacr.azurecr.io/srvthreds:latest \
  --namespace=srvthreds \
  --image-pull-policy=Always \
  --rm -it -- /bin/sh
```

**Issue: Application not accessible**
```bash
# Check service
kubectl get svc -n srvthreds

# Check ingress
kubectl get ingress -n srvthreds

# Port forward for testing
kubectl port-forward -n srvthreds svc/srvthreds 8080:80
curl http://localhost:8080/health
```

### Useful Commands

```bash
# Infrastructure
cd infrastructure/cloud/terraform
./scripts/deploy-stack.sh status dev
./scripts/deploy-stack.sh destroy <stack> dev  # Careful!

# Application
kubectl get all -n srvthreds
kubectl logs -n srvthreds -l app=srvthreds -f
kubectl exec -it -n srvthreds <pod-name> -- /bin/sh
kubectl rollout restart deployment/srvthreds -n srvthreds

# Monitoring
kubectl top nodes
kubectl top pods -n srvthreds
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Debugging
kubectl describe pod -n srvthreds <pod-name>
kubectl get pod -n srvthreds <pod-name> -o yaml
az monitor app-insights query \
  --app CAZ-SRVTHREDS-D-E-APPI \
  --analytics-query "requests | take 100"
```

---

## Next Steps

### Phase 1: Manual Deployment (Recommended First)
1. ✅ Deploy infrastructure manually
2. ✅ Deploy application manually
3. ✅ Verify everything works
4. ✅ Document any issues

### Phase 2: GitHub Actions
1. Create GitHub workflows
2. Set up repository secrets
3. Test automated deployments
4. Add PR validation
5. Set up staging environment

### Phase 3: Azure DevOps (Optional)
1. Migrate to Azure DevOps if needed
2. Set up advanced pipelines
3. Implement test plans
4. Set up release management

---

## Support and Documentation

- **Infrastructure README**: `infrastructure/cloud/terraform/README.md`
- **Stacks README**: `infrastructure/cloud/terraform/stacks/README.md`
- **Azure Documentation**: https://docs.microsoft.com/azure
- **Kubernetes Documentation**: https://kubernetes.io/docs
- **Terraform Documentation**: https://www.terraform.io/docs

---

**Document Version**: 1.0
**Last Updated**: 2025-11-10
**Maintained By**: Platform Team
