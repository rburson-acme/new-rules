# Azure Service Bus Module

Terraform module for creating a secure Azure Service Bus namespace with queues, topics, subscriptions, and private endpoint support for enterprise messaging.

## Overview

This module creates an Azure Service Bus namespace following best practices:

- **Multiple SKU tiers** - Basic, Standard, Premium for different workloads
- **Queues and Topics** - Support for point-to-point and pub/sub messaging
- **Private endpoint support** - Network isolation via private link
- **Zone redundancy** - High availability across availability zones (Premium)
- **Message persistence** - Durable message storage
- **Dead letter queues** - Automatic handling of undeliverable messages
- **Duplicate detection** - Prevent duplicate message processing
- **Session support** - Ordered message processing
- **Batching** - Improved throughput with batch operations
- **Premium features** - Larger message sizes, VNet integration, geo-disaster recovery

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Private Endpoint Subnet (10.0.1.0/24)              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Private Endpoint                           │  │ │
│  │  │   (privatelink.servicebus.windows.net)            │  │ │
│  │  │                                                    │  │ │
│  │  │  Private IP: 10.0.1.8                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                    ↓                                    │ │
│  │            Private DNS Zone                             │ │
│  │    caz-srvthreds-p-e-sbus.servicebus.windows.net      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────────┐
         │   Azure Service Bus Namespace         │
         │   (caz-srvthreds-p-e-sbus)            │
         │                                       │
         │   SKU: Premium                        │
         │   Capacity: 1 Messaging Unit          │
         │   Zone Redundant: Yes                 │
         │                                       │
         │   Queues:                             │
         │   ├─ events-queue                     │
         │   │  ├─ Max Size: 5 GB                │
         │   │  ├─ TTL: 14 days                  │
         │   │  ├─ Max Delivery: 10              │
         │   │  └─ Dead Letter Queue             │
         │   │                                   │
         │   └─ commands-queue                   │
         │      ├─ Sessions: Enabled             │
         │      └─ Duplicate Detection           │
         │                                       │
         │   Topics:                             │
         │   └─ notifications                    │
         │      ├─ Subscriptions:                │
         │      │  ├─ email-sub (filter)         │
         │      │  ├─ sms-sub (filter)           │
         │      │  └─ webhook-sub (filter)       │
         │      └─ Support Ordering              │
         └───────────────────────────────────────┘
                         ↑
              ┌──────────────────────┐
              │  Message Producers   │
              │  • AKS Pods          │
              │  • Functions         │
              │  • Logic Apps        │
              └──────────────────────┘
                         ↓
              ┌──────────────────────┐
              │  Message Consumers   │
              │  • AKS Pods          │
              │  • Functions         │
              │  • Event Grid        │
              └──────────────────────┘
```

## Usage

### Basic Queue Configuration

```hcl
module "servicebus" {
  source = "../../modules/azure/servicebus"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Basic SKU for development
  sku = "Basic"

  # Simple queue
  queues = [
    {
      name                         = "events"
      max_size_mb                  = 1024
      default_message_ttl          = "P14D"  # 14 days
      dead_lettering_on_expiration = true
      max_delivery_count           = 10
    }
  ]

