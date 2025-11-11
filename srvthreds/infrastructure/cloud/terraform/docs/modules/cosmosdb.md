# Azure Cosmos DB (MongoDB API) Module

Terraform module for creating a secure Azure Cosmos DB account configured for MongoDB API with private endpoint support, multi-region replication, and production-ready backup configuration.

## Overview

This module creates an Azure Cosmos DB account with MongoDB API following best practices:

- **MongoDB API compatibility** - Use familiar MongoDB drivers and tools
- **Flexible consistency levels** - Session, eventual, strong, bounded staleness
- **Geo-replication** - Multi-region write and read capabilities
- **Zone redundancy** - High availability within regions
- **Private endpoint support** - Network isolation via private link
- **Automated backups** - Periodic or continuous backup modes
- **Serverless option** - Pay-per-request pricing for development
- **Autoscale throughput** - Automatic RU/s scaling for variable workloads
- **No local authentication** - Azure AD and managed identity support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Private Endpoint Subnet (10.0.1.0/24)              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Private Endpoint                           │  │ │
│  │  │   (privatelink.mongo.cosmos.azure.com)            │  │ │
│  │  │                                                    │  │ │
│  │  │  Private IP: 10.0.1.6                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                    ↓                                    │ │
│  │            Private DNS Zone                             │ │
│  │    cazsrvthredsdecosmos.mongo.cosmos.azure.com        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────────┐
         │   Azure Cosmos DB Account             │
         │   (MongoDB API)                       │
         │                                       │
         │   Primary Region: eastus              │
         │   ├─ Zone Redundant                   │
         │   ├─ Read/Write                       │
         │   └─ Failover Priority: 0             │
         │                                       │
         │   Failover Region: westus2            │
         │   ├─ Zone Redundant                   │
         │   ├─ Read/Write (multi-region)        │
         │   └─ Failover Priority: 1             │
         │                                       │
         │   Features:                           │
         │   • Consistency: Session              │
         │   • Backup: Periodic (4h interval)    │
         │   • Storage: Geo-redundant            │
         │   • Throughput: Autoscale (400-4000)  │
         └───────────────────────────────────────┘
                         ↑
              ┌──────────────────────┐
              │  Applications        │
              │  MongoDB Drivers     │
              │  (Managed Identity)  │
              └──────────────────────┘
```

## Usage

### Basic Development Database

```hcl
module "cosmosdb" {
  source = "../../modules/azure/cosmosdb"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"
  database_name       = "srvthreds"

  # Serverless mode for development (pay-per-request)
  enable_serverless = true

  # Public access for development
  public_network_access_enabled = true
  enable_private_endpoint       = false

  # Minimal backup
  backup_type              = "Periodic"
  backup_interval_minutes  = 1440  # Daily
  backup_retention_hours   = 24    # 1 day
  backup_storage_redundancy = "Local"

  # Free tier (one per subscription)
  enable_free_tier = true

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Production Database with Autoscale

```hcl
module "cosmosdb" {
  source = "../../modules/azure/cosmosdb"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  database_name       = "srvthreds"

  # MongoDB configuration
  mongo_server_version = "4.2"
  consistency_level    = "Session"

  # Zone redundancy in primary region
  zone_redundant = true

  # Private endpoint only
  enable_private_endpoint      = true
  public_network_access_enabled = false
  private_endpoint_subnet_id   = module.networking.subnet_ids["private_endpoints"]
  vnet_id                      = module.networking.vnet_id

  # Autoscale throughput
  enable_autoscale = true
  max_throughput   = 4000  # Auto-scale between 400-4000 RU/s

  # Production backup
  backup_type               = "Continuous"
  backup_storage_redundancy = "Geo"

  # Automatic failover for multi-region
  enable_automatic_failover = true

  # Disable key-based authentication
  disable_local_auth = true

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

### Multi-Region Geo-Replicated Database

```hcl
module "cosmosdb" {
  source = "../../modules/azure/cosmosdb"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  database_name       = "srvthreds"

  # Primary region
  zone_redundant = true

  # Additional regions for geo-replication
  failover_locations = [
    {
      location       = "westus2"
      priority       = 1
      zone_redundant = true
    },
    {
      location       = "northeurope"
      priority       = 2
      zone_redundant = true
    }
  ]

  # Multi-region configuration
  consistency_level         = "BoundedStaleness"
  max_staleness_interval    = 5      # seconds
  max_staleness_prefix      = 100    # operations
  enable_automatic_failover = true

  # Private endpoint in primary region
  enable_private_endpoint     = true
  private_endpoint_subnet_id  = module.networking.subnet_ids["private_endpoints"]
  vnet_id                     = module.networking.vnet_id

