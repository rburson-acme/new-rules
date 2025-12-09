# Development Environment Configuration for Monitoring Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Log Analytics Workspace - Free tier for dev
log_analytics_sku            = "PerGB2018"
log_analytics_retention_days = 30  # Minimum retention
log_analytics_daily_quota_gb = 5   # 5GB daily limit for cost control

# Application Insights - Basic config for dev
application_insights_type                = "web"
application_insights_retention_days      = 30  # Minimum retention
application_insights_sampling_percentage = 100 # Full sampling for dev
disable_ip_masking                       = false

# Action Groups - No alerts for dev
create_action_group   = false
alert_email_receivers = []
