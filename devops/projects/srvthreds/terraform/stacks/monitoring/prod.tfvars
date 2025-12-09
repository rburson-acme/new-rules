# Production Environment Configuration for Monitoring Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Log Analytics Workspace - Production retention
log_analytics_sku            = "PerGB2018"
log_analytics_retention_days = 90  # 90 days for compliance
log_analytics_daily_quota_gb = -1  # Unlimited for production

# Application Insights - Full config for production
application_insights_type                = "web"
application_insights_retention_days      = 90  # Extended retention
application_insights_sampling_percentage = 100 # Full telemetry
disable_ip_masking                       = false

# Action Groups - Production alerts
create_action_group = false
alert_email_receivers = []
# Example: Uncomment and add production emails when ready
# create_action_group = true
# alert_email_receivers = [
#   {
#     name          = "production-alerts"
#     email_address = "ops-team@example.com"
#   },
#   {
#     name          = "oncall"
#     email_address = "oncall@example.com"
#   }
# ]
