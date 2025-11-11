# Azure Monitoring Module

Terraform module for creating Azure monitoring infrastructure including Log Analytics workspace and Application Insights for comprehensive observability.

## Overview

This module creates monitoring resources for SrvThreds infrastructure:

- **Log Analytics Workspace** - Centralized log aggregation and analysis
- **Application Insights** - Application performance monitoring (APM)
- **Action Groups** - Alert notification management
- **Retention policies** - Cost-optimized data retention
- **Daily quotas** - Budget controls for log ingestion

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Azure Monitor Ecosystem                      │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │       Log Analytics Workspace                       │  │
│  │       (CAZ-SRVTHREDS-P-E-LOG)                       │  │
│  │                                                     │  │
│  │  ├─ AKS Container Logs                             │  │
│  │  ├─ Key Vault Audit Events                         │  │
│  │  ├─ ACR Repository Events                          │  │
│  │  ├─ Network Security Group Logs                    │  │
│  │  ├─ Application Gateway Logs                       │  │
│  │  └─ Custom Application Logs                        │  │
│  │                                                     │  │
│  │  Retention: 30-730 days                            │  │
│  │  Daily Quota: Configurable                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │       Application Insights                          │  │
│  │       (CAZ-SRVTHREDS-P-E-APPI)                      │  │
│  │                                                     │  │
│  │  ├─ Request/Response Tracking                      │  │
│  │  ├─ Dependency Monitoring                          │  │
│  │  ├─ Exception Logging                              │  │
│  │  ├─ Performance Metrics                            │  │
│  │  ├─ Custom Events/Metrics                          │  │
│  │  └─ Distributed Tracing                            │  │
│  │                                                     │  │
│  │  Sampling: 100% (configurable)                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │       Action Groups (Optional)                      │  │
│  │                                                     │  │
│  │  ├─ Email Notifications                            │  │
│  │  ├─ SMS Alerts                                     │  │
│  │  ├─ Webhook Integrations                           │  │
│  │  └─ Azure Function Triggers                        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Usage

### Basic Development Monitoring

```hcl
module "monitoring" {
  source = "../../modules/azure/monitoring"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"
  project_name        = "srvthreds"
  cost_center         = "engineering"

  # Basic configuration
  log_analytics_retention_days = 30
  log_analytics_daily_quota_gb = 5

  # Application Insights
  application_insights_retention_days = 90
  application_insights_sampling_percentage = 50  # 50% for dev

  tags = {
    Owner = "Platform Team"
  }
}
```

### Production Monitoring with Alerts

```hcl
module "monitoring" {
  source = "../../modules/azure/monitoring"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  project_name        = "srvthreds"
  cost_center         = "production-ops"

  # Extended retention for compliance
  log_analytics_retention_days = 730  # 2 years
  log_analytics_daily_quota_gb = 50   # 50GB/day budget

  # Full sampling for production
  application_insights_retention_days = 90
  application_insights_sampling_percentage = 100

  # Disable IP masking for better diagnostics
  disable_ip_masking = false  # Set true if compliance allows

  # Create action group for alerts
  create_action_group = true
  alert_email_receivers = [
    {
      name          = "ops-team"
      email_address = "ops@example.com"
    },
    {
      name          = "oncall"
      email_address = "oncall@example.com"
    }
  ]

  tags = {
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `project_name` | Project name for tagging | `string` | n/a | yes |
| `cost_center` | Cost center for tagging | `string` | n/a | yes |
| `log_analytics_sku` | SKU for Log Analytics workspace | `string` | `"PerGB2018"` | no |
| `log_analytics_retention_days` | Retention period in days for Log Analytics | `number` | `30` | no |
| `log_analytics_daily_quota_gb` | Daily ingestion quota in GB (-1 for unlimited) | `number` | `-1` | no |
| `application_insights_type` | Application type for Application Insights | `string` | `"web"` | no |
| `application_insights_retention_days` | Retention period in days for Application Insights | `number` | `90` | no |
| `application_insights_sampling_percentage` | Sampling percentage for Application Insights (0-100) | `number` | `100` | no |
| `disable_ip_masking` | Disable IP masking in Application Insights | `bool` | `false` | no |
| `create_action_group` | Create an action group for alerts | `bool` | `false` | no |
| `alert_email_receivers` | Email receivers for alerts | `list(object)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| `log_analytics_workspace_id` | The ID of the Log Analytics workspace |
| `log_analytics_workspace_name` | The name of the Log Analytics workspace |
| `log_analytics_workspace_primary_key` | The primary key of the Log Analytics workspace (sensitive) |
| `log_analytics_workspace_workspace_id` | The workspace ID of the Log Analytics workspace |
| `application_insights_id` | The ID of Application Insights |
| `application_insights_name` | The name of Application Insights |
| `application_insights_instrumentation_key` | The instrumentation key of Application Insights (sensitive) |
| `application_insights_connection_string` | The connection string of Application Insights (sensitive) |
| `application_insights_app_id` | The app ID of Application Insights |
| `action_group_id` | The ID of the action group (if created) |

## Integration Examples

### AKS Container Insights

```hcl
module "aks" {
  source = "../../modules/azure/aks"

  # ... other config ...

  enable_oms_agent            = true
  log_analytics_workspace_id  = module.monitoring.log_analytics_workspace_id
}
```

### Key Vault Audit Logging

```hcl
resource "azurerm_monitor_diagnostic_setting" "keyvault" {
  name                       = "keyvault-diagnostics"
  target_resource_id         = module.keyvault.key_vault_id
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id

  enabled_log {
    category = "AuditEvent"
  }

  metric {
    category = "AllMetrics"
  }
}
```

### Application Insights for Node.js App

```javascript
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
appInsights.start();
```

## Querying Logs

### Using Kusto Query Language (KQL)

```kql
# Container logs from last hour
ContainerLog
| where TimeGenerated > ago(1h)
| project TimeGenerated, ContainerID, LogEntry
| limit 100

# Failed requests
requests
| where success == false
| summarize count() by resultCode
| order by count_ desc

# Performance metrics
performanceCounters
| where name == "% Processor Time"
| summarize avg(value) by bin(timestamp, 5m)
```

## Cost Optimization

### Development Environment

```hcl
log_analytics_retention_days = 30
log_analytics_daily_quota_gb = 5
application_insights_sampling_percentage = 50
```

Estimated cost: ~$10-20/month

### Production Environment

```hcl
log_analytics_retention_days = 90
log_analytics_daily_quota_gb = 50
application_insights_sampling_percentage = 100
```

Estimated cost: ~$100-500/month (depends on ingestion volume)

## Best Practices

1. **Set daily quotas** - Prevent unexpected costs
2. **Use appropriate retention** - Balance compliance with cost
3. **Enable sampling for high-volume apps** - Reduce Application Insights costs
4. **Create action groups** - Automated alert notifications
5. **Tag all resources** - Cost attribution and management
6. **Archive old logs** - Export to storage for long-term retention
7. **Monitor ingestion volume** - Track trends and anomalies

## References

- [Log Analytics Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-overview)
- [Application Insights Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [KQL Reference](https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/)
- [Azure Monitor Pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
