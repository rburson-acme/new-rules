# Azure Key Vault Module

Terraform module for creating a secure Azure Key Vault with RBAC authorization, private endpoint support, and production-ready security configuration.

## Overview

This module creates an Azure Key Vault following security best practices:

- **RBAC authorization** - Azure RBAC instead of legacy access policies
- **Private endpoint** - Network isolation via private link
- **Soft delete enabled** - Protect against accidental deletion
- **Purge protection** - Prevent permanent deletion (production)
- **Network restrictions** - Default deny with Azure service bypass
- **Premium SKU support** - HSM-backed keys for critical workloads
- **Audit logging** - Integration with Azure Monitor

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Private Endpoint Subnet (10.0.1.0/24)              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Private Endpoint                           │  │ │
│  │  │        (privatelink.vaultcore.azure.net)          │  │ │
│  │  │                                                    │  │ │
│  │  │  Private IP: 10.0.1.5                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                    ↓                                    │ │
│  │            Private DNS Zone                             │  │
│  │    CAZ-SRVTHREDS-D-E-KEY.vault.azure.net              │  │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
              ┌──────────────────────┐
              │  Azure Key Vault     │
              │                      │
              │  Authorization:      │
              │  • Azure RBAC        │
              │  • Managed Identity  │
              │                      │
              │  Security:           │
              │  • Soft Delete (90d) │
              │  • Purge Protection  │
              │  • Network ACL       │
              │                      │
              │  Contents:           │
              │  • Secrets           │
              │  • Keys (RSA/EC)     │
              │  • Certificates      │
              └──────────────────────┘
                         ↑
              ┌──────────────────────┐
              │  AKS Cluster         │
              │  CSI Driver          │
              │  (Secrets User)      │
              └──────────────────────┘
```

## Usage

### Basic Development Key Vault

```hcl
module "keyvault" {
  source = "../../modules/azure/keyvault"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Network configuration
  vnet_id   = module.networking.vnet_id
  subnet_id = module.networking.subnet_ids["private_endpoints"]

  # Allow public access for development
  public_network_access_enabled = true

  # Standard SKU
  sku_name = "standard"

