# Azure Infrastructure Setup Guide - SrvThreds

This guide provides step-by-step instructions for setting up Azure infrastructure for SrvThreds using Infrastructure as Code (Terraform).

## Overview

The SrvThreds Azure infrastructure is managed using Terraform with the following structure:

```
infrastructure/cloud/terraform/
├── bootstrap/           # Initial state management setup (run once)
├── core/               # Core infrastructure (networking, AKS, ACR, Key Vault)
├── data/               # Data layer (CosmosDB, Redis, Service Bus)
└── app/                # Application deployments
```

## Prerequisites

Before you begin, ensure you have:

1. **Azure CLI** installed and configured:
   ```bash
   # Install Azure CLI (if not already installed)
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

   # Login to Azure
   az login

   # List available subscriptions
   az account list --output table

   # Set your subscription
   az account set --subscription "<your-subscription-name-or-id>"
   ```

2. **Terraform** installed (v1.5+):
   ```bash
   # Install Terraform
   brew install terraform  # macOS
   # OR
   # Download from https://www.terraform.io/downloads

   # Verify installation
   terraform version
   ```

3. **Node.js** and **npm** installed (for Terraform CLI wrapper):
   ```bash
   node --version  # Should be v18+
   npm --version
   ```

4. **Azure Subscription Information**:
   ```bash
   # Get your subscription ID
   az account show --query id -o tsv

   # Get your tenant ID
   az account show --query tenantId -o tsv
   ```

   Save these values - you'll need them for configuration.

## Setup Phases

### Phase 1: Bootstrap Terraform State Management

The bootstrap phase creates the foundational resources needed to store Terraform state remotely. This is a one-time setup that must be completed before deploying any other infrastructure.

**What gets created:**
- Resource Group for Terraform state storage
- Azure Storage Account (geo-redundant, encrypted)
- Storage Container for state files
- Management Lock to prevent accidental deletion

**Implementation:** See [cloud/terraform/bootstrap/](../../cloud/terraform/bootstrap/)

#### Step 1: Configure Variables

Navigate to the bootstrap directory:

```bash
cd infrastructure/cloud/terraform/bootstrap
```

Create your variables file from the template:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your Azure credentials:

```hcl
# Azure subscription ID (required)
subscription_id = "00000000-0000-0000-0000-000000000000"

# Azure tenant ID (required)
tenant_id = "00000000-0000-0000-0000-000000000000"

# Environment (required)
environment = "dev"  # or "staging", "production"

# Azure region (optional, defaults to eastus)
location = "eastus"

# Project name (optional, defaults to srvthreds)
project_name = "srvthreds"
```

**IMPORTANT:** Never commit `terraform.tfvars` to version control. It's already in `.gitignore`.

#### Step 2: Deploy Bootstrap Infrastructure

Use the Terraform CLI from the project root:

```bash
# Bootstrap Azure subscription (first time setup)
npm run terraformCli -- bootstrap dev
```

Type `yes` when prompted. Deployment takes ~2-3 minutes.

#### Step 3: Verify Bootstrap

The CLI will automatically save the backend configuration. You can verify the bootstrap status:

```bash
# Check bootstrap status
npm run terraformCli -- status dev
```

See [tools/terraform-cli/README.md](../../tools/terraform-cli/README.md) for more CLI commands.

### Phase 2: Core Infrastructure

The core infrastructure includes networking, Kubernetes cluster, container registry, and key management.

**What gets created:**
- Virtual Network with subnets
- Azure Kubernetes Service (AKS) cluster
- Azure Container Registry (ACR)
- Azure Key Vault for secrets management
- Network Security Groups and policies

**Implementation:** See [cloud/terraform/core/](../../cloud/terraform/core/)

#### Prerequisites

Before deploying core infrastructure:

1. Complete Phase 1 (Bootstrap) - you need remote state storage
2. Decide on your environment configuration (dev, staging, production)
3. Review environment-specific settings in [shared/configs/environments/](../../shared/configs/environments/)

#### Deployment

Use the Terraform CLI to deploy core infrastructure:

```bash
# Deploy all core stacks
npm run terraformCli -- deploy dev networking keyvault acr

# Or deploy individual stacks
npm run terraformCli -- deploy dev networking
npm run terraformCli -- deploy dev keyvault
npm run terraformCli -- deploy dev acr
```

### Phase 3: Data Layer

The data layer deploys managed database and messaging services.

**What gets created:**
- Azure CosmosDB (MongoDB API)
- Azure Cache for Redis
- Azure Service Bus (or RabbitMQ alternative)
- Private endpoints and network integration

**Implementation:** See [cloud/terraform/data/](../../cloud/terraform/data/)

#### Configuration Options

Data layer configuration is driven by [config-registry.enhanced.yaml](../../config-registry.enhanced.yaml) with environment-specific overrides in [shared/configs/environments/](../../shared/configs/environments/).

