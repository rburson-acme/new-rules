#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
# Security Validation Script
#═══════════════════════════════════════════════════════════════════════════════
# Validates Azure infrastructure security configuration against best practices
#
# Usage:
#   ./validate-security.sh <environment> <resource-group>
#
# Example:
#   ./validate-security.sh prod srvthreds-prod-rg
#
# Exit Codes:
#   0 - All security checks passed
#   1 - One or more security checks failed
#═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check counts
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Functions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

print_check() {
    echo -e "\n${BLUE}[CHECK]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASS_COUNT++))
}

print_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAIL_COUNT++))
}

print_warn() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
    ((WARN_COUNT++))
}

print_summary() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Security Validation Summary${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Passed:${NC} $PASS_COUNT"
    echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
    echo -e "${RED}Failed:${NC} $FAIL_COUNT"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

# Validate parameters
if [ $# -lt 2 ]; then
    echo "Usage: $0 <environment> <resource-group>"
    echo "Example: $0 prod srvthreds-prod-rg"
    exit 1
fi

ENVIRONMENT=$1
RESOURCE_GROUP=$2

print_header "Security Validation for $ENVIRONMENT ($RESOURCE_GROUP)"

# Verify Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo -e "${RED}Error: Not logged in to Azure CLI${NC}"
    echo "Run: az login"
    exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription: $SUBSCRIPTION_ID"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

#═══════════════════════════════════════════════════════════════════════════════
# 1. Resource Group Security
#═══════════════════════════════════════════════════════════════════════════════
print_header "1. Resource Group Security"

print_check "Checking resource group exists"
if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    print_pass "Resource group $RESOURCE_GROUP exists"
else
    print_fail "Resource group $RESOURCE_GROUP not found"
    exit 1
fi

print_check "Checking for resource locks"
LOCKS=$(az lock list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$LOCKS" -gt 0 ]; then
    print_pass "Resource locks configured ($LOCKS locks found)"
else
    print_warn "No resource locks found - consider adding CanNotDelete locks for critical resources"
fi

#═══════════════════════════════════════════════════════════════════════════════
# 2. Network Security
#═══════════════════════════════════════════════════════════════════════════════
print_header "2. Network Security"

print_check "Checking for VNet encryption"
VNETS=$(az network vnet list --resource-group "$RESOURCE_GROUP" --query "[].{name:name, encryption:encryption.enabled}" -o json)
if [ "$(echo "$VNETS" | jq length)" -gt 0 ]; then
    ENCRYPTED_VNETS=$(echo "$VNETS" | jq '[.[] | select(.encryption == true)] | length')
    TOTAL_VNETS=$(echo "$VNETS" | jq length)
    if [ "$ENCRYPTED_VNETS" -eq "$TOTAL_VNETS" ]; then
        print_pass "All VNets have encryption enabled ($ENCRYPTED_VNETS/$TOTAL_VNETS)"
    else
        print_warn "Some VNets do not have encryption enabled ($ENCRYPTED_VNETS/$TOTAL_VNETS)"
    fi
fi

print_check "Checking NSG rules on subnets"
SUBNETS_WITHOUT_NSG=$(az network vnet list --resource-group "$RESOURCE_GROUP" \
    --query "[].subnets[?networkSecurityGroup == null].{name:name, vnet:parent}" -o json | jq length)
if [ "$SUBNETS_WITHOUT_NSG" -eq 0 ]; then
    print_pass "All subnets have NSGs attached"
else
    print_fail "$SUBNETS_WITHOUT_NSG subnet(s) missing NSG - add Network Security Groups"
fi

print_check "Checking for public IP addresses"
PUBLIC_IPS=$(az network public-ip list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$PUBLIC_IPS" -eq 0 ] || [ "$ENVIRONMENT" == "dev" ]; then
    if [ "$ENVIRONMENT" == "prod" ] && [ "$PUBLIC_IPS" -gt 1 ]; then
        print_warn "Multiple public IPs found ($PUBLIC_IPS) - verify only Application Gateway uses public IPs"
    else
        print_pass "Public IP configuration acceptable for $ENVIRONMENT environment"
    fi
else
    print_warn "$PUBLIC_IPS public IP(s) found - verify only internet-facing resources (App Gateway) have public IPs"
fi

#═══════════════════════════════════════════════════════════════════════════════
# 3. Private Endpoints
#═══════════════════════════════════════════════════════════════════════════════
print_header "3. Private Endpoint Security"

print_check "Checking for private endpoints"
PRIVATE_ENDPOINTS=$(az network private-endpoint list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$PRIVATE_ENDPOINTS" -gt 0 ]; then
    print_pass "Private endpoints configured ($PRIVATE_ENDPOINTS found)"
else
    if [ "$ENVIRONMENT" == "prod" ] || [ "$ENVIRONMENT" == "staging" ]; then
        print_fail "No private endpoints found - production/staging should use private endpoints"
    else
        print_warn "No private endpoints found - acceptable for development"
    fi
fi

print_check "Checking Key Vault public access"
KEYVAULTS=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[].{name:name, publicAccess:properties.publicNetworkAccess}" -o json)
if [ "$(echo "$KEYVAULTS" | jq length)" -gt 0 ]; then
    PUBLIC_KV=$(echo "$KEYVAULTS" | jq '[.[] | select(.publicAccess == "Enabled")] | length')
    if [ "$PUBLIC_KV" -gt 0 ]; then
        if [ "$ENVIRONMENT" == "prod" ]; then
            print_fail "$PUBLIC_KV Key Vault(s) have public access enabled - disable for production"
        else
            print_warn "$PUBLIC_KV Key Vault(s) have public access enabled"
        fi
    else
        print_pass "All Key Vaults have public access disabled"
    fi
fi

print_check "Checking Storage Account public access"
STORAGE_ACCOUNTS=$(az storage account list --resource-group "$RESOURCE_GROUP" \
    --query "[].{name:name, allowBlobPublic:allowBlobPublicAccess, publicAccess:publicNetworkAccess}" -o json)
if [ "$(echo "$STORAGE_ACCOUNTS" | jq length)" -gt 0 ]; then
    PUBLIC_STORAGE=$(echo "$STORAGE_ACCOUNTS" | jq '[.[] | select(.publicAccess == "Enabled")] | length')
    PUBLIC_BLOB=$(echo "$STORAGE_ACCOUNTS" | jq '[.[] | select(.allowBlobPublic == true)] | length')

    if [ "$PUBLIC_STORAGE" -gt 0 ] || [ "$PUBLIC_BLOB" -gt 0 ]; then
        if [ "$ENVIRONMENT" == "prod" ]; then
            print_fail "Storage accounts have public access enabled - disable for production"
        else
            print_warn "Storage accounts have public access enabled"
        fi
    else
        print_pass "All storage accounts have public access disabled"
    fi
fi

#═══════════════════════════════════════════════════════════════════════════════
# 4. AKS Security
#═══════════════════════════════════════════════════════════════════════════════
print_header "4. AKS Cluster Security"

AKS_CLUSTERS=$(az aks list --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv)
if [ -n "$AKS_CLUSTERS" ]; then
    for AKS_NAME in $AKS_CLUSTERS; do
        print_check "Validating AKS cluster: $AKS_NAME"

        # Check private cluster
        IS_PRIVATE=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "apiServerAccessProfile.enablePrivateCluster" -o tsv)
        if [ "$IS_PRIVATE" == "true" ]; then
            print_pass "AKS cluster is private"
        else
            if [ "$ENVIRONMENT" == "prod" ] || [ "$ENVIRONMENT" == "staging" ]; then
                print_fail "AKS cluster is not private - enable private cluster for $ENVIRONMENT"
            else
                print_warn "AKS cluster is not private - acceptable for development"
            fi
        fi

        # Check managed identity
        IDENTITY_TYPE=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "identity.type" -o tsv)
        if [ "$IDENTITY_TYPE" == "SystemAssigned" ] || [ "$IDENTITY_TYPE" == "UserAssigned" ]; then
            print_pass "AKS uses managed identity ($IDENTITY_TYPE)"
        else
            print_fail "AKS not using managed identity - migrate from service principal"
        fi

        # Check Azure AD integration
        AAD_ENABLED=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "aadProfile.managed" -o tsv)
        if [ "$AAD_ENABLED" == "true" ]; then
            print_pass "AKS has Azure AD integration enabled"
        else
            print_fail "AKS Azure AD integration not enabled - enable for RBAC"
        fi

        # Check network policy
        NETWORK_POLICY=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "networkProfile.networkPolicy" -o tsv)
        if [ -n "$NETWORK_POLICY" ] && [ "$NETWORK_POLICY" != "null" ]; then
            print_pass "Network policy enabled: $NETWORK_POLICY"
        else
            print_warn "Network policy not enabled - consider enabling for microsegmentation"
        fi

        # Check Azure Policy
        AZURE_POLICY=$(az aks show --name "$AKS_NAME" --resource-group "$RESOURCE_GROUP" \
            --query "addonProfiles.azurepolicy.enabled" -o tsv)
        if [ "$AZURE_POLICY" == "true" ]; then
            print_pass "Azure Policy addon enabled"
        else
            print_warn "Azure Policy addon not enabled - consider enabling for compliance"
        fi
    done
else
    print_warn "No AKS clusters found in resource group"
fi

#═══════════════════════════════════════════════════════════════════════════════
# 5. RBAC and Identity
#═══════════════════════════════════════════════════════════════════════════════
print_header "5. RBAC and Identity Security"

print_check "Checking for Key Vault RBAC authorization"
if [ "$(echo "$KEYVAULTS" | jq length)" -gt 0 ]; then
    RBAC_KV=$(az keyvault list --resource-group "$RESOURCE_GROUP" \
        --query "[?properties.enableRbacAuthorization == \`true\`] | length(@)" -o tsv)
    TOTAL_KV=$(echo "$KEYVAULTS" | jq length)
    if [ "$RBAC_KV" -eq "$TOTAL_KV" ]; then
        print_pass "All Key Vaults use RBAC authorization"
    else
        print_fail "Some Key Vaults use access policies instead of RBAC - migrate to RBAC"
    fi
fi

print_check "Checking for managed identities"
MANAGED_IDENTITIES=$(az identity list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$MANAGED_IDENTITIES" -gt 0 ]; then
    print_pass "Managed identities configured ($MANAGED_IDENTITIES found)"
else
    print_warn "No managed identities found - use managed identities for service-to-service auth"
fi

print_check "Checking for service principals (should be minimal)"
# Note: This checks for role assignments to service principals in the resource group
SP_ASSIGNMENTS=$(az role assignment list --resource-group "$RESOURCE_GROUP" \
    --query "[?principalType == 'ServicePrincipal'] | length(@)" -o tsv)
if [ "$SP_ASSIGNMENTS" -gt 5 ]; then
    print_warn "High number of service principal assignments ($SP_ASSIGNMENTS) - prefer managed identities"
else
    print_pass "Service principal usage acceptable ($SP_ASSIGNMENTS assignments)"
fi

#═══════════════════════════════════════════════════════════════════════════════
# 6. Encryption and Data Protection
#═══════════════════════════════════════════════════════════════════════════════
print_header "6. Encryption and Data Protection"

print_check "Checking Storage Account encryption"
if [ "$(echo "$STORAGE_ACCOUNTS" | jq length)" -gt 0 ]; then
    ENCRYPTED_STORAGE=$(az storage account list --resource-group "$RESOURCE_GROUP" \
        --query "[?encryption.services.blob.enabled == \`true\`] | length(@)" -o tsv)
    TOTAL_STORAGE=$(echo "$STORAGE_ACCOUNTS" | jq length)
    if [ "$ENCRYPTED_STORAGE" -eq "$TOTAL_STORAGE" ]; then
        print_pass "All storage accounts have encryption enabled"
    else
        print_fail "Some storage accounts do not have encryption enabled"
    fi

    # Check TLS version
    MIN_TLS=$(az storage account list --resource-group "$RESOURCE_GROUP" \
        --query "[?minimumTlsVersion != 'TLS1_2'] | length(@)" -o tsv)
    if [ "$MIN_TLS" -eq 0 ]; then
        print_pass "All storage accounts require TLS 1.2+"
    else
        print_fail "$MIN_TLS storage account(s) allow TLS < 1.2 - enforce TLS 1.2+"
    fi
fi

print_check "Checking Cosmos DB encryption"
COSMOS_ACCOUNTS=$(az cosmosdb list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$COSMOS_ACCOUNTS" -gt 0 ]; then
    # CosmosDB encryption is always enabled, check for additional security features
    print_pass "Cosmos DB accounts found (encryption enabled by default)"
fi

#═══════════════════════════════════════════════════════════════════════════════
# 7. Monitoring and Logging
#═══════════════════════════════════════════════════════════════════════════════
print_header "7. Monitoring and Logging"

print_check "Checking for Log Analytics workspace"
LOG_WORKSPACES=$(az monitor log-analytics workspace list --resource-group "$RESOURCE_GROUP" --query length(@) -o tsv)
if [ "$LOG_WORKSPACES" -gt 0 ]; then
    print_pass "Log Analytics workspace configured"
else
    print_warn "No Log Analytics workspace found - configure centralized logging"
fi

print_check "Checking diagnostic settings"
RESOURCES=$(az resource list --resource-group "$RESOURCE_GROUP" --query "[].id" -o tsv)
RESOURCES_WITH_DIAG=0
TOTAL_RESOURCES=0

for RESOURCE_ID in $RESOURCES; do
    ((TOTAL_RESOURCES++))
    if az monitor diagnostic-settings list --resource "$RESOURCE_ID" --query "[].name" -o tsv 2>/dev/null | grep -q .; then
        ((RESOURCES_WITH_DIAG++))
    fi
done

if [ "$TOTAL_RESOURCES" -gt 0 ]; then
    DIAG_PERCENTAGE=$((RESOURCES_WITH_DIAG * 100 / TOTAL_RESOURCES))
    if [ "$DIAG_PERCENTAGE" -ge 80 ]; then
        print_pass "Diagnostic settings configured on $DIAG_PERCENTAGE% of resources"
    else
        print_warn "Only $DIAG_PERCENTAGE% of resources have diagnostic settings - target 100%"
    fi
fi

#═══════════════════════════════════════════════════════════════════════════════
# 8. Compliance and Policies
#═══════════════════════════════════════════════════════════════════════════════
print_header "8. Compliance and Azure Policy"

print_check "Checking Azure Policy compliance"
POLICY_STATES=$(az policy state list --resource-group "$RESOURCE_GROUP" \
    --query "[?complianceState == 'NonCompliant'] | length(@)" -o tsv 2>/dev/null || echo "0")
if [ "$POLICY_STATES" -eq 0 ]; then
    print_pass "No non-compliant policy states found"
else
    print_fail "$POLICY_STATES resource(s) are non-compliant with Azure Policy"
fi

#═══════════════════════════════════════════════════════════════════════════════
# Summary
#═══════════════════════════════════════════════════════════════════════════════
print_summary

# Exit with appropriate code
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "\n${RED}Security validation failed with $FAIL_COUNT error(s)${NC}"
    exit 1
else
    echo -e "\n${GREEN}Security validation passed!${NC}"
    if [ "$WARN_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}Note: $WARN_COUNT warning(s) found - review and address as needed${NC}"
    fi
    exit 0
fi