  # Public access for development
  public_network_access_enabled = true
  enable_private_endpoint       = false

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Standard Tier with Topics and Subscriptions

```hcl
module "servicebus" {
  source = "../../modules/azure/servicebus"

  environment         = "test"
  location            = "eastus"
  resource_group_name = "srvthreds-test-rg"

  # Standard SKU (supports topics)
  sku = "Standard"

  # Queues
  queues = [
    {
      name                          = "commands"
      max_size_mb                   = 2048
      default_message_ttl           = "P7D"
      requires_session              = true
      requires_duplicate_detection  = true
      duplicate_detection_window    = "PT10M"
      enable_partitioning           = true
    },
    {
      name                         = "events"
      max_size_mb                  = 5120
      enable_batched_operations    = true
      enable_partitioning          = true
      dead_lettering_on_expiration = true
    }
  ]

  # Topics for pub/sub
  topics = [
    {
      name                         = "notifications"
      max_size_mb                  = 2048
      default_message_ttl          = "P1D"
      enable_partitioning          = true
      support_ordering             = true
    }
  ]

  # Subscriptions for topic
  subscriptions = [
    {
      name                         = "email-sub"
      topic_name                   = "notifications"
      max_delivery_count           = 5
      default_message_ttl          = "P1D"
      dead_lettering_on_expiration = true
    },
    {
      name                         = "sms-sub"
      topic_name                   = "notifications"
      max_delivery_count           = 3
      lock_duration                = "PT5M"
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

### Production Premium Configuration

```hcl
module "servicebus" {
  source = "../../modules/azure/servicebus"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Premium SKU for production
  sku      = "Premium"
  capacity = 1  # Messaging units (1, 2, 4, 8, 16)

  # Zone redundancy (Premium only)
  zone_redundant = true

  # Disable SAS key authentication
  local_auth_enabled = false

  # TLS 1.2 minimum
  minimum_tls_version = "1.2"

  # Private endpoint only
  enable_private_endpoint       = true
  public_network_access_enabled = false
  private_endpoint_subnet_id    = module.networking.subnet_ids["private_endpoints"]
  vnet_id                       = module.networking.vnet_id

  # Event processing queue
  queues = [
    {
      name                          = "events"
      max_message_size_kb           = 1024  # Premium: up to 100 MB
      max_size_mb                   = 5120
      default_message_ttl           = "P14D"
      dead_lettering_on_expiration  = true
      max_delivery_count            = 10
      requires_duplicate_detection  = true
      duplicate_detection_window    = "PT10M"
      lock_duration                 = "PT5M"
      enable_batched_operations     = true
      enable_partitioning           = false  # Premium doesn't need partitioning
    },
    {
      name                 = "commands"
      max_message_size_kb  = 1024
      max_size_mb          = 2048
      requires_session     = true
      enable_partitioning  = false
    }
  ]

  # Notification topic
  topics = [
    {
      name                         = "notifications"
      max_message_size_kb          = 1024
      max_size_mb                  = 5120
      default_message_ttl          = "P2D"
      requires_duplicate_detection = true
      support_ordering             = true
      enable_partitioning          = false
    },
    {
      name                = "domain-events"
      max_message_size_kb = 1024
      max_size_mb         = 5120
      support_ordering    = true
    }
  ]

