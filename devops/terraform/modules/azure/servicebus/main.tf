# Azure Service Bus Module
# Creates a Service Bus namespace with queues and topics, with optional private endpoint

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Generate Service Bus namespace name following Army NETCOM naming convention
  # Format: CAZ-SRVTHREDS-{ENV}-E-SBUS (cannot end with -sb, -mgmt, or hyphen)
  # Must be globally unique, lowercase alphanumeric and hyphens, 6-50 chars
  servicebus_name = lower("${var.environment == "dev" ? "caz-srvthreds-d-e-sbus" : var.environment == "test" ? "caz-srvthreds-t-e-sbus" : "caz-srvthreds-p-e-sbus"}")

  common_tags = merge(
    var.tags,
    {
      Module      = "servicebus"
      Environment = var.environment
    }
  )
}

# Service Bus Namespace
resource "azurerm_servicebus_namespace" "main" {
  name                = local.servicebus_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  # Capacity (Premium only)
  capacity = var.sku == "Premium" ? var.capacity : null

  # Zone redundancy (Premium only)
  zone_redundant = var.sku == "Premium" ? var.zone_redundant : null

  # Network access
  public_network_access_enabled = var.public_network_access_enabled

  # Minimum TLS version
  minimum_tls_version = var.minimum_tls_version

  # Local authentication
  local_auth_enabled = var.local_auth_enabled

  tags = local.common_tags
}

# Service Bus Queues
resource "azurerm_servicebus_queue" "queues" {
  for_each = { for q in var.queues : q.name => q }

  name         = each.value.name
  namespace_id = azurerm_servicebus_namespace.main.id

  # Message settings
  max_message_size_in_kilobytes = var.sku == "Premium" ? each.value.max_message_size_kb : null
  max_size_in_megabytes         = each.value.max_size_mb
  default_message_ttl           = each.value.default_message_ttl

  # Dead letter settings
  dead_lettering_on_message_expiration = each.value.dead_lettering_on_expiration
  max_delivery_count                   = each.value.max_delivery_count

  # Session support
  requires_session = each.value.requires_session

  # Duplicate detection
  requires_duplicate_detection = each.value.requires_duplicate_detection
  duplicate_detection_history_time_window = each.value.requires_duplicate_detection ? each.value.duplicate_detection_window : null

  # Locking
  lock_duration = each.value.lock_duration

  # Batching
  enable_batched_operations = each.value.enable_batched_operations

  # Partitioning (Standard/Premium)
  enable_partitioning = var.sku != "Basic" ? each.value.enable_partitioning : false

  # Express (Standard only - in-memory message store)
  enable_express = var.sku == "Standard" ? each.value.enable_express : false

  # Forward to queue/topic (empty string not allowed, must be null or valid name)
  forward_to                      = each.value.forward_to != "" ? each.value.forward_to : null
  forward_dead_lettered_messages_to = each.value.forward_dead_lettered_to != "" ? each.value.forward_dead_lettered_to : null
}

# Service Bus Topics
resource "azurerm_servicebus_topic" "topics" {
  for_each = { for t in var.topics : t.name => t }

  name         = each.value.name
  namespace_id = azurerm_servicebus_namespace.main.id

  # Message settings
  max_message_size_in_kilobytes = var.sku == "Premium" ? each.value.max_message_size_kb : null
  max_size_in_megabytes         = each.value.max_size_mb
  default_message_ttl           = each.value.default_message_ttl

  # Duplicate detection
  requires_duplicate_detection = each.value.requires_duplicate_detection
  duplicate_detection_history_time_window = each.value.requires_duplicate_detection ? each.value.duplicate_detection_window : null

  # Batching
  enable_batched_operations = each.value.enable_batched_operations

  # Partitioning (Standard/Premium)
  enable_partitioning = var.sku != "Basic" ? each.value.enable_partitioning : false

  # Express (Standard only)
  enable_express = var.sku == "Standard" ? each.value.enable_express : false

  # Subscriptions support
  support_ordering = each.value.support_ordering
}

# Service Bus Subscriptions (for topics)
resource "azurerm_servicebus_subscription" "subscriptions" {
  for_each = { for s in var.subscriptions : "${s.topic_name}.${s.name}" => s }

  name     = each.value.name
  topic_id = azurerm_servicebus_topic.topics[each.value.topic_name].id

  # Message settings
  max_delivery_count  = each.value.max_delivery_count
  default_message_ttl = each.value.default_message_ttl
  lock_duration       = each.value.lock_duration

  # Dead lettering
  dead_lettering_on_message_expiration = each.value.dead_lettering_on_expiration
  dead_lettering_on_filter_evaluation_error = each.value.dead_lettering_on_filter_error

  # Session
  requires_session = each.value.requires_session

  # Forward to (empty string not allowed, must be null or valid name)
  forward_to                      = each.value.forward_to != "" ? each.value.forward_to : null
  forward_dead_lettered_messages_to = each.value.forward_dead_lettered_to != "" ? each.value.forward_dead_lettered_to : null

  # Batching
  enable_batched_operations = each.value.enable_batched_operations
}

# Private endpoint for Service Bus (if enabled)
module "private_endpoint" {
  count  = var.enable_private_endpoint ? 1 : 0
  source = "../private-endpoint"

  location                       = var.location
  resource_group_name            = var.resource_group_name
  private_endpoint_name          = local.servicebus_name
  subnet_id                      = var.private_endpoint_subnet_id
  private_connection_resource_id = azurerm_servicebus_namespace.main.id
  subresource_names              = ["namespace"]
  private_dns_zone_name          = "privatelink.servicebus.windows.net"
  vnet_id                        = var.vnet_id
  tags                           = local.common_tags
}
