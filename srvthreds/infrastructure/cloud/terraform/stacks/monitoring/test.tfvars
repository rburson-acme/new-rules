# Test Environment Configuration for Monitoring Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Log Analytics Workspace - Medium retention for test
log_analytics_sku            = "PerGB2018"
log_analytics_retention_days = 60  # Extended retention
log_analytics_daily_quota_gb = 10  # Higher quota

# Application Insights - Enhanced config for test
application_insights_type                = "web"
application_insights_retention_days      = 60  # Extended retention
application_insights_sampling_percentage = 100 # Full sampling
disable_ip_masking                       = false

# Action Groups - Basic alerts for test
create_action_group = false
alert_email_receivers = []
# Example: Uncomment and add emails when ready
# create_action_group = true
# alert_email_receivers = [
#   {
#     name          = "team-alerts"
#     email_address = "team@example.com"
#   }
# ]
