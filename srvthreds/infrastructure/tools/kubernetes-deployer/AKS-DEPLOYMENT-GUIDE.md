# AKS Deployment Guide

Complete guide for deploying SrvThreds to Azure Kubernetes Service using the TypeScript deployer.

## Prerequisites

### 1. Azure CLI

Install and configure Azure CLI:

```bash
# Install Azure CLI (macOS)
brew install azure-cli

# Login to Azure
az login

# Verify login
az account show

# Set subscription (if you have multiple)
az account set --subscription <subscription-id>
```

### 2. Azure Resources

Ensure the following resources exist (provisioned via Terraform):

- **Resource Group**: `CAZ-SRVTHREDS-{D|T|P}-E-RG`
- **AKS Cluster**: `caz-srvthreds-{d|t|p}-e-aks`
- **ACR**: `cazsrvthreds{d|t|p}eacr`

### 3. kubectl

Install kubectl:

```bash
# macOS
brew install kubectl

# Verify installation
kubectl version --client
```

### 4. Docker

Docker must be running:

```bash
# Start Docker Desktop
open -a Docker

# Verify Docker is running
docker ps
```

## Deployment Steps

### Option 1: Deploy to Dev Environment

```bash
npm run aks-deploy-ts dev
```

This will:
1. ✅ Verify Azure authentication
2. ✅ Check AKS cluster exists
3. ✅ Get AKS credentials and configure kubectl
4. ✅ Verify ACR access
5. ✅ Build Docker images
6. ✅ Tag images for ACR
7. ✅ Login to ACR
8. ✅ Push images to ACR
9. ✅ Apply Kubernetes manifests
10. ✅ Wait for deployments to be ready
11. ✅ Validate pod and service health

**Expected Duration**: 3-5 minutes

### Option 2: Deploy to Test Environment

```bash
npm run aks-deploy-ts test
```

Same process as dev, but deploys to test environment resources.

### Option 3: Deploy to Production

```bash
npm run aks-deploy-ts prod
```

⚠️ **IMPORTANT**: Production deployment should be done with caution. Consider using:

```bash
# Dry run first to verify
npm run aks-deploy-ts prod -- --dry-run --verbose

# Deploy with specific tag
npm run aks-deploy-ts prod -- --tag=v1.2.3
```

## Advanced Options

### Dry Run Mode

Test deployment without making changes:

```bash
npm run aks-deploy-ts dev -- --dry-run --verbose
```

This will:
- ✅ Verify all prerequisites
- ✅ Show what would be deployed
- ❌ NOT push images to ACR
- ❌ NOT apply manifests to AKS
- ❌ NOT make any actual changes

### Verbose Logging

Get detailed logs during deployment:

```bash
npm run aks-deploy-ts dev -- --verbose
```

Shows:
- Azure CLI commands being executed
- kubectl operations
- Docker build/push progress
- Detailed error traces

### Custom Image Tag

Deploy with a specific version tag:

```bash
npm run aks-deploy-ts prod -- --tag=v1.2.3
```

This tags and pushes images as:
- `cazsrvthredspeacr.azurecr.io/srvthreds/builder:v1.2.3`

## Verification

After deployment, verify everything is working:

### 1. Check Pods

```bash
kubectl get pods -n srvthreds
```

Expected output:
```
NAME                                           READY   STATUS    RESTARTS   AGE
srvthreds-engine-xxxxxxxxxx-xxxxx              1/1     Running   0          2m
srvthreds-persistence-agent-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
srvthreds-session-agent-xxxxxxxxxx-xxxxx       1/1     Running   0          2m
```

### 2. Check Services

```bash
kubectl get svc -n srvthreds
```

### 3. Check Deployments

```bash
kubectl get deployments -n srvthreds
```

Expected:
```
NAME                          READY   UP-TO-DATE   AVAILABLE   AGE
srvthreds-engine              1/1     1            1           2m
srvthreds-persistence-agent   1/1     1            1           2m
srvthreds-session-agent       1/1     1            1           2m
```