Example for production:
- CosmosDB: Standard tier with 4000 RU/s, autoscaling to 10000 RU/s
- Redis: Premium tier (P1) with 2 replicas
- Service Bus: Standard tier

Example for dev:
- CosmosDB: Standard tier with 400 RU/s (minimum)
- Redis: Basic tier (C0) - smallest size
- Service Bus: Basic tier

#### Deployment

Use the Terraform CLI to deploy data layer:

```bash
# Deploy all data stacks
npm run terraformCli -- deploy dev cosmosdb redis servicebus

# Or deploy individual stacks
npm run terraformCli -- deploy dev cosmosdb
npm run terraformCli -- deploy dev redis
npm run terraformCli -- deploy dev servicebus
```

### Phase 4: Application Deployment

The application layer deploys SrvThreds services to AKS using Kubernetes manifests generated from configuration.

**What gets deployed:**
- SrvThreds Engine
- Session Agent
- Persistence Agent
- Supporting services

**Implementation:** See [cloud/terraform/app/](../../cloud/terraform/app/) and [shared/kubernetes/](../../shared/kubernetes/)

#### Deployment

Application deployment uses Helm charts and Kubernetes manifests:

```bash
npm run terraformCli -- deploy dev aks
```

## Configuration Management

All infrastructure configuration is centralized in a registry-based system:

### Base Configuration

[config-registry.enhanced.yaml](../../config-registry.enhanced.yaml) defines defaults for all services, databases, and cloud resources.

### Environment Overlays

Environment-specific configurations override base settings:

- [environments/dev.yaml](../../shared/configs/environments/dev.yaml) - Development environment
  - Single replicas, minimal resources
  - Basic tier managed services
  - Debug logging enabled

- [environments/staging.yaml](../../shared/configs/environments/staging.yaml) - Staging environment
  - 2 replicas, production-like but smaller
  - Standard tier managed services
  - Info logging

- [environments/production.yaml](../../shared/configs/environments/production.yaml) - Production environment
  - 3+ replicas with high availability
  - Premium tier managed services with autoscaling
  - Comprehensive monitoring and alerting

### Type Safety

TypeScript type definitions ensure configuration validity:
- [types/config-registry.types.ts](../../shared/configs/types/config-registry.types.ts)

## Security Best Practices

### 1. Credentials Management

**DO NOT hardcode credentials**. Use one of these methods:

**Azure CLI Authentication (Development):**
```bash
az login
az account set --subscription "<subscription-name>"
```

**Service Principal (CI/CD):**
```bash
# Create service principal
az ad sp create-for-rbac \
  --name "terraform-srvthreds-sp" \
  --role Contributor \
  --scopes /subscriptions/${SUBSCRIPTION_ID}

# Export credentials for Terraform
export ARM_CLIENT_ID="<appId>"
export ARM_CLIENT_SECRET="<password>"
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_TENANT_ID="<tenant-id>"
```

**Managed Identity (Azure Resources):**
When running Terraform from Azure resources (like Azure DevOps agents), use Managed Identity.

### 2. State File Security

Terraform state files contain sensitive information:

- ✅ Stored in encrypted Azure Storage
- ✅ Access restricted with RBAC
- ✅ Versioning enabled for rollback
- ✅ Management lock prevents deletion
- ✅ Geo-redundant storage (GRS)

### 3. Secrets in Key Vault

All application secrets are stored in Azure Key Vault:

- JWT signing keys
- Database connection strings
- API keys and tokens
- Service principal credentials

Reference secrets in configuration:
```yaml
security:
  jwt:
    secretKeyRef:
      azure: "azure-keyvault://srvthreds-${ENV}/jwt-secret"
```

### 4. Network Security

- Private endpoints for managed services
- Network Security Groups (NSGs) on subnets
- Azure Policy for compliance
- Pod Security Policies in AKS

## Cost Management

### Budget Alerts

Set up cost alerts to avoid unexpected charges:

```bash
# Create monthly budget (using Azure CLI)
az consumption budget create \
  --budget-name "srvthreds-${ENV}-budget" \
  --amount 500 \
  --time-grain Monthly \
  --start-date $(date -u +%Y-%m-01T00:00:00Z) \
  --category Cost

# Add alerts at 75%, 85%, 100%
az consumption budget update \
  --budget-name "srvthreds-${ENV}-budget" \
  --notifications '{
    "75": {"enabled": true, "operator": "GreaterThan", "threshold": 75},
    "85": {"enabled": true, "operator": "GreaterThan", "threshold": 85},
    "100": {"enabled": true, "operator": "GreaterThan", "threshold": 100}
  }'
```

### Cost Estimation by Environment

**Development:**
- AKS: ~$75/month (2 x B2s nodes)
- CosmosDB: ~$25/month (400 RU/s)
- Redis: ~$15/month (Basic C0)
- Storage/Networking: ~$10/month
- **Total: ~$125/month**

