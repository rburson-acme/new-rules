# Terraform Documentation

Comprehensive documentation for SrvThreds cloud infrastructure deployment using Terraform.

## 📚 Documentation Index

### Getting Started

- **[Deployment Guide](deployment-guide.md)** - How to deploy infrastructure to Azure
- **[State Backend Setup Guide](state-backend-guide.md)** - Setting up Terraform remote state backend
- **[Stacks Guide](stacks-guide.md)** - Stack-based deployment with dependency resolution
- **[Best Practices](best-practices.md)** - Terraform coding standards and patterns
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

### Terraform Modules

All Azure infrastructure modules with complete API documentation:

#### Core Infrastructure
- **[Networking](modules/networking.md)** - VNet, subnets, NSGs, private DNS zones
- **[AKS](modules/aks.md)** - Azure Kubernetes Service with private cluster configuration
- **[ACR](modules/acr.md)** - Azure Container Registry with private endpoint
- **[Key Vault](modules/keyvault.md)** - Key Vault with RBAC and private endpoint

#### Data Services
- **[Cosmos DB](modules/cosmosdb.md)** - Cosmos DB with MongoDB API
- **[Redis](modules/redis.md)** - Azure Cache for Redis
- **[Service Bus](modules/servicebus.md)** - Azure Service Bus messaging

#### Security & Networking
- **[RBAC](modules/rbac.md)** - Centralized role-based access control management
- **[Private Endpoint](modules/private-endpoint.md)** - Private endpoint helper module
- **[App Gateway](modules/appgateway.md)** - Application Gateway with WAF

#### Monitoring
- **[Monitoring](modules/monitoring.md)** - Log Analytics and Application Insights

## 🚀 Quick Start

### Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or
choco install terraform  # Windows

# Install Azure CLI
brew install azure-cli  # macOS
# or
choco install azure-cli  # Windows

# Login to Azure
az login
```

### Setup State Backend

```bash
# Using Terraform CLI (from project root)
npm run terraformCli -- state-backend dev
```

### Deploy Infrastructure

```bash
# Using Terraform CLI (from project root)
npm run terraformCli -- deploy dev

# Deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault
```

## 📖 Module Usage Pattern

All modules follow a consistent pattern:

```hcl
module "example" {
  source = "../../modules/azure/module-name"

  # Required variables
  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Module-specific configuration
  # ... see module documentation for details

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

## 🏗️ Infrastructure Architecture

```
Azure Subscription
├── Resource Groups (per environment)
│   ├── Networking
│   │   ├── VNet
│   │   ├── Subnets
│   │   ├── NSGs
│   │   └── Private DNS Zones
│   │
│   ├── Compute
│   │   ├── AKS Cluster (private)
│   │   └── ACR (private endpoint)
│   │
│   ├── Data Services
│   │   ├── Cosmos DB (MongoDB API)
│   │   ├── Redis Cache
│   │   └── Service Bus
│   │
│   ├── Security
│   │   ├── Key Vault (RBAC)
│   │   └── RBAC Assignments
│   │
│   └── Monitoring
│       ├── Log Analytics Workspace
│       └── Application Insights
```

## 🔐 Security Principles

All modules implement security best practices:

1. **Private by Default** - Public access disabled unless explicitly enabled
2. **Managed Identities** - No service principals with secrets
3. **RBAC Authorization** - Least privilege access model
4. **Network Isolation** - Private endpoints for production
5. **Encryption** - At rest and in transit (TLS 1.2 minimum)

## 🧪 Testing

Infrastructure tests validate module configurations:

```bash
# Run infrastructure tests
npm test infrastructure/test

# Validate deployment plan
npm run terraformCli -- plan dev
```

The Terraform CLI automatically validates and formats code during deployment operations.

See [Infrastructure Tests](../../../test/README.md) for details.

## 📝 Contributing

When creating or modifying modules:

1. **Follow naming conventions** - Army NETCOM standard (CAZ-APPNAME-ENV-REGION-TYPE)
2. **Document thoroughly** - Update module `.md` file in `docs/modules/`
3. **Include examples** - Basic, standard, and production configurations
4. **Test changes** - Run validation and tests before committing
5. **Security first** - Default to secure configurations

## 🔗 Related Documentation

- **[Azure Setup Guide](../../../docs/cloud/AZURE-SETUP-GUIDE.md)** - Initial Azure configuration
- **[Azure RBAC Guide](../../../docs/cloud/AZURE-RBAC-GUIDE.md)** - Role-based access control
- **[Security Requirements](../../../docs/cloud/AZURE-SECURITY-REQUIREMENTS.md)** - Security compliance
- **[Terraform CLI Tool](../../../tools/terraform-cli/README.md)** - Deployment automation

---

**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