### 4. View Logs

```bash
# Engine logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Session agent logs
kubectl logs -f deployment/srvthreds-session-agent -n srvthreds

# Persistence agent logs
kubectl logs -f deployment/srvthreds-persistence-agent -n srvthreds
```

## Environment Details

### Dev Environment

- **Resource Group**: `CAZ-SRVTHREDS-D-E-RG`
- **AKS Cluster**: `caz-srvthreds-d-e-aks`
- **ACR**: `cazsrvthredsdeacr`
- **Namespace**: `srvthreds`
- **Region**: East US

### Test Environment

- **Resource Group**: `CAZ-SRVTHREDS-T-E-RG`
- **AKS Cluster**: `caz-srvthreds-t-e-aks`
- **ACR**: `cazsrvthredsteacr`
- **Namespace**: `srvthreds`
- **Region**: East US

### Prod Environment

- **Resource Group**: `CAZ-SRVTHREDS-P-E-RG`
- **AKS Cluster**: `caz-srvthreds-p-e-aks`
- **ACR**: `cazsrvthredspeacr`
- **Namespace**: `srvthreds`
- **Region**: East US

## Troubleshooting

### Error: "Not logged in to Azure"

```bash
az login
```

### Error: "AKS cluster not found"

Verify cluster exists:
```bash
az aks list --output table
```

If cluster doesn't exist, provision via Terraform:
```bash
cd infrastructure/cloud/terraform/stacks/aks
terraform apply -var-file=dev.tfvars
```

### Error: "ACR not found"

Verify ACR exists:
```bash
az acr list --output table
```

Provision ACR via Terraform if needed:
```bash
cd infrastructure/cloud/terraform/stacks/acr
terraform apply -var-file=dev.tfvars
```

### Error: "Failed to push image to ACR"

Check ACR permissions:
```bash
az acr login --name <acr-name>
```

Verify AKS has pull permissions from ACR:
```bash
az aks show --resource-group <rg> --name <cluster> --query identityProfile
```

### Error: "Pods not ready"

Check pod events:
```bash
kubectl describe pod <pod-name> -n srvthreds
```

Common issues:
- Image pull errors (check ACR attachment)
- Resource limits (check node resources)
- Config/secret missing (check manifests)

### Error: "Context not found"

Get AKS credentials again:
```bash
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-aks \
  --overwrite-existing
```

## Cleanup

To remove a deployment:

```bash
kubectl delete namespace srvthreds
```

This will delete all resources in the namespace, but keep the AKS cluster running.

## Direct Script Access

You can also run the deployment script directly:

```bash
# Show help
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts --help

# Deploy to dev
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts dev

# Dry run to test
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts test --dry-run

# Deploy to prod with tag
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts prod --tag=v1.2.3 --verbose
```

## Programmatic Usage

For automation or custom workflows:

```typescript
import { AKSDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new AKSDeployer({
  environment: 'dev',
  verbose: true,
  imageTag: process.env.BUILD_TAG || 'latest',
});

try {
  const result = await deployer.deploy();

  if (result.success) {
    console.log('✅ Deployment successful!');
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Resources: ${result.state.deployedResources?.length}`);
  } else {
    console.error('❌ Deployment failed');
    process.exit(1);
  }
} catch (error) {
  console.error('Deployment error:', error);
  process.exit(1);
}
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy to AKS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Dev
        run: npm run aks-deploy-ts dev -- --tag=${{ github.sha }}
```

## Security Best Practices

1. **Never commit Azure credentials** - Use environment variables or Azure Key Vault
2. **Use specific image tags** - Don't rely on `latest` in production
3. **Review dry-run output** - Always test with `--dry-run` first for prod
4. **Limit ACR access** - Use AKS managed identity for ACR pull
5. **Monitor deployments** - Set up alerts for failed deployments

## Next Steps

- Set up continuous deployment pipeline
- Configure Azure Monitor for AKS
- Implement blue-green deployments
- Add automated rollback on failure
- Integrate with Azure Key Vault for secrets