  # No purge protection for dev
  purge_protection_enabled = false

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Production Key Vault with Enhanced Security

```hcl
module "keyvault" {
  source = "../../modules/azure/keyvault"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Network configuration
  vnet_id   = module.networking.vnet_id
  subnet_id = module.networking.subnet_ids["private_endpoints"]

  # Private endpoint only
  public_network_access_enabled = false

  # Premium SKU for HSM-backed keys
  sku_name = "premium"

  # Enable all security features
  purge_protection_enabled   = true
  soft_delete_retention_days = 90

  # RBAC authorization (default)
  enable_rbac_authorization = true

  # Azure platform integrations
  enabled_for_disk_encryption     = true
  enabled_for_deployment          = false
  enabled_for_template_deployment = false

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}

# Grant access via RBAC
resource "azurerm_role_assignment" "keyvault_admin" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}
```

### With AKS CSI Driver Integration

```hcl
module "keyvault" {
  source = "../../modules/azure/keyvault"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  vnet_id             = module.networking.vnet_id
  subnet_id           = module.networking.subnet_ids["private_endpoints"]

  sku_name                 = "standard"
  purge_protection_enabled = true

  tags = { Project = "SrvThreds" }
}

module "aks" {
  source = "../../modules/azure/aks"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  aks_subnet_id       = module.networking.subnet_ids["aks"]

  # Enable Key Vault secrets provider
  enable_key_vault_secrets_provider = true
  key_vault_secrets_rotation_enabled = true
  key_vault_secrets_rotation_interval = "2m"

  # ... other AKS configuration ...
}

# Grant AKS CSI driver access to Key Vault
resource "azurerm_role_assignment" "aks_kv_secrets_user" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.aks.key_vault_secrets_provider_identity.object_id
}
```

### With Application Managed Identity

```hcl
# Create user-assigned managed identity for application
resource "azurerm_user_assigned_identity" "app" {
  name                = "srvthreds-app-identity"
  resource_group_name = "srvthreds-prod-rg"
  location            = "eastus"
}

module "keyvault" {
  source = "../../modules/azure/keyvault"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  vnet_id             = module.networking.vnet_id
  subnet_id           = module.networking.subnet_ids["private_endpoints"]

  tags = { Project = "SrvThreds" }
}

# Grant application identity access to secrets
resource "azurerm_role_assignment" "app_secrets_user" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Grant application identity access to certificates
resource "azurerm_role_assignment" "app_certs_user" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Certificates User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `vnet_id` | ID of the VNet for private endpoint | `string` | n/a | yes |
| `subnet_id` | ID of the subnet for private endpoint | `string` | n/a | yes |
| `sku_name` | SKU name for Key Vault (standard or premium) | `string` | `"standard"` | no |
| `enabled_for_deployment` | Allow Azure VMs to retrieve certificates | `bool` | `false` | no |
| `enabled_for_disk_encryption` | Allow Azure Disk Encryption to retrieve secrets | `bool` | `true` | no |
| `enabled_for_template_deployment` | Allow Azure Resource Manager to retrieve secrets | `bool` | `false` | no |
| `enable_rbac_authorization` | Use Azure RBAC for authorization instead of access policies | `bool` | `true` | no |
| `purge_protection_enabled` | Enable purge protection (recommended for prod) | `bool` | `false` | no |
| `soft_delete_retention_days` | Number of days to retain deleted vaults (7-90) | `number` | `90` | no |
| `public_network_access_enabled` | Enable public network access (should be false for production) | `bool` | `false` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `key_vault_id` | ID of the Key Vault |
| `key_vault_name` | Name of the Key Vault |
| `key_vault_uri` | URI of the Key Vault |
| `private_endpoint_id` | ID of the Key Vault private endpoint |
| `private_dns_zone_id` | ID of the private DNS zone |

## Security

### RBAC Authorization

This module uses Azure RBAC (not legacy access policies):

```hcl
enable_rbac_authorization = true
```

**Key Vault RBAC Roles:**

| Role | Description | Use Case |
|------|-------------|----------|
| **Key Vault Administrator** | Full access to all Key Vault operations | Administrators, infrastructure automation |
| **Key Vault Secrets User** | Read secret contents | Applications, AKS CSI driver |
| **Key Vault Secrets Officer** | Manage secrets (CRUD) | CI/CD pipelines, secret rotation |
| **Key Vault Certificates User** | Read certificates | Applications, load balancers |
| **Key Vault Crypto User** | Encrypt/decrypt with keys | Applications using envelope encryption |
| **Key Vault Reader** | Read metadata only (not secret values) | Monitoring, auditing |

Grant access with RBAC:

```bash
# Grant secrets access to managed identity
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee {managed-identity-object-id} \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/CAZ-SRVTHREDS-P-E-KEY
```

### Network Security

Default deny with Azure service bypass:

```hcl
network_acls {
  default_action = "Deny"
  bypass         = "AzureServices"
  ip_rules       = []
}
```

Access options:
1. **Private endpoint** (recommended) - VNet-only access
2. **Firewall rules** - Allow specific public IPs
3. **Azure service bypass** - Allow trusted Azure services

### Soft Delete and Purge Protection

**Soft Delete** (always enabled):
- Deleted secrets/keys/certificates retained for 7-90 days
- Can be recovered during retention period
- Protects against accidental deletion

```hcl
soft_delete_retention_days = 90
```

**Purge Protection** (recommended for production):
- Prevents permanent deletion during retention period
- **WARNING:** Cannot be disabled once enabled
- Required for regulatory compliance

```hcl
purge_protection_enabled = true
```

### Premium SKU (HSM-Backed Keys)

Use Premium SKU for HSM-protected keys:

```hcl
sku_name = "premium"
```

Create HSM-backed key:

```bash
az keyvault key create \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name my-hsm-key \
  --protection hsm \
  --kty RSA-HSM \
  --size 4096
```

## Secret Management

### Create Secrets

```bash
# Using Azure CLI
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password \
  --value "my-secret-password"

# With managed identity (no login required)
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name api-key \
  --value "abc123" \
  --auth-mode login
```

### Retrieve Secrets

```bash
# Get secret value
az keyvault secret show \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password \
  --query value -o tsv
```

### Secret Versioning

Key Vault automatically versions secrets:

```bash
# List all versions
az keyvault secret list-versions \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password

# Get specific version
az keyvault secret show \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password \
  --version {version-id}
```

### Secret Rotation

Implement automated rotation:

```bash
# Set expiration
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password \
  --value "new-password" \
  --expires "2025-12-31T23:59:59Z"

# Configure rotation notification
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password \
  --value "password" \
  --not-before "2025-01-01T00:00:00Z"
```

## Key Management

### Create Keys

```bash
# RSA key (standard SKU)
az keyvault key create \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name encryption-key \
  --kty RSA \
  --size 4096

# EC key for signing
az keyvault key create \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name signing-key \
  --kty EC \
  --curve P-256

# HSM-backed key (premium SKU)
az keyvault key create \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name hsm-key \
  --protection hsm \
  --kty RSA-HSM \
  --size 4096
```

### Encrypt/Decrypt

```bash
# Encrypt data
az keyvault key encrypt \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name encryption-key \
  --algorithm RSA-OAEP \
  --value "sensitive data"

# Decrypt data
az keyvault key decrypt \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name encryption-key \
  --algorithm RSA-OAEP \
  --value {encrypted-value}
```

## Certificate Management

### Import Certificate

```bash
# Import PFX certificate
az keyvault certificate import \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name wildcard-cert \
  --file certificate.pfx \
  --password {pfx-password}
```

### Create Self-Signed Certificate

```bash
# Create policy file
cat > policy.json <<EOF
{
  "issuerParameters": { "name": "Self" },
  "keyProperties": {
    "exportable": true,
    "keySize": 2048,
    "keyType": "RSA",
    "reuseKey": false
  },
  "x509CertificateProperties": {
    "subject": "CN=srvthreds.example.com",
    "validityInMonths": 12
  }
}
EOF

# Create certificate
az keyvault certificate create \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name app-cert \
  --policy @policy.json
```

## Monitoring

### Diagnostic Logs

Enable diagnostic logging to Log Analytics:

```hcl
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "keyvault-diagnostics"
  target_resource_id         = module.keyvault.key_vault_id
  log_analytics_workspace_id = module.monitoring.workspace_id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_log {
    category = "AzurePolicyEvaluationDetails"
  }