  # Subscriptions with different patterns
  subscriptions = [
    {
      name                              = "email-processor"
      topic_name                        = "notifications"
      max_delivery_count                = 10
      lock_duration                     = "PT5M"
      dead_lettering_on_expiration      = true
      dead_lettering_on_filter_error    = true
      enable_batched_operations         = true
    },
    {
      name                         = "analytics"
      topic_name                   = "domain-events"
      max_delivery_count           = 3
      default_message_ttl          = "P7D"
      dead_lettering_on_expiration = true
      forward_to                   = ""  # Can forward to another queue/topic
    }
  ]

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

### With Auto-Forwarding

```hcl
module "servicebus" {
  source = "../../modules/azure/servicebus"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  sku = "Standard"

  # Source queue
  queues = [
    {
      name                     = "source-queue"
      max_size_mb              = 1024
      forward_to               = "destination-queue"  # Auto-forward messages
    },
    {
      name        = "destination-queue"
      max_size_mb = 2048
    },
    {
      name                     = "error-queue"
      max_size_mb              = 1024
    }
  ]

  # Topic with forwarding
  topics = [
    {
      name        = "events"
      max_size_mb = 2048
    }
  ]

  subscriptions = [
    {
      name                         = "processor"
      topic_name                   = "events"
      forward_dead_lettered_to     = "error-queue"  # Forward DLQ messages
    }
  ]

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
| `sku` | SKU name (Basic, Standard, Premium) | `string` | `"Basic"` | no |
| `capacity` | Messaging units for Premium SKU (1, 2, 4, 8, 16) | `number` | `1` | no |
| `zone_redundant` | Enable zone redundancy (Premium only) | `bool` | `false` | no |
| `minimum_tls_version` | Minimum TLS version (1.0, 1.1, 1.2) | `string` | `"1.2"` | no |
| `local_auth_enabled` | Enable local (SAS key) authentication | `bool` | `true` | no |
| `public_network_access_enabled` | Enable public network access | `bool` | `true` | no |
| `queues` | List of queues to create | `list(object)` | `[]` | no |
| `topics` | List of topics to create | `list(object)` | `[]` | no |
| `subscriptions` | List of topic subscriptions to create | `list(object)` | `[]` | no |
| `enable_private_endpoint` | Enable private endpoint for Service Bus | `bool` | `false` | no |
| `private_endpoint_subnet_id` | Subnet ID for private endpoint | `string` | `""` | no |
| `vnet_id` | VNet ID for private DNS zone linking | `string` | `""` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

### Queue Object Schema

```hcl
{
  name                          = string
  max_message_size_kb           = number  # Premium only, default: 256
  max_size_mb                   = number  # default: 1024
  default_message_ttl           = string  # ISO 8601, default: "P14D"
  dead_lettering_on_expiration  = bool    # default: false
  max_delivery_count            = number  # default: 10
  requires_session              = bool    # default: false
  requires_duplicate_detection  = bool    # default: false
  duplicate_detection_window    = string  # ISO 8601, default: "PT10M"
  lock_duration                 = string  # ISO 8601, default: "PT1M"
  enable_batched_operations     = bool    # default: true
  enable_partitioning           = bool    # default: false (Standard/Premium)
  enable_express                = bool    # default: false (Standard only)
  forward_to                    = string  # Queue/topic name
  forward_dead_lettered_to      = string  # Queue/topic name
}
```

### Topic Object Schema

```hcl
{
  name                          = string
  max_message_size_kb           = number  # Premium only, default: 256
  max_size_mb                   = number  # default: 1024
  default_message_ttl           = string  # ISO 8601, default: "P14D"
  requires_duplicate_detection  = bool    # default: false
  duplicate_detection_window    = string  # ISO 8601, default: "PT10M"
  enable_batched_operations     = bool    # default: true
  enable_partitioning           = bool    # default: false
  enable_express                = bool    # default: false (Standard only)
  support_ordering              = bool    # default: false
}
```

### Subscription Object Schema

```hcl
{
  name                              = string
  topic_name                        = string  # Must match a topic name
  max_delivery_count                = number  # default: 10
  default_message_ttl               = string  # ISO 8601, default: "P14D"
  lock_duration                     = string  # ISO 8601, default: "PT1M"
  dead_lettering_on_expiration      = bool    # default: false
  dead_lettering_on_filter_error    = bool    # default: false
  requires_session                  = bool    # default: false
  forward_to                        = string  # Queue/topic name
  forward_dead_lettered_to          = string  # Queue/topic name
  enable_batched_operations         = bool    # default: true
}
```

## Outputs

| Name | Description |
|------|-------------|
| `servicebus_id` | The ID of the Service Bus namespace |
| `servicebus_name` | The name of the Service Bus namespace |
| `servicebus_endpoint` | The endpoint of the Service Bus namespace |
| `servicebus_primary_connection_string` | The primary connection string for the Service Bus namespace |
| `servicebus_secondary_connection_string` | The secondary connection string for the Service Bus namespace |
| `servicebus_primary_key` | The primary key for the Service Bus namespace |
| `servicebus_secondary_key` | The secondary key for the Service Bus namespace |
| `queue_ids` | Map of queue names to their IDs |
| `topic_ids` | Map of topic names to their IDs |
| `subscription_ids` | Map of subscription keys to their IDs |
| `private_endpoint_id` | The ID of the private endpoint |
| `private_ip_addresses` | Private IP addresses of the private endpoint |
| `private_dns_zone_id` | The ID of the private DNS zone |

## Security

### Managed Identity Authentication

Disable SAS key authentication and use managed identities:

```hcl
local_auth_enabled = false
```

Grant access via RBAC:

```bash
# Azure Service Bus Data Sender
az role assignment create \
  --role "Azure Service Bus Data Sender" \
  --assignee {managed-identity-object-id} \
  --scope /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.ServiceBus/namespaces/caz-srvthreds-p-e-sbus

# Azure Service Bus Data Receiver
az role assignment create \
  --role "Azure Service Bus Data Receiver" \
  --assignee {managed-identity-object-id} \
  --scope /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.ServiceBus/namespaces/caz-srvthreds-p-e-sbus/queues/events
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
nslookup caz-srvthreds-p-e-sbus.servicebus.windows.net
# Should resolve to private IP (10.0.1.x)
```

### TLS Encryption

Enforce TLS 1.2 minimum:

```hcl
minimum_tls_version = "1.2"
```

All connections are encrypted in transit using TLS.

## Messaging Patterns

### Point-to-Point (Queues)

Single consumer per message:

```javascript
// Node.js sender
const { ServiceBusClient } = require("@azure/service-bus");

const client = new ServiceBusClient(connectionString);
const sender = client.createSender("events");

await sender.sendMessages({
  body: { type: "UserCreated", userId: 123 }
});

// Node.js receiver
const receiver = client.createReceiver("events");

receiver.subscribe({
  processMessage: async (message) => {
    console.log("Received:", message.body);
    await receiver.completeMessage(message);
  }
});
```

### Publish/Subscribe (Topics)

Multiple subscribers per message:

```javascript
// Publisher
const sender = client.createSender("notifications");

await sender.sendMessages({
  body: { event: "NewOrder", orderId: 456 },
  applicationProperties: { type: "email" }
});

// Subscriber with filter
const receiver = client.createReceiver("notifications", "email-sub");

receiver.subscribe({
  processMessage: async (message) => {
    // Process email notification
    await receiver.completeMessage(message);
  }
});
```

### Session-based Processing

Ordered message processing:

```javascript
// Send session messages
const sender = client.createSender("commands");

await sender.sendMessages({
  body: { command: "UpdateUser", userId: 123 },
  sessionId: "user-123"  // All messages with same sessionId are ordered
});

// Receive session messages
const receiver = client.createSessionReceiver("commands", {
  sessionId: "user-123"
});

for await (const message of receiver.getMessageIterator()) {
  console.log("Received:", message.body);
  await receiver.completeMessage(message);
}
```

## Dead Letter Queue Handling

```javascript
// Process dead letter messages
const dlqReceiver = client.createReceiver("events", {
  subQueueType: "deadLetter"
});

dlqReceiver.subscribe({
  processMessage: async (message) => {
    console.log("DLQ Message:", message.body);
    console.log("Reason:", message.deadLetterReason);
    console.log("Description:", message.deadLetterErrorDescription);

    // Reprocess or log for manual intervention
    await dlqReceiver.completeMessage(message);
  }
});
```

## Monitoring

### Metrics to Monitor

```bash
# View metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.ServiceBus/namespaces/caz-srvthreds-p-e-sbus \
  --metric "Messages,ActiveMessages,DeadletteredMessages"

# Set up alerts
az monitor metrics alert create \
  --name high-dead-letter-count \
  --resource-group srvthreds-prod-rg \
  --scopes {servicebus-id} \
  --condition "avg DeadletteredMessages > 100" \
  --window-size 5m \
  --evaluation-frequency 1m
```

Key metrics:
- **Messages**: Total message count
- **ActiveMessages**: Messages ready for processing
- **DeadletteredMessages**: Messages in DLQ
- **IncomingMessages**: Messages sent to namespace
- **OutgoingMessages**: Messages delivered from namespace
- **ThrottledRequests**: Rate-limited requests
- **ServerErrors**: Server-side errors

### Diagnostic Logs

```hcl
resource "azurerm_monitor_diagnostic_setting" "servicebus" {
  name                       = "servicebus-diagnostics"
  target_resource_id         = module.servicebus.servicebus_id
  log_analytics_workspace_id = module.monitoring.workspace_id

  enabled_log {
    category = "OperationalLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Troubleshooting

### Messages Not Being Delivered

**Check dead letter queue:**

```bash
# View dead letter queue metrics
az servicebus queue show \
  --resource-group srvthreds-prod-rg \
  --namespace-name caz-srvthreds-p-e-sbus \
  --name events \
  --query "{active: countDetails.activeMessageCount, dlq: countDetails.deadLetterMessageCount}"
```

**Check lock duration:**

```hcl
# Increase if processing takes longer
lock_duration = "PT5M"  # 5 minutes
```

### Connection Issues

**Check private endpoint:**

```bash
# Verify DNS resolution
nslookup caz-srvthreds-p-e-sbus.servicebus.windows.net

# Check network connectivity
nc -zv 10.0.1.8 443
```

### Throttling Issues

**Increase capacity (Premium):**

```hcl
capacity = 2  # Double messaging units
```

**Enable partitioning (Standard):**

```hcl
queues = [{
  name                = "events"
  enable_partitioning = true  # Increases throughput
}]
```

### Message Size Exceeded

**Use Premium SKU for larger messages:**

```hcl
sku = "Premium"

queues = [{
  name                = "events"
  max_message_size_kb = 1024  # Up to 100 MB in Premium
}]
```

## Cost Optimization

### Development Environment

```hcl
sku                           = "Basic"
public_network_access_enabled = true
enable_private_endpoint       = false

queues = [{
  name        = "events"
  max_size_mb = 1024
}]
```

Estimated cost: ~$10/month

### Production Environment

```hcl
sku            = "Premium"
capacity       = 1
zone_redundant = true

queues = [{
  name                = "events"
  max_message_size_kb = 1024
  max_size_mb         = 5120
  enable_partitioning = false
}]
```

Estimated cost: ~$700/month per messaging unit

### Cost Reduction Tips

1. **Choose appropriate tier** - Basic for dev, Standard for test, Premium for production
2. **Right-size message retention** - Shorter TTL reduces storage
3. **Clean up unused queues/topics** - Remove entities not in use
4. **Use express entities** - In-memory storage for Standard tier (lower cost)
5. **Monitor message patterns** - Optimize for actual usage
6. **Batch operations** - Reduce transaction costs

## Best Practices

1. **Use managed identities** - Disable SAS key authentication
2. **Enable private endpoints** - Network isolation for production
3. **Set appropriate TTL** - Prevent unbounded message growth
4. **Enable dead lettering** - Handle undeliverable messages
5. **Use sessions for ordering** - Guaranteed FIFO processing
6. **Implement duplicate detection** - Prevent duplicate processing
7. **Monitor DLQ** - Set up alerts for dead letter messages
8. **Use batch operations** - Improve throughput
9. **Enable zone redundancy** - High availability (Premium)
10. **Set lock duration appropriately** - Match processing time

## References

- [Service Bus Best Practices](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-performance-improvements)
- [Service Bus Messaging](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview)
- [Queues, Topics, and Subscriptions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-queues-topics-subscriptions)
- [Sessions](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions)
- [Dead Letter Queues](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues)
- [Private Link](https://learn.microsoft.com/en-us/azure/service-bus-messaging/private-link-service)
- [Managed Identity](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-managed-service-identity)
- [Premium Messaging](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-premium-messaging)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
