#!/usr/bin/env bash

# SrvThreds Azure Terraform Stack Deployment Script
# Simplified command structure for clear, safe infrastructure management
#
# Commands:
#   build <stack> <env>        - Initialize, validate, and plan (no changes)
#   apply <stack> <env>        - Deploy stack (auto-runs build first)
#   destroy <stack> <env>      - Destroy stack (with dependency checking)
#   all <env>                  - Deploy all stacks in dependency order
#   destroy-all <env>          - Destroy all stacks in reverse order
#   status <env>               - Show deployment status of all stacks

set -e

# Check Bash version (need 4.0+ for associative arrays)
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
  echo "Error: This script requires Bash 4.0 or higher"
  echo "Current version: $BASH_VERSION"
  echo ""
  echo "On macOS, install Bash 4+ with Homebrew:"
  echo "  brew install bash"
  echo ""
  echo "Then run the script with:"
  echo "  /usr/local/bin/bash ./scripts/deploy-stack.sh"
  echo ""
  echo "Or add to your PATH in ~/.zshrc or ~/.bash_profile:"
  echo "  export PATH=\"/usr/local/bin:\$PATH\""
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
STACKS_DIR="${TERRAFORM_DIR}/stacks"

# Stack deployment order (respects dependencies)
STACK_ORDER=(
  "networking"    # Must be first - creates RG and VNet
  "keyvault"      # Depends on networking
  "acr"           # Depends on networking
  "cosmosdb"      # Depends on networking
  "redis"         # Depends on networking
  "servicebus"    # Depends on networking
  "aks"           # Depends on networking, acr
  "appgateway"    # Depends on networking
  "monitoring"    # Depends on networking
)

# Stack dependencies map
declare -A STACK_DEPENDENCIES
STACK_DEPENDENCIES[networking]=""
STACK_DEPENDENCIES[keyvault]="networking"
STACK_DEPENDENCIES[acr]="networking"
STACK_DEPENDENCIES[cosmosdb]="networking"
STACK_DEPENDENCIES[redis]="networking"
STACK_DEPENDENCIES[servicebus]="networking"
STACK_DEPENDENCIES[aks]="networking acr"
STACK_DEPENDENCIES[appgateway]="networking"
STACK_DEPENDENCIES[monitoring]="networking"

