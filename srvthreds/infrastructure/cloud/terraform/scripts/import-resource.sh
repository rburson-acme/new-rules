#!/usr/bin/env bash

# Resource Import Script
# Imports existing Azure resources into Terraform state
#
# Usage:
#   ./scripts/import-resource.sh <stack> <resource-type> <resource-name> <azure-resource-id> [--dry-run]
#
# Examples:
#   ./scripts/import-resource.sh cosmosdb cosmosdb_account main \
#     "/subscriptions/.../providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos"
#
#   ./scripts/import-resource.sh cosmosdb cosmosdb_account main \
#     "/subscriptions/.../providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos" --dry-run

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
STACKS_DIR="${TERRAFORM_DIR}/stacks"

# Parse arguments
STACK="${1:-}"
RESOURCE_TYPE="${2:-}"
RESOURCE_NAME="${3:-}"
RESOURCE_ID="${4:-}"
DRY_RUN=false

if [[ "$5" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Validation
if [[ -z "$STACK" ]] || [[ -z "$RESOURCE_TYPE" ]] || [[ -z "$RESOURCE_NAME" ]] || [[ -z "$RESOURCE_ID" ]]; then
  echo "Usage: $0 <stack> <resource-type> <resource-name> <azure-resource-id> [--dry-run]"
  echo ""
  echo "Examples:"
  echo "  $0 cosmosdb cosmosdb_account main \\"
  echo "    '/subscriptions/.../providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos'"
  echo ""
  echo "Common resource types:"
  echo "  - azurerm_cosmosdb_account"
  echo "  - azurerm_key_vault"
  echo "  - azurerm_container_registry"
  echo "  - azurerm_redis_cache"
  echo "  - azurerm_kubernetes_cluster"
  exit 1
fi

# Helper functions
print_header() {
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════"
  echo ""
}

print_info() {
  echo -e "${BLUE}▸${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if stack directory exists
if [[ ! -d "${STACKS_DIR}/${STACK}" ]]; then
  print_error "Stack '${STACK}' not found in ${STACKS_DIR}"
  exit 1
fi

STACK_DIR="${STACKS_DIR}/${STACK}"

print_header "IMPORT RESOURCE: ${STACK}"

print_info "Stack: $STACK"
print_info "Resource Type: $RESOURCE_TYPE"
print_info "Resource Name: $RESOURCE_NAME"
print_info "Resource ID: $RESOURCE_ID"
echo ""

# Determine Terraform resource address
# For module resources: module.{module_name}.{resource_type}.{resource_name}
# For direct resources: {resource_type}.{resource_name}

# Try to detect if this is a module resource
if grep -q "module \"${RESOURCE_NAME}\"" "${STACK_DIR}/main.tf" 2>/dev/null; then
  # It's a module
  TERRAFORM_ADDRESS="module.${RESOURCE_NAME}.azurerm_${RESOURCE_TYPE}.main"
else
  # Try common module names
  TERRAFORM_ADDRESS="module.${STACK}.azurerm_${RESOURCE_TYPE}.main"
fi

print_info "Terraform address: $TERRAFORM_ADDRESS"
echo ""

# Dry run
if [[ "$DRY_RUN" == true ]]; then
  print_warning "DRY RUN MODE - No changes will be made"
  echo ""
  print_info "Would execute:"
  echo "  cd $STACK_DIR"
  echo "  terraform import $TERRAFORM_ADDRESS '$RESOURCE_ID'"
  echo ""
  exit 0
fi

# Confirm
echo -n "Proceed with import? (y/N): "
read -r RESPONSE
if [[ ! "$RESPONSE" =~ ^[Yy]$ ]]; then
  print_warning "Import cancelled"
  exit 0
fi

# Perform import
cd "$STACK_DIR"

# Determine environment from stack directory or use default
ENVIRONMENT="${ENVIRONMENT:-dev}"
TFVARS_FILE="${ENVIRONMENT}.tfvars"

if [[ ! -f "$TFVARS_FILE" ]]; then
  print_error "Variables file not found: $TFVARS_FILE"
  exit 1
fi

print_info "Importing resource..."
if terraform import -var-file="$TFVARS_FILE" "$TERRAFORM_ADDRESS" "$RESOURCE_ID"; then
  print_success "Resource imported successfully"
  
  # Verify
  print_info "Verifying import..."
  if terraform state show "$TERRAFORM_ADDRESS" > /dev/null 2>&1; then
    print_success "Resource is now in Terraform state"
    print_info "Next steps:"
    print_info "  1. Review the imported resource: terraform state show $TERRAFORM_ADDRESS"
    print_info "  2. Update Terraform configuration to match Azure resource"
    print_info "  3. Run: terraform plan to verify no changes needed"
    print_info "  4. Commit changes to version control"
  else
    print_error "Could not verify imported resource"
    exit 1
  fi
else
  print_error "Import failed"
  print_info "Troubleshooting:"
  print_info "  1. Verify resource ID is correct"
  print_info "  2. Verify resource exists in Azure"
  print_info "  3. Check Terraform configuration matches Azure resource"
  print_info "  4. Review error message above"
  exit 1
fi

cd - > /dev/null
print_success "Import complete"

