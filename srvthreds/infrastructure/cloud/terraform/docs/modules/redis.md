# Azure Cache for Redis Module

Terraform module for creating a secure Azure Cache for Redis with private endpoint support, cluster mode, data persistence, and high availability options.

## Overview

This module creates an Azure Cache for Redis following best practices:

- **Multiple SKU tiers** - Basic, Standard, Premium for different workloads
- **Private endpoint support** - Network isolation via private link
- **Data persistence** - RDB and AOF backup for Premium tier
- **Cluster mode** - Horizontal scaling with sharding (Premium)
- **Zone redundancy** - High availability across availability zones
- **TLS encryption** - Minimum TLS 1.2 for secure connections
- **VNet injection** - Deploy Redis into your VNet (Premium)
- **Patch schedules** - Control maintenance windows
- **Redis 6 support** - Latest Redis features and performance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Private Endpoint Subnet (10.0.1.0/24)              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Private Endpoint                           │  │ │
│  │  │   (privatelink.redis.cache.windows.net)           │  │ │
│  │  │                                                    │  │ │
│  │  │  Private IP: 10.0.1.7                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                    ↓                                    │ │
│  │            Private DNS Zone                             │ │
│  │    caz-srvthreds-p-e-redis.redis.cache.windows.net    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────────┐
         │   Azure Cache for Redis               │
         │                                       │
         │   SKU: Premium P1                     │
         │   Memory: 6 GB                        │
         │   Redis Version: 6                    │
         │                                       │
         │   Features:                           │
         │   • Zone Redundant (3 AZs)            │
         │   • TLS 1.2 Encryption                │
         │   • RDB Backup (Hourly)               │
         │   • Cluster Mode (3 shards)           │
         │   • Replicas per Primary (2)          │
         │   • Private Access Only               │
         └───────────────────────────────────────┘
                         ↑
              ┌──────────────────────┐
              │  Applications        │
              │  Redis Clients       │
              │  (TLS Required)      │
              └──────────────────────┘

Premium SKU with VNet Injection:
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Redis Subnet (10.0.3.0/24)                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Azure Cache for Redis                      │  │ │
│  │  │        (Injected into VNet)                       │  │ │
│  │  │                                                    │  │ │
│  │  │  Primary: 10.0.3.4                                │  │ │
│  │  │  Replicas: 10.0.3.5, 10.0.3.6                     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Development Cache

```hcl
module "redis" {
  source = "../../modules/azure/redis"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Basic SKU for development
  sku_name = "Basic"
  family   = "C"
  capacity = 0  # C0 = 250 MB

  # Redis 6
  redis_version = "6"

  # Public access for development
  public_network_access_enabled = true
  enable_private_endpoint       = false

  # Enable authentication (recommended)
  enable_authentication = true
  minimum_tls_version   = "1.2"

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Standard Tier with High Availability

```hcl
module "redis" {
  source = "../../modules/azure/redis"

  environment         = "test"
  location            = "eastus"
  resource_group_name = "srvthreds-test-rg"

  # Standard SKU (with replication)
  sku_name = "Standard"
  family   = "C"
  capacity = 1  # C1 = 1 GB

  # Redis configuration
  redis_version       = "6"
  minimum_tls_version = "1.2"

  # Memory management
  maxmemory_policy = "allkeys-lru"

  # Patch schedule (Sunday 2 AM UTC)
  patch_schedule = [
    {
      day_of_week        = "Sunday"
      start_hour_utc     = 2
      maintenance_window = "PT5H"
    }
  ]

  # Private endpoint
  enable_private_endpoint     = true
  private_endpoint_subnet_id  = module.networking.subnet_ids["private_endpoints"]
  vnet_id                     = module.networking.vnet_id

  tags = {
    Project = "SrvThreds"
  }
}
```

### Production Premium Cluster with Persistence

```hcl
module "redis" {
  source = "../../modules/azure/redis"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Premium SKU for production features
  sku_name = "Premium"
  family   = "P"
  capacity = 1  # P1 = 6 GB