# Function to print colored messages
print_info() {
  echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
  echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
  echo -e "${RED}✗ ${1}${NC}"
}

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  ${1}${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_step() {
  echo -e "${CYAN}▸ ${1}${NC}"
}

# Function to validate inputs
validate_inputs() {
  local command=$1
  local stack=$2
  local environment=$3

  # Validate command
  if [[ ! "$command" =~ ^(build|apply|destroy|all|destroy-all|status)$ ]]; then
    print_error "Invalid command: $command"
    echo "Valid commands: build, apply, destroy, all, destroy-all, status"
    exit 1
  fi

  # Validate environment
  if [[ ! "$environment" =~ ^(dev|test|prod)$ ]]; then
    print_error "Invalid environment: $environment"
    echo "Valid environments: dev, test, prod"
    exit 1
  fi

  # Validate stack (skip for 'all', 'destroy-all', 'status' commands)
  if [[ ! "$command" =~ ^(all|destroy-all|status)$ ]]; then
    if [[ ! " ${STACK_ORDER[*]} " =~ " ${stack} " ]]; then
      print_error "Invalid stack: $stack"
      echo "Valid stacks: ${STACK_ORDER[*]}"
      exit 1
    fi

    # Check if stack directory exists
    if [[ ! -d "${STACKS_DIR}/${stack}" ]]; then
      print_error "Stack directory not found: ${STACKS_DIR}/${stack}"
      print_info "This stack has not been implemented yet"
      exit 1
    fi

    # Check if tfvars file exists
    if [[ ! -f "${STACKS_DIR}/${stack}/${environment}.tfvars" ]]; then
      print_error "Environment file not found: ${STACKS_DIR}/${stack}/${environment}.tfvars"
      exit 1
    fi
  fi
}

# Function to check if a stack is deployed
is_stack_deployed() {
  local stack=$1
  local environment=$2
  local stack_dir="${STACKS_DIR}/${stack}"

  if [[ ! -d "$stack_dir" ]]; then
    return 1
  fi

  # Check if state file exists in Azure Storage
  # This is more reliable than checking local state which requires initialization
  local state_key="stacks/${stack}/${environment}.tfstate"

  if az storage blob exists \
    --account-name srvthredstfstated9jvee \
    --container-name tfstate \
    --name "$state_key" \
    --auth-mode key \
    --query "exists" \
    --output tsv 2>/dev/null | grep -q "true"; then
    return 0
  fi

  return 1
}

# Function to check stack dependencies are deployed
check_dependencies() {
  local stack=$1
  local environment=$2
  local deps="${STACK_DEPENDENCIES[$stack]}"

  if [[ -z "$deps" ]]; then
    return 0
  fi

  local missing_deps=()
  for dep in $deps; do
    if ! is_stack_deployed "$dep" "$environment"; then
      missing_deps+=("$dep")
    fi
  done

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    print_error "Missing dependencies for $stack: ${missing_deps[*]}"
    print_info "Deploy these stacks first: ${missing_deps[*]}"
    return 1
  fi

  return 0
}

# Function to check what depends on a stack
check_dependents() {
  local stack=$1
  local environment=$2
  local dependents=()

  for s in "${STACK_ORDER[@]}"; do
    local deps="${STACK_DEPENDENCIES[$s]}"
    if [[ " $deps " =~ " $stack " ]]; then
      if is_stack_deployed "$s" "$environment"; then
        dependents+=("$s")
      fi
    fi
  done

  if [[ ${#dependents[@]} -gt 0 ]]; then
    print_error "Cannot destroy $stack - these deployed stacks depend on it: ${dependents[*]}"
    print_info "Destroy dependent stacks first, or use 'destroy-all' to destroy everything in order"
    return 1
  fi

  return 0
}

# Function to initialize terraform for a stack
initialize_stack() {
  local stack=$1
  local environment=$2
  local stack_dir="${STACKS_DIR}/${stack}"

  cd "$stack_dir"

  if [[ ! -d ".terraform" ]]; then
    print_step "Initializing Terraform..."
    terraform init \
      -backend-config="resource_group_name=srvthreds-terraform-rg" \
      -backend-config="storage_account_name=srvthredstfstated9jvee" \
      -backend-config="container_name=tfstate" \
      -backend-config="key=stacks/${stack}/${environment}.tfstate" \
      > /dev/null
    print_success "Initialized"
  fi

  cd - > /dev/null
}

# Function to build a stack (init, validate, plan)
build_stack() {
  local stack=$1
  local environment=$2
  local stack_dir="${STACKS_DIR}/${stack}"
  local tfvars_file="${environment}.tfvars"

  print_header "BUILD: ${stack} (${environment})"

  cd "$stack_dir"

  # Initialize
  print_step "Initializing..."
  terraform init \
    -backend-config="resource_group_name=srvthreds-terraform-rg" \
    -backend-config="storage_account_name=srvthredstfstated9jvee" \
    -backend-config="container_name=tfstate" \
    -backend-config="key=stacks/${stack}/${environment}.tfstate"

  # Validate
  print_step "Validating configuration..."
  terraform validate

  # Plan
  print_step "Creating execution plan..."
  terraform plan -var-file="$tfvars_file" -out="${environment}.tfplan"

  print_success "Build complete - plan saved to ${environment}.tfplan"

  cd - > /dev/null
}

# Function to apply a stack
apply_stack() {
  local stack=$1
  local environment=$2
  local stack_dir="${STACKS_DIR}/${stack}"
  local tfvars_file="${environment}.tfvars"

  print_header "APPLY: ${stack} (${environment})"

  # Check dependencies
  if ! check_dependencies "$stack" "$environment"; then
    exit 1
  fi

  cd "$stack_dir"

  # If plan doesn't exist, run build first
  if [[ ! -f "${environment}.tfplan" ]]; then
    print_info "No plan found - running build first..."
    cd - > /dev/null
    build_stack "$stack" "$environment"
    cd "$stack_dir"
  fi

  # Apply the plan
  print_step "Applying changes..."
  terraform apply "${environment}.tfplan"

  # Clean up plan file
  rm -f "${environment}.tfplan"

  print_success "Successfully deployed ${stack} to ${environment}"

  cd - > /dev/null
}

# Function to destroy a stack
destroy_stack() {
  local stack=$1
  local environment=$2
  local stack_dir="${STACKS_DIR}/${stack}"
  local tfvars_file="${environment}.tfvars"

  print_header "DESTROY: ${stack} (${environment})"

  # Check if stack is deployed
  if ! is_stack_deployed "$stack" "$environment"; then
    print_warning "Stack ${stack} is not deployed in ${environment}"
    return 0
  fi

  # Check for dependents
  if ! check_dependents "$stack" "$environment"; then
    exit 1
  fi

  cd "$stack_dir"

  # Initialize if needed
  initialize_stack "$stack" "$environment"

  # Show what will be destroyed
  print_step "Planning destruction..."
  terraform plan -destroy -var-file="$tfvars_file"

  # Confirm
  print_warning "You are about to destroy ${stack} in ${environment}"
  read -p "Type 'yes' to confirm: " confirm

  if [[ "$confirm" == "yes" ]]; then
    print_step "Destroying resources..."
    terraform destroy -var-file="$tfvars_file" -auto-approve
    print_success "Successfully destroyed ${stack} in ${environment}"
  else
    print_info "Destroy cancelled"
  fi

  cd - > /dev/null
}

# Function to deploy all stacks
deploy_all() {
  local environment=$1

  print_header "DEPLOY ALL STACKS TO ${environment^^}"

  print_info "Deployment order: ${STACK_ORDER[*]}"
  echo ""

  # First, build all stacks
  print_header "PHASE 1: BUILD ALL STACKS"
  local build_failures=()

  for stack in "${STACK_ORDER[@]}"; do
    if [[ -d "${STACKS_DIR}/${stack}" ]] && [[ -f "${STACKS_DIR}/${stack}/${environment}.tfvars" ]]; then
      if ! build_stack "$stack" "$environment"; then
        build_failures+=("$stack")
      fi
      echo ""
    else
      print_warning "Skipping ${stack}: not yet implemented"
    fi
  done

  # Check if any builds failed
  if [[ ${#build_failures[@]} -gt 0 ]]; then
    print_error "Build failures: ${build_failures[*]}"
    print_error "Cannot proceed with deployment"
    exit 1
  fi

  print_success "All builds successful"

  # Confirm deployment
  echo ""
  print_warning "Ready to deploy all stacks to ${environment}"
  read -p "Type 'yes' to proceed with deployment: " confirm

  if [[ "$confirm" != "yes" ]]; then
    print_info "Deployment cancelled"
    exit 0
  fi

  # Apply all stacks
  print_header "PHASE 2: APPLY ALL STACKS"

  for stack in "${STACK_ORDER[@]}"; do
    if [[ -d "${STACKS_DIR}/${stack}" ]] && [[ -f "${STACKS_DIR}/${stack}/${environment}.tfvars" ]]; then
      apply_stack "$stack" "$environment"
      echo ""
    fi
  done

  print_header "DEPLOYMENT COMPLETE"
  print_success "All stacks deployed to ${environment}"
}

# Function to destroy all stacks
destroy_all() {
  local environment=$1

  print_header "DESTROY ALL STACKS IN ${environment^^}"

  # Reverse the stack order
  local reverse_order=()
  for ((i=${#STACK_ORDER[@]}-1; i>=0; i--)); do
    reverse_order+=("${STACK_ORDER[$i]}")
  done

  print_warning "Destruction order (reverse): ${reverse_order[*]}"
  echo ""

  # Confirm
  print_error "⚠️  WARNING: This will destroy ALL infrastructure in ${environment}"
  print_error "This action cannot be undone!"
  echo ""
  read -p "Type 'destroy-all-${environment}' to confirm: " confirm

  if [[ "$confirm" != "destroy-all-${environment}" ]]; then
    print_info "Destroy cancelled"
    exit 0
  fi

  # Destroy in reverse order
  for stack in "${reverse_order[@]}"; do
    if [[ -d "${STACKS_DIR}/${stack}" ]] && [[ -f "${STACKS_DIR}/${stack}/${environment}.tfvars" ]]; then
      if is_stack_deployed "$stack" "$environment"; then
        print_header "Destroying ${stack}..."
        cd "${STACKS_DIR}/${stack}"
        terraform destroy -var-file="${environment}.tfvars" -auto-approve
        cd - > /dev/null
        print_success "Destroyed ${stack}"
        echo ""
      else
        print_info "Skipping ${stack}: not deployed"
      fi
    fi
  done

  print_header "DESTRUCTION COMPLETE"
  print_success "All stacks destroyed in ${environment}"
}

# Function to show deployment status
show_status() {
  local environment=$1

  print_header "DEPLOYMENT STATUS: ${environment^^}"

  echo -e "${CYAN}Stack${NC}           ${CYAN}Status${NC}          ${CYAN}Resources${NC}"
  echo "─────────────────────────────────────────────────"

  for stack in "${STACK_ORDER[@]}"; do
    local status_icon=""
    local status_text=""
    local resource_count=0

    if [[ ! -d "${STACKS_DIR}/${stack}" ]]; then
      status_icon="⚫"
      status_text="Not implemented"
    elif is_stack_deployed "$stack" "$environment"; then
      cd "${STACKS_DIR}/${stack}" > /dev/null 2>&1
      resource_count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
      cd - > /dev/null 2>&1

      # Check for drift
      if terraform plan -detailed-exitcode -var-file="${environment}.tfvars" > /dev/null 2>&1; then
        status_icon="${GREEN}✓${NC}"
        status_text="Deployed"
      else
        status_icon="${YELLOW}⚠${NC}"
        status_text="Drift detected"
      fi
    else
      status_icon="○"
      status_text="Not deployed"
    fi

    printf "%-15s %b %-15s %s\n" "$stack" "$status_icon" "$status_text" "$resource_count"
  done

  echo ""
  print_info "Legend: ✓ Deployed | ⚠ Drift detected | ○ Not deployed | ⚫ Not implemented"
}

# Function to show usage
show_usage() {
  cat << EOF
${BLUE}SrvThreds Azure Terraform Stack Deployment${NC}

${CYAN}Usage:${NC}
  $0 <command> [arguments]

${CYAN}Commands:${NC}
  ${GREEN}build${NC} <stack> <environment>
    Initialize, validate, and plan stack (no changes made)
    Creates a plan file for later deployment
    Safe to run anytime - validates configuration

  ${GREEN}apply${NC} <stack> <environment>
    Deploy a stack to the specified environment
    Automatically runs build first if no plan exists
    Checks dependencies before deploying

  ${GREEN}destroy${NC} <stack> <environment>
    Destroy a stack in the specified environment
    Checks for dependent stacks before destroying
    Requires confirmation before proceeding

  ${GREEN}all${NC} <environment>
    Deploy all stacks in dependency order
    Runs build on all stacks first
    Then applies all if builds succeed
    Requires confirmation before applying

  ${GREEN}destroy-all${NC} <environment>
    Destroy all stacks in reverse dependency order
    Requires typing full confirmation phrase
    USE WITH EXTREME CAUTION

  ${GREEN}status${NC} <environment>
    Show deployment status of all stacks
    Displays resource counts and drift detection

${CYAN}Stacks:${NC}
EOF
  for i in "${!STACK_ORDER[@]}"; do
    echo "  $((i+1)). ${STACK_ORDER[$i]}"
  done

  cat << EOF

${CYAN}Environments:${NC}
  dev, test, prod

${CYAN}Examples:${NC}
  # Build (validate and plan) networking stack for dev
  $0 build networking dev

  # Deploy Key Vault to dev
  $0 apply keyvault dev

  # Deploy all stacks to dev environment
  $0 all dev

  # Show deployment status
  $0 status dev

  # Destroy a specific stack
  $0 destroy redis dev

  # Destroy all infrastructure (DANGEROUS!)
  $0 destroy-all dev

${CYAN}Workflow:${NC}
  1. Build stack to validate and preview changes
     ${BLUE}→${NC} $0 build networking dev

  2. Apply if build looks good
     ${BLUE}→${NC} $0 apply networking dev

  3. Or build and apply all at once
     ${BLUE}→${NC} $0 all dev
EOF
}

# Main script
main() {
  # Check if Azure CLI is installed
  if ! command -v az &> /dev/null; then
    print_error "Azure CLI not found. Please install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi

  # Check if Terraform is installed
  if ! command -v terraform &> /dev/null; then
    print_error "Terraform not found. Please install: https://www.terraform.io/downloads"
    exit 1
  fi

  # Check if user is logged in to Azure
  if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run: az login"
    exit 1
  fi

  # Show usage if no arguments
  if [[ $# -lt 1 ]]; then
    show_usage
    exit 1
  fi

  local command=$1

  # Handle commands
  case $command in
    build)
      if [[ $# -lt 3 ]]; then
        print_error "Usage: $0 build <stack> <environment>"
        exit 1
      fi
      validate_inputs "$1" "$2" "$3"
      build_stack "$2" "$3"
      ;;

    apply)
      if [[ $# -lt 3 ]]; then
        print_error "Usage: $0 apply <stack> <environment>"
        exit 1
      fi
      validate_inputs "$1" "$2" "$3"
      apply_stack "$2" "$3"
      ;;

    destroy)
      if [[ $# -lt 3 ]]; then
        print_error "Usage: $0 destroy <stack> <environment>"
        exit 1
      fi
      validate_inputs "$1" "$2" "$3"
      destroy_stack "$2" "$3"
      ;;

    all)
      if [[ $# -lt 2 ]]; then
        print_error "Usage: $0 all <environment>"
        exit 1
      fi
      validate_inputs "$1" "" "$2"
      deploy_all "$2"
      ;;

    destroy-all)
      if [[ $# -lt 2 ]]; then
        print_error "Usage: $0 destroy-all <environment>"
        exit 1
      fi
      validate_inputs "$1" "" "$2"
      destroy_all "$2"
      ;;

    status)
      if [[ $# -lt 2 ]]; then
        print_error "Usage: $0 status <environment>"
        exit 1
      fi
      validate_inputs "$1" "" "$2"
      show_status "$2"
      ;;

    help|--help|-h)
      show_usage
      ;;

    *)
      print_error "Unknown command: $command"
      show_usage
      exit 1
      ;;
  esac
}

# Run main function
main "$@"
