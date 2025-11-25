#!/usr/bin/env bash

# State Recovery Script for Terraform
# Handles situations where Azure resources exist but Terraform state is out of sync
#
# Usage:
#   ./scripts/recover-state.sh <stack> <environment> [--dry-run] [--force]
#
# Examples:
#   ./scripts/recover-state.sh cosmosdb dev              # Interactive mode
#   ./scripts/recover-state.sh cosmosdb dev --dry-run    # Show what would happen
#   ./scripts/recover-state.sh cosmosdb dev --force      # Auto-import without confirmation

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
ENVIRONMENT="${2:-}"
DRY_RUN=false
FORCE=false

while [[ $# -gt 2 ]]; do
  case "$3" in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    *) echo "Unknown option: $3"; exit 1 ;;
  esac
done

# Validation
if [[ -z "$STACK" ]] || [[ -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <stack> <environment> [--dry-run] [--force]"
  echo ""
  echo "Examples:"
  echo "  $0 cosmosdb dev"
  echo "  $0 cosmosdb dev --dry-run"
  echo "  $0 cosmosdb dev --force"
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

print_header "STATE RECOVERY: ${STACK} (${ENVIRONMENT})"

# Step 1: Analyze current state
print_info "Analyzing current state..."
cd "$STACK_DIR"

# Check if state file exists
if ! terraform state list > /dev/null 2>&1; then
  print_error "Cannot access Terraform state"
  print_info "Possible causes:"
  print_info "  1. Backend not initialized"
  print_info "  2. Backend credentials missing"
  print_info "  3. State file corrupted"
  exit 1
fi

# Get list of resources in state
STATE_RESOURCES=$(terraform state list 2>/dev/null || echo "")

if [[ -z "$STATE_RESOURCES" ]]; then
  print_warning "No resources found in Terraform state"
else
  print_success "Found resources in state:"
  echo "$STATE_RESOURCES" | sed 's/^/  /'
fi

# Step 2: Detect out-of-sync resources
print_info "Detecting out-of-sync resources..."

# Run terraform plan to see what's out of sync
PLAN_OUTPUT=$(terraform plan -var-file="${ENVIRONMENT}.tfvars" 2>&1 || true)

if echo "$PLAN_OUTPUT" | grep -q "already exists"; then
  print_warning "Detected resource(s) that exist in Azure but not in Terraform state"
  echo ""
  echo "$PLAN_OUTPUT" | grep -A 5 "already exists" | head -20
else
  print_success "No out-of-sync resources detected"
  exit 0
fi

# Step 3: Extract resource IDs from error messages
print_info "Extracting resource information..."

# Parse the error to find resource IDs
RESOURCE_IDS=$(echo "$PLAN_OUTPUT" | grep -oP '(?<=/subscriptions/)[^"]*' | sort -u || true)

if [[ -z "$RESOURCE_IDS" ]]; then
  print_error "Could not extract resource IDs from error messages"
  print_info "Manual recovery steps:"
  print_info "  1. Run: terraform state list"
  print_info "  2. Run: terraform state show <resource>"
  print_info "  3. Run: terraform import <resource> <resource-id>"
  exit 1
fi

# Step 4: Show recovery options
print_header "RECOVERY OPTIONS"

print_info "Option 1: Import existing resources into state"
print_info "  This will sync Terraform state with Azure resources"
print_info ""
print_info "Option 2: Refresh state"
print_info "  This will update state without importing"
print_info ""
print_info "Option 3: Manual recovery"
print_info "  Use terraform import/state commands directly"
print_info ""

# Step 5: Perform recovery
if [[ "$DRY_RUN" == true ]]; then
  print_warning "DRY RUN MODE - No changes will be made"
  echo ""
  print_info "Would execute:"
  echo "  cd $STACK_DIR"
  echo "  terraform refresh -var-file='${ENVIRONMENT}.tfvars'"
  echo ""
  exit 0
fi

if [[ "$FORCE" != true ]]; then
  echo -n "Proceed with state refresh? (y/N): "
  read -r RESPONSE
  if [[ ! "$RESPONSE" =~ ^[Yy]$ ]]; then
    print_warning "Recovery cancelled"
    exit 0
  fi
fi

print_info "Refreshing Terraform state..."
if terraform refresh -var-file="${ENVIRONMENT}.tfvars"; then
  print_success "State refresh completed"
  
  # Verify the fix
  print_info "Verifying fix..."
  if terraform plan -var-file="${ENVIRONMENT}.tfvars" > /dev/null 2>&1; then
    print_success "State is now in sync!"
    print_info "You can now run: terraform apply"
  else
    print_warning "State may still be out of sync"
    print_info "Run: terraform plan -var-file='${ENVIRONMENT}.tfvars' for details"
  fi
else
  print_error "State refresh failed"
  print_info "Manual recovery required:"
  print_info "  1. Review the error above"
  print_info "  2. Use: terraform import <resource> <resource-id>"
  print_info "  3. Or use: terraform state rm <resource> (if resource should not exist)"
  exit 1
fi

cd - > /dev/null
print_success "Recovery complete"