  # Provisioned throughput (shared across regions)
  database_throughput = 10000  # RU/s

  # Geo-redundant backup
  backup_type               = "Continuous"
  backup_storage_redundancy = "Geo"

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
  }
}
```

### With Analytical Storage (Synapse Link)

```hcl
module "cosmosdb" {
  source = "../../modules/azure/cosmosdb"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  database_name       = "srvthreds"

  # Enable analytical storage for Azure Synapse Link
  enable_analytical_storage = true

  # Autoscale for transactional workload
  enable_autoscale = true
  max_throughput   = 10000

  # Private endpoint
  enable_private_endpoint     = true
  private_endpoint_subnet_id  = module.networking.subnet_ids["private_endpoints"]
  vnet_id                     = module.networking.vnet_id

  tags = {
    Project = "SrvThreds"
    Purpose = "Analytics"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `database_name` | Name of the MongoDB database | `string` | `"srvthreds"` | no |
| `mongo_server_version` | MongoDB server version (3.2, 3.6, 4.0, 4.2) | `string` | `"4.2"` | no |
| `consistency_level` | Consistency level (BoundedStaleness, Eventual, Session, Strong, ConsistentPrefix) | `string` | `"Session"` | no |
| `max_staleness_interval` | Max staleness interval in seconds (for BoundedStaleness) | `number` | `5` | no |
| `max_staleness_prefix` | Max staleness prefix (for BoundedStaleness) | `number` | `100` | no |
| `zone_redundant` | Enable zone redundancy for primary region | `bool` | `false` | no |
| `failover_locations` | Additional geo-locations for multi-region setup | `list(object)` | `[]` | no |
| `enable_serverless` | Enable serverless mode (no throughput provisioning) | `bool` | `false` | no |
| `database_throughput` | Database-level throughput (RU/s) - ignored if serverless or autoscale enabled | `number` | `400` | no |
| `enable_autoscale` | Enable autoscale for throughput | `bool` | `false` | no |
| `max_throughput` | Maximum throughput when autoscale is enabled | `number` | `4000` | no |
| `backup_type` | Backup type (Periodic or Continuous) | `string` | `"Periodic"` | no |
| `backup_interval_minutes` | Backup interval in minutes (60-1440 for Periodic) | `number` | `240` | no |
| `backup_retention_hours` | Backup retention in hours (8-720 for Periodic) | `number` | `24` | no |
| `backup_storage_redundancy` | Backup storage redundancy (Geo, Local, Zone) | `string` | `"Local"` | no |
| `public_network_access_enabled` | Enable public network access | `bool` | `false` | no |
| `enable_virtual_network_filter` | Enable virtual network filter | `bool` | `false` | no |
| `virtual_network_rule_ids` | List of subnet IDs for VNet rules | `list(string)` | `[]` | no |
| `ip_range_filter` | List of IP addresses or CIDR blocks to allow | `list(string)` | `[]` | no |
| `enable_private_endpoint` | Enable private endpoint for CosmosDB | `bool` | `true` | no |
| `private_endpoint_subnet_id` | Subnet ID for private endpoint | `string` | `""` | no |
| `vnet_id` | VNet ID for private DNS zone linking | `string` | `""` | no |
| `enable_analytical_storage` | Enable analytical storage (Synapse Link) | `bool` | `false` | no |
| `disable_local_auth` | Disable local (key-based) authentication | `bool` | `false` | no |
| `enable_automatic_failover` | Enable automatic failover for multi-region | `bool` | `false` | no |
| `enable_free_tier` | Enable free tier (one per subscription) | `bool` | `false` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `cosmosdb_id` | The ID of the CosmosDB account |
| `cosmosdb_endpoint` | The endpoint used to connect to the CosmosDB account |
| `cosmosdb_connection_strings` | CosmosDB MongoDB connection strings (primary and secondary) |
| `cosmosdb_primary_connection_string` | Primary MongoDB connection string (recommended for most use cases) |
| `cosmosdb_primary_key` | Primary master key for the CosmosDB account |
| `cosmosdb_secondary_key` | Secondary master key for the CosmosDB account |
| `cosmosdb_primary_readonly_key` | Primary readonly master key for the CosmosDB account |
| `cosmosdb_secondary_readonly_key` | Secondary readonly master key for the CosmosDB account |
| `database_id` | The ID of the MongoDB database |
| `database_name` | The name of the MongoDB database |
| `private_endpoint_id` | The ID of the private endpoint |
| `private_ip_addresses` | Private IP addresses of the private endpoint |
| `private_dns_zone_id` | The ID of the private DNS zone |

## Security

### Managed Identity Authentication

Disable key-based authentication and use managed identities:

```hcl
disable_local_auth = true
```

Grant access via RBAC:

```bash
# Grant Cosmos DB Built-in Data Contributor role
az cosmosdb sql role assignment create \
  --account-name cazsrvthredspecosmos \
  --resource-group srvthreds-prod-rg \
  --scope "/" \
  --principal-id {managed-identity-object-id} \
  --role-definition-id 00000000-0000-0000-0000-000000000002
```

### Private Endpoint Access

Enable private endpoint for VNet-only access:

```hcl
enable_private_endpoint        = true
public_network_access_enabled  = false
private_endpoint_subnet_id     = module.networking.subnet_ids["private_endpoints"]
vnet_id                        = module.networking.vnet_id
```

Test private DNS resolution:

```bash
# From within VNet
nslookup cazsrvthredspecosmos.mongo.cosmos.azure.com
# Should resolve to private IP (10.0.1.x)
```

### Network Restrictions

Restrict access by IP or VNet:

```hcl
# IP firewall
ip_range_filter = ["203.0.113.0/24", "198.51.100.0/24"]

# VNet service endpoints
enable_virtual_network_filter = true
virtual_network_rule_ids      = [
  module.networking.subnet_ids["aks"],
  module.networking.subnet_ids["app"]
]
```

### Backup and Disaster Recovery

**Continuous Backup (recommended for production):**

```hcl
backup_type               = "Continuous"
backup_storage_redundancy = "Geo"
```

- Point-in-time restore within last 30 days
- Restore to any second
- Geo-redundant storage

**Periodic Backup:**

```hcl
backup_type               = "Periodic"
backup_interval_minutes   = 240  # 4 hours
backup_retention_hours    = 720  # 30 days
backup_storage_redundancy = "Geo"
```

Restore from backup:

```bash
# List restorable timestamps (Continuous backup)
az cosmosdb restorable-database-account list \
  --account-name cazsrvthredspecosmos \
  --location eastus

# Restore to specific point in time
az cosmosdb restore \
  --target-database-account-name cazsrvthredspecosmos-restored \
  --account-name cazsrvthredspecosmos \
  --restore-timestamp "2025-01-11T12:00:00Z" \
  --location eastus \
  --resource-group srvthreds-prod-rg
```

## Consistency Levels

Cosmos DB offers five consistency levels:

| Level | Description | Use Case |
|-------|-------------|----------|
| **Strong** | Linearizability guarantee | Financial transactions, inventory |
| **Bounded Staleness** | Reads lag by K versions or T time | Low-latency with consistency bounds |
| **Session** | Read-your-writes within session | User sessions, shopping carts |
| **Consistent Prefix** | Reads never see out-of-order writes | Social feeds, comments |
| **Eventual** | Lowest latency, eventual consistency | Analytics, telemetry |

```hcl
# Session consistency (default, recommended for most scenarios)
consistency_level = "Session"

# Bounded staleness for multi-region
consistency_level      = "BoundedStaleness"
max_staleness_interval = 5    # 5 seconds max lag
max_staleness_prefix   = 100  # 100 operations max lag
```

## Throughput Management

### Serverless (Development)

Pay-per-request pricing:

```hcl
enable_serverless = true
```

- No provisioned throughput
- Automatically scales to zero
- Best for development and bursty workloads
- Maximum 5,000 RU/s per collection

### Provisioned Throughput

Fixed RU/s allocation:

```hcl
database_throughput = 400  # Minimum 400 RU/s
```

### Autoscale (Production)

Automatically scales between 10% and 100% of max:

```hcl
enable_autoscale = true
max_throughput   = 4000  # Scales between 400-4000 RU/s
```

Cost optimization:
- Scales down to 10% of max when idle
- Scales up automatically under load
- Best for variable workloads

## Multi-Region Configuration

### Read Replicas

```hcl
failover_locations = [
  {
    location       = "westus2"
    priority       = 1
    zone_redundant = true
  }
]

# Read from nearest region automatically
consistency_level = "Session"
```

### Multi-Region Writes

Enable automatic failover for multi-region writes:

```hcl
enable_automatic_failover = true

failover_locations = [
  {
    location       = "westus2"
    priority       = 1
    zone_redundant = true
  },
  {
    location       = "northeurope"
    priority       = 2
    zone_redundant = true
  }
]
```

Manual failover:

```bash
# Trigger manual failover
az cosmosdb failover-priority-change \
  --name cazsrvthredspecosmos \
  --resource-group srvthreds-prod-rg \
  --failover-policies "eastus=1" "westus2=0"
```

## Database Operations

### Connect with MongoDB Driver

```javascript
// Node.js example with managed identity
const { MongoClient } = require('mongodb');

// Get connection string from Terraform output
const connectionString = process.env.COSMOS_CONNECTION_STRING;

const client = new MongoClient(connectionString, {
  retryWrites: false,
  maxIdleTimeMS: 120000
});

await client.connect();
const db = client.db('srvthreds');
const collection = db.collection('events');

// Standard MongoDB operations
await collection.insertOne({ type: 'test', timestamp: new Date() });
const events = await collection.find({}).toArray();
```

### Monitor RU Consumption

```bash
# View metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredspecosmos \
  --metric "TotalRequestUnits"

# Set up alerts for high RU consumption
az monitor metrics alert create \
  --name high-ru-consumption \
  --resource-group srvthreds-prod-rg \
  --scopes {cosmos-id} \
  --condition "avg TotalRequestUnits > 3000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## Troubleshooting

### Connection Timeout Errors

**Check private endpoint DNS resolution:**

```bash
# From within VNet
nslookup cazsrvthredspecosmos.mongo.cosmos.azure.com
# Should return private IP (10.0.1.x)

# Check private DNS zone link
az network private-dns link vnet list \
  --resource-group srvthreds-prod-rg \
  --zone-name privatelink.mongo.cosmos.azure.com
```

### Rate Limiting (429 Errors)

**Increase throughput or enable autoscale:**

```hcl
# Option 1: Increase provisioned throughput
database_throughput = 10000

# Option 2: Enable autoscale
enable_autoscale = true
max_throughput   = 10000
```

**Check RU consumption:**

```bash
# View request unit metrics
az cosmosdb show \
  --name cazsrvthredspecosmos \
  --resource-group srvthreds-prod-rg \
  --query "{currentUsage: currentUsage, maxUsage: maxUsage}"
```

### High Latency

**Enable multi-region reads:**

```hcl
failover_locations = [
  {
    location       = "westus2"  # Add region closer to users
    priority       = 1
    zone_redundant = true
  }
]
```

**Check consistency level:**

```hcl
# Use weaker consistency for lower latency
consistency_level = "Session"  # or "Eventual"
```

### Backup Restore Issues

**Verify restorable account:**

```bash
# List all restorable accounts
az cosmosdb restorable-database-account list

# Show restorable timestamps
az cosmosdb restorable-database-account show \
  --location eastus \
  --instance-id {instance-id}
```

## Cost Optimization

### Development Environment

```hcl
enable_serverless             = true
enable_free_tier              = true  # First 1000 RU/s and 25 GB free
backup_type                   = "Periodic"
backup_interval_minutes       = 1440  # Daily
backup_retention_hours        = 24
backup_storage_redundancy     = "Local"
public_network_access_enabled = true
enable_private_endpoint       = false
```

Estimated cost: Free tier covers most dev workloads

### Production Environment

```hcl
enable_autoscale              = true
max_throughput                = 4000  # Scales down to 400 when idle
zone_redundant                = true
backup_type                   = "Continuous"
backup_storage_redundancy     = "Geo"
enable_automatic_failover     = true
```

Estimated cost: ~$200-500/month (varies with usage)

### Cost Reduction Tips

1. **Use autoscale** - Scales down to 10% of max when idle
2. **Choose appropriate consistency** - Weaker consistency = lower latency = lower RU cost
3. **Optimize queries** - Use indexes, avoid cross-partition queries
4. **Monitor RU consumption** - Set alerts for unexpected spikes
5. **Use serverless for development** - Pay only for what you use
6. **Share throughput** - Use database-level throughput for multiple collections

## Best Practices

1. **Use Session consistency** - Best balance of performance and consistency
2. **Enable autoscale** - Cost-effective for variable workloads
3. **Enable private endpoints** - Network isolation for production
4. **Use continuous backup** - Point-in-time restore for critical data
5. **Disable local auth** - Use managed identities and Azure AD
6. **Enable zone redundancy** - High availability within regions
7. **Monitor RU consumption** - Set up alerts for rate limiting
8. **Use connection pooling** - Reduce connection overhead
9. **Implement retry logic** - Handle transient failures and rate limits
10. **Index wisely** - Balance query performance and RU cost

## References

- [Cosmos DB Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/best-practices)
- [Cosmos DB MongoDB API](https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/introduction)
- [Consistency Levels](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Request Units](https://learn.microsoft.com/en-us/azure/cosmos-db/request-units)
- [Autoscale](https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale)
- [Backup and Restore](https://learn.microsoft.com/en-us/azure/cosmos-db/online-backup-and-restore)
- [Private Link](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints)
- [Multi-Region](https://learn.microsoft.com/en-us/azure/cosmos-db/distribute-data-globally)
- [Managed Identity Authentication](https://learn.microsoft.com/en-us/azure/cosmos-db/managed-identity-based-authentication)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