  metric {
    category = "AllMetrics"
  }
}
```

### Query Logs

```bash
# View audit events in Log Analytics
az monitor log-analytics query \
  --workspace {workspace-id} \
  --analytics-query "AzureDiagnostics | where ResourceType == 'VAULTS' and Category == 'AuditEvent'"
```

### Alerts

Monitor for suspicious activity:

```hcl
resource "azurerm_monitor_metric_alert" "keyvault_availability" {
  name                = "keyvault-availability"
  resource_group_name = "srvthreds-prod-rg"
  scopes              = [module.keyvault.key_vault_id]
  description         = "Alert when Key Vault availability drops"

  criteria {
    metric_namespace = "Microsoft.KeyVault/vaults"
    metric_name      = "Availability"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 99
  }
}
```

## Troubleshooting

### Access Denied Errors

**Check RBAC permissions**:

```bash
# List role assignments
az role assignment list --scope {key-vault-id}

# Verify your identity
az ad signed-in-user show --query objectId -o tsv

# Grant yourself access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee {your-object-id} \
  --scope {key-vault-id}
```

### Cannot Access from Application

**Check managed identity configuration**:

```bash
# Verify managed identity is assigned
az webapp identity show --name myapp --resource-group srvthreds-prod-rg

# Verify role assignment
IDENTITY_ID=$(az webapp identity show --name myapp --resource-group srvthreds-prod-rg --query principalId -o tsv)
az role assignment list --assignee $IDENTITY_ID --scope {key-vault-id}
```

### Private Endpoint DNS Issues

**Check DNS resolution**:

```bash
# From within VNet
nslookup CAZ-SRVTHREDS-P-E-KEY.vault.azure.net
# Should return private IP (10.0.1.x)

# Check private DNS zone link
az network private-dns link vnet list \
  --resource-group srvthreds-prod-rg \
  --zone-name privatelink.vaultcore.azure.net
```

### Soft-Deleted Secrets

**Recover deleted secret**:

```bash
# List deleted secrets
az keyvault secret list-deleted --vault-name CAZ-SRVTHREDS-P-E-KEY

# Recover secret
az keyvault secret recover \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password

# Purge permanently (if purge protection disabled)
az keyvault secret purge \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name database-password
```

## Cost Optimization

### Standard vs Premium SKU

**Standard SKU:**
- $0.03 per 10,000 operations
- Software-protected keys
- Suitable for most workloads

**Premium SKU:**
- $1/month per HSM-protected key
- Hardware-protected keys (HSM)
- Required for compliance (FIPS 140-2 Level 2)

### Optimize Operations

```bash
# Cache secrets in application (reduce operations)
# Use Key Vault references in App Service (no code changes)
# Batch operations when possible
```

## Best Practices

1. **Use RBAC authorization** - More granular than legacy access policies
2. **Enable private endpoints** - Network isolation for production
3. **Enable purge protection** - Prevent accidental permanent deletion
4. **Use managed identities** - No credentials to manage
5. **Rotate secrets regularly** - Automated rotation where possible
6. **Monitor audit logs** - Detect unauthorized access attempts
7. **Use secret versioning** - Maintain secret history
8. **Set expiration dates** - Force periodic rotation
9. **Limit permissions** - Least privilege access
10. **Use Premium SKU for sensitive keys** - HSM-backed protection

## References

- [Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Key Vault Security](https://learn.microsoft.com/en-us/azure/key-vault/general/security-features)
- [RBAC Authorization](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Private Link for Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service)
- [Soft Delete and Purge Protection](https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview)
- [Key Vault Monitoring](https://learn.microsoft.com/en-us/azure/key-vault/general/monitor-key-vault)
- [Managed Identities with Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