**Staging:**
- AKS: ~$150/month (3 x D2s_v3 nodes)
- CosmosDB: ~$60/month (1000 RU/s)
- Redis: ~$30/month (Standard C1)
- Storage/Networking: ~$20/month
- **Total: ~$260/month**

**Production:**
- AKS: ~$400/month (5 x D4s_v3 nodes with autoscaling)
- CosmosDB: ~$200/month (4000 RU/s with autoscaling)
- Redis: ~$350/month (Premium P1 with replicas)
- Storage/Networking: ~$50/month
- Monitoring: ~$50/month
- **Total: ~$1,050/month**

### Cost Optimization Tips

1. **Use dev environment for testing** - Significantly cheaper than staging/prod
2. **Enable autoscaling** - Scale down during off-hours
3. **Review resource utilization** - Right-size VMs and database tiers
4. **Use reserved instances** - Save up to 72% on AKS nodes for production
5. **Clean up unused resources** - Delete test deployments

## Monitoring and Observability

### Azure Monitor Integration

All environments include monitoring via:

- **Application Insights** - Application performance monitoring
- **Log Analytics** - Centralized logging
- **Prometheus + Grafana** - Metrics and dashboards (staging/production)
- **Azure Monitor Alerts** - Proactive alerting

Configuration in environment overlays:

```yaml
monitoring:
  enabled: true
  prometheus:
    enabled: true
    retention: "90d"
  logging:
    retention: "90d"
  tracing:
    enabled: true
    samplingRate: 0.1  # 10% sampling in production
```

### Accessing Logs

```bash
# Application logs via kubectl
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Azure Monitor queries
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerLog | where TimeGenerated > ago(1h)"
```

## Disaster Recovery

### Backup Strategy

Production environment includes:

- **CosmosDB:** Point-in-time recovery enabled, cross-region replication
- **Redis:** Geo-replication for Premium tier
- **Terraform State:** Geo-redundant storage with versioning
- **AKS:** Automated backups of persistent volumes

Configuration in [production.yaml](../../shared/configs/environments/production.yaml):

```yaml
backup:
  enabled: true
  schedule: "0 1 * * *"  # Daily at 1 AM
  retention: "90d"
  pointInTimeRecovery: true
  crossRegionReplication: true
```

### Recovery Procedures

**State File Recovery:**
```bash
# List state file versions
az storage blob list \
  --account-name <storage-account> \
  --container-name tfstate

# Download previous version
az storage blob download \
  --account-name <storage-account> \
  --container-name tfstate \
  --name <state-file> \
  --version-id <version-id>
```

**Infrastructure Rebuild:**
```bash
# Re-deploy infrastructure using CLI
npm run terraformCli -- deploy production
```

## Troubleshooting

### Common Issues

**1. Terraform State Lock:**

If you see "state lock" errors:
```bash
# Check for active locks
az storage blob show \
  --account-name <storage-account> \
  --container-name tfstate \
  --name <state-file>.lock

# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

**2. Resource Name Conflicts:**

Storage account names must be globally unique. If you get naming conflicts:
- The bootstrap includes a random suffix
- Try running the CLI bootstrap command again for a new suffix
- Or manually set a unique name in the environment tfvars file

**3. Insufficient Permissions:**

If you see permission errors:
```bash
# Check your current role assignments
az role assignment list \
  --assignee $(az account show --query user.name -o tsv)

# You need at least Contributor role on the subscription
```

**4. Quota Exceeded:**

If you hit Azure quota limits:
```bash
# Check current quotas
az vm list-usage --location eastus -o table

# Request quota increase via Azure Portal
# Support > New support request > Service and subscription limits
```

### Debug Mode

Enable detailed Terraform logging with the CLI:

```bash
npm run terraformCli -- --debug deploy dev
```

## Next Steps

After completing the infrastructure setup:

1. **Configure CI/CD Pipeline**
   - Set up GitHub Actions or Azure DevOps
   - Use service principal authentication
   - Implement automated testing and deployment

2. **Set Up Monitoring Dashboards**
   - Create custom Grafana dashboards
   - Configure alerting rules
   - Set up on-call rotations

3. **Implement Backup Testing**
   - Regularly test recovery procedures
   - Document recovery time objectives (RTO)
   - Validate cross-region failover

4. **Security Hardening**
   - Enable Azure Policy compliance
   - Implement Pod Security Policies
   - Configure network policies
   - Set up vulnerability scanning

## Additional Resources

- [Terraform CLI Documentation](../../tools/terraform-cli/README.md)
- [Configuration Guide](../../shared/configs/CONFIGURATION-GUIDE.md)
- [Azure Best Practices](https://docs.microsoft.com/azure/architecture/best-practices/)
- [Terraform Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review Terraform and Azure documentation
3. Check existing issues in the project repository
4. Contact the infrastructure team

---

**Last Updated:** 2025-01-11
**Document Version:** 2.0
**Terraform Version:** >= 1.5
**Azure Provider Version:** ~> 3.0