  # Zone redundancy (Premium only)
  zones = ["1", "2", "3"]

  # Cluster mode with 3 shards (Premium only)
  shard_count = 3

  # High availability: 2 replicas per primary
  replicas_per_primary = 2

  # Redis configuration
  redis_version       = "6"
  minimum_tls_version = "1.2"
  enable_authentication = true

  # Memory management
  maxmemory_policy                = "allkeys-lru"
  maxmemory_reserved              = 615  # ~10% of 6GB
  maxmemory_delta                 = 615
  maxfragmentationmemory_reserved = 615

  # RDB persistence (hourly backups)
  rdb_backup_enabled            = true
  rdb_backup_frequency          = 60  # minutes
  rdb_backup_max_snapshot_count = 1
  rdb_storage_connection_string = module.storage.primary_connection_string

  # Keyspace notifications (for expired keys, etc.)
  notify_keyspace_events = "Ex"

  # Private endpoint only
  enable_private_endpoint       = true
  public_network_access_enabled = false
  private_endpoint_subnet_id    = module.networking.subnet_ids["private_endpoints"]
  vnet_id                       = module.networking.vnet_id

  # Maintenance window
  patch_schedule = [
    {
      day_of_week        = "Sunday"
      start_hour_utc     = 2
      maintenance_window = "PT5H"
    }
  ]

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}

# Storage account for RDB backups
module "storage" {
  source = "../../modules/azure/storage"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  account_tier        = "Standard"
  replication_type    = "GRS"
}
```

### Premium with VNet Injection

```hcl
module "redis" {
  source = "../../modules/azure/redis"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Premium SKU required for VNet injection
  sku_name = "Premium"
  family   = "P"
  capacity = 2  # P2 = 13 GB

  # Inject Redis into dedicated subnet (Premium only)
  subnet_id = module.networking.subnet_ids["redis"]

  # Zone redundancy
  zones = ["1", "2", "3"]

  # Cluster mode
  shard_count          = 2
  replicas_per_primary = 1

  # AOF persistence (every write persisted)
  aof_backup_enabled              = true
  aof_storage_connection_string_0 = module.storage.primary_connection_string
  aof_storage_connection_string_1 = module.storage.secondary_connection_string

  # Network access (VNet injection doesn't use private endpoint)
  public_network_access_enabled = false
  enable_private_endpoint       = false

  tags = {
    Project = "SrvThreds"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `sku_name` | SKU name (Basic, Standard, Premium) | `string` | `"Basic"` | no |
| `family` | SKU family (C for Basic/Standard, P for Premium) | `string` | `"C"` | no |
| `capacity` | Size of Redis cache (0-6 for C/P family) | `number` | `0` | no |
| `redis_version` | Redis version (4 or 6) | `string` | `"6"` | no |
| `minimum_tls_version` | Minimum TLS version (1.0, 1.1, 1.2) | `string` | `"1.2"` | no |
| `enable_authentication` | Enable Redis authentication | `bool` | `true` | no |
| `enable_non_ssl_port` | Enable non-SSL port (6379) | `bool` | `false` | no |
| `maxmemory_reserved` | Memory reserved for non-cache operations (MB) | `number` | `null` | no |
| `maxmemory_delta` | Memory delta reserved for non-cache operations (MB) | `number` | `null` | no |
| `maxmemory_policy` | Eviction policy (volatile-lru, allkeys-lru, etc.) | `string` | `"volatile-lru"` | no |
| `maxfragmentationmemory_reserved` | Memory reserved for fragmentation (MB) | `number` | `null` | no |
| `aof_backup_enabled` | Enable AOF persistence (Premium only) | `bool` | `false` | no |
| `aof_storage_connection_string_0` | Storage connection string for AOF backup primary | `string` | `""` | no |
| `aof_storage_connection_string_1` | Storage connection string for AOF backup secondary | `string` | `""` | no |
| `rdb_backup_enabled` | Enable RDB backup (Premium only) | `bool` | `false` | no |
| `rdb_backup_frequency` | RDB backup frequency in minutes (15, 30, 60, 360, 720, 1440) | `number` | `60` | no |
| `rdb_backup_max_snapshot_count` | Maximum number of RDB snapshots to retain | `number` | `1` | no |
| `rdb_storage_connection_string` | Storage connection string for RDB backup | `string` | `""` | no |
| `notify_keyspace_events` | Keyspace notifications configuration | `string` | `""` | no |
| `public_network_access_enabled` | Enable public network access | `bool` | `true` | no |
| `subnet_id` | Subnet ID for VNet injection (Premium only) | `string` | `""` | no |
| `enable_private_endpoint` | Enable private endpoint for Redis | `bool` | `false` | no |
| `private_endpoint_subnet_id` | Subnet ID for private endpoint | `string` | `""` | no |
| `vnet_id` | VNet ID for private DNS zone linking | `string` | `""` | no |
| `shard_count` | Number of shards for clustering (Premium only, 1-10) | `number` | `0` | no |
| `replicas_per_master` | Number of replicas per master (Premium only) | `number` | `null` | no |
| `replicas_per_primary` | Number of replicas per primary (Premium only) | `number` | `null` | no |
| `zones` | Availability zones (Premium only) | `list(string)` | `null` | no |
| `patch_schedule` | Maintenance patch schedule | `list(object)` | `[]` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `redis_id` | The ID of the Redis cache |
| `redis_name` | The name of the Redis cache |
| `redis_hostname` | The hostname of the Redis cache |
| `redis_ssl_port` | The SSL port of the Redis cache |
| `redis_port` | The non-SSL port of the Redis cache |
| `redis_primary_access_key` | The primary access key for the Redis cache |
| `redis_secondary_access_key` | The secondary access key for the Redis cache |
| `redis_primary_connection_string` | The primary connection string for the Redis cache |
| `redis_secondary_connection_string` | The secondary connection string for the Redis cache |
| `private_endpoint_id` | The ID of the private endpoint |
| `private_ip_addresses` | Private IP addresses of the private endpoint |
| `private_dns_zone_id` | The ID of the private DNS zone |

## Security

### TLS Encryption

Always use TLS 1.2 and disable non-SSL port:

```hcl
minimum_tls_version = "1.2"
enable_non_ssl_port = false
enable_authentication = true
```

Connect with TLS:

```bash
# Redis CLI with TLS
redis-cli -h caz-srvthreds-p-e-redis.redis.cache.windows.net \
  -p 6380 \
  -a {access-key} \
  --tls
```

### Private Endpoint Access

Enable private endpoint for VNet-only access:

```hcl
enable_private_endpoint       = true
public_network_access_enabled = false
private_endpoint_subnet_id    = module.networking.subnet_ids["private_endpoints"]
vnet_id                       = module.networking.vnet_id
```

Test private DNS resolution:

```bash
# From within VNet
nslookup caz-srvthreds-p-e-redis.redis.cache.windows.net
# Should resolve to private IP (10.0.1.x)
```

### Access Key Rotation

Rotate keys regularly:

```bash
# Regenerate primary key
az redis regenerate-key \
  --name caz-srvthreds-p-e-redis \
  --resource-group srvthreds-prod-rg \
  --key-type Primary

# Update applications to use secondary key
# Then regenerate secondary key
az redis regenerate-key \
  --name caz-srvthreds-p-e-redis \
  --resource-group srvthreds-prod-rg \
  --key-type Secondary
```

Store keys in Key Vault:

```bash
# Store in Key Vault
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-P-E-KEY \
  --name redis-primary-key \
  --value {primary-key}
```

## Data Persistence

### RDB Persistence (Premium Only)

Point-in-time snapshots:

```hcl
rdb_backup_enabled            = true
rdb_backup_frequency          = 60  # Hourly backups
rdb_backup_max_snapshot_count = 1
rdb_storage_connection_string = module.storage.primary_connection_string
```

Backup frequencies:
- 15 minutes (maximum cost)
- 30 minutes
- 60 minutes (recommended)
- 6 hours
- 12 hours
- 24 hours (minimum cost)

### AOF Persistence (Premium Only)

Write-ahead log for every operation:

```hcl
aof_backup_enabled              = true
aof_storage_connection_string_0 = module.storage.primary_connection_string
aof_storage_connection_string_1 = module.storage.secondary_connection_string
```

Trade-offs:
- **RDB**: Lower cost, point-in-time recovery, potential data loss (up to backup frequency)
- **AOF**: Higher cost, every write persisted, minimal data loss

## High Availability

### Standard Tier Replication

Automatic primary-replica replication:

```hcl
sku_name = "Standard"
family   = "C"
capacity = 1
```

- Primary for read/write
- Replica for read-only (automatic failover)
- 99.9% SLA

### Premium Tier Options

**Zone Redundancy:**

```hcl
sku_name = "Premium"
zones    = ["1", "2", "3"]
```

- Replicas across availability zones
- 99.95% SLA

**Multiple Replicas:**

```hcl
replicas_per_primary = 2  # 1 primary + 2 replicas
```

**Cluster Mode:**

```hcl
shard_count = 3  # Horizontal scaling
```

## Cluster Mode

Enable clustering for horizontal scaling (Premium only):

```hcl
sku_name    = "Premium"
shard_count = 3  # 1-10 shards
```

Benefits:
- Scale beyond single node limits
- Distribute data across shards
- Parallel processing

Considerations:
- Not all Redis commands support clustering
- Multi-key operations must target same shard
- Use hash tags to control key distribution

```bash
# Hash tags ensure related keys go to same shard
SET {user:123}:profile "data"
SET {user:123}:settings "data"
```

## Memory Management

### Eviction Policies

```hcl
maxmemory_policy = "allkeys-lru"
```

Policies:
- **allkeys-lru**: Evict any key, LRU (recommended for caching)
- **volatile-lru**: Evict keys with TTL, LRU (recommended for mixed workload)
- **allkeys-lfu**: Evict any key, LFU (Redis 6+)
- **volatile-lfu**: Evict keys with TTL, LFU (Redis 6+)
- **allkeys-random**: Evict random key
- **volatile-random**: Evict random key with TTL
- **volatile-ttl**: Evict key with shortest TTL
- **noeviction**: Return error when memory full

### Memory Reservations

Reserve memory for Redis operations:

```hcl
maxmemory_reserved              = 615  # ~10% of capacity
maxmemory_delta                 = 615
maxfragmentationmemory_reserved = 615
```

Recommended reservations:
- Basic/Standard: 10% of capacity
- Premium: 10-30% of capacity (higher for replication/persistence)

## Monitoring

### Metrics to Monitor

```bash
# View metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.Cache/redis/caz-srvthreds-p-e-redis \
  --metric "usedmemory,serverLoad,connectedclients"

# Set up alerts
az monitor metrics alert create \
  --name high-memory-usage \
  --resource-group srvthreds-prod-rg \
  --scopes {redis-id} \
  --condition "avg usedmemory > 5000000000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

Key metrics:
- **usedmemory**: Current memory usage
- **usedmemorypercentage**: Memory usage percentage
- **serverLoad**: CPU usage
- **connectedclients**: Number of connections
- **cachehits**: Cache hit rate
- **cachemisses**: Cache miss rate
- **getcommands**: GET operations
- **setcommands**: SET operations

### Diagnostic Logs

Enable diagnostic logging to Log Analytics:

```hcl
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "redis-diagnostics"
  target_resource_id         = module.redis.redis_id
  log_analytics_workspace_id = module.monitoring.workspace_id

  enabled_log {
    category = "ConnectedClientList"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Troubleshooting

### Connection Timeouts

**Check private endpoint DNS:**

```bash
# From within VNet
nslookup caz-srvthreds-p-e-redis.redis.cache.windows.net
# Should return private IP (10.0.1.x)

# Test connectivity
nc -zv 10.0.1.7 6380
```

**Check firewall rules:**

```bash
# Verify NSG allows Redis port 6380
az network nsg rule list \
  --resource-group srvthreds-prod-rg \
  --nsg-name aks-nsg \
  --query "[?destinationPortRange=='6380']"
```

### High Memory Usage

**Check memory metrics:**

```bash
# View memory usage
az redis show \
  --name caz-srvthreds-p-e-redis \
  --resource-group srvthreds-prod-rg \
  --query "{used: usedMemory, max: redisConfiguration.maxmemory}"
```

**Solutions:**

1. Scale up to larger capacity
2. Enable eviction policy
3. Set TTL on keys
4. Clear unused keys

```bash
# Scale up
az redis update \
  --name caz-srvthreds-p-e-redis \
  --resource-group srvthreds-prod-rg \
  --sku Premium \
  --vm-size P2
```

### Performance Issues

**Check server load:**

```bash
# View CPU usage
redis-cli -h caz-srvthreds-p-e-redis.redis.cache.windows.net \
  -p 6380 \
  -a {access-key} \
  --tls \
  INFO stats
```

**Solutions:**

1. Use clustering (Premium)
2. Optimize slow commands
3. Use connection pooling
4. Scale to larger SKU

### Backup/Restore Issues

**Check storage account access:**

```bash
# Verify storage account is accessible
az storage account show \
  --name srvthredsprodstore \
  --resource-group srvthreds-prod-rg
```

**Restore from backup:**

```bash
# Create new cache from RDB backup
az redis import \
  --name caz-srvthreds-p-e-redis-restored \
  --resource-group srvthreds-prod-rg \
  --files {blob-url-to-rdb-file}
```

## Cost Optimization

### Development Environment

```hcl
sku_name                      = "Basic"
family                        = "C"
capacity                      = 0  # C0 = 250 MB
public_network_access_enabled = true
enable_private_endpoint       = false
redis_version                 = "6"
```

Estimated cost: ~$15/month

### Production Environment

```hcl
sku_name             = "Premium"
family               = "P"
capacity             = 1  # P1 = 6 GB
zones                = ["1", "2", "3"]
shard_count          = 2
replicas_per_primary = 1
rdb_backup_enabled   = true
rdb_backup_frequency = 360  # 6 hours (lower cost than hourly)
```

Estimated cost: ~$500/month

### Cost Reduction Tips

1. **Choose appropriate tier** - Basic for dev, Standard for test, Premium for production
2. **Right-size capacity** - Monitor memory usage and scale accordingly
3. **Optimize backup frequency** - Longer intervals reduce cost
4. **Use RDB over AOF** - Lower cost for backup storage
5. **Scale down in non-production** - Reduce capacity during off-hours
6. **Monitor and optimize** - Review unused keys and inefficient patterns

## Best Practices

1. **Use TLS 1.2** - Always encrypt connections
2. **Enable private endpoints** - Network isolation for production
3. **Set eviction policy** - Prevent out-of-memory errors
4. **Use connection pooling** - Reduce connection overhead
5. **Implement retry logic** - Handle transient failures
6. **Enable persistence** - Use RDB/AOF for critical data (Premium)
7. **Monitor metrics** - Set up alerts for memory, CPU, connections
8. **Use appropriate SKU** - Premium for production workloads
9. **Enable zone redundancy** - High availability (Premium)
10. **Configure maintenance windows** - Control update times

## References

- [Azure Cache for Redis Best Practices](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-best-practices)
- [Cache Planning FAQ](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-planning-faq)
- [Data Persistence](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-persistence)
- [Clustering](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-premium-clustering)
- [Private Link](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link)
- [High Availability](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-high-availability)
- [Monitor and Alert](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-how-to-monitor)
- [Troubleshooting](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-troubleshoot-client)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
