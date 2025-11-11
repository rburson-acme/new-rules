#!/usr/bin/env bash
#
# Git Pre-Commit Hook for Terraform Symlink Validation
#
# This hook validates symlink consistency before allowing commits.
# Prevents broken symlinks from being committed to the repository.
#
# Installation:
#   ln -s ../../infrastructure/cloud/terraform/scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or run manually:
#   ./infrastructure/cloud/terraform/scripts/pre-commit-hook.sh

set -e

# Find git repository root
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Error: Not in a git repository"
  exit 1
}

# Handle monorepo structure - check if srvthreds subdirectory exists
if [ -d "$GIT_ROOT/srvthreds/infrastructure/cloud/terraform" ]; then
  # Monorepo structure
  TERRAFORM_DIR="$GIT_ROOT/srvthreds/infrastructure/cloud/terraform"
elif [ -d "$GIT_ROOT/infrastructure/cloud/terraform" ]; then
  # Standard structure
  TERRAFORM_DIR="$GIT_ROOT/infrastructure/cloud/terraform"
else
  echo "Error: Cannot find Terraform directory"
  exit 1
fi

VALIDATION_SCRIPT="$TERRAFORM_DIR/scripts/validate-symlinks.sh"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  PRE-COMMIT: Terraform Symlink Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if any Terraform files are being committed
if [ -n "$GIT_DIR" ]; then
  TERRAFORM_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.tf$|backend-config\.tf' || true)
  
  if [ -z "$TERRAFORM_FILES" ]; then
    echo -e "${GREEN}✓ No Terraform files in commit - skipping validation${NC}"
    exit 0
  fi
  
  echo "Terraform files being committed:"
  echo "$TERRAFORM_FILES" | sed 's/^/  - /'
  echo ""
fi

# Run validation
if [ ! -f "$VALIDATION_SCRIPT" ]; then
  echo -e "${YELLOW}⚠  Validation script not found - skipping${NC}"
  echo "Expected: $VALIDATION_SCRIPT"
  exit 0
fi

if "$VALIDATION_SCRIPT"; then
  echo ""
  echo -e "${GREEN}✅ Symlink validation passed - commit allowed${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}❌ Symlink validation failed - commit blocked${NC}"
  echo ""
  echo "To fix:"
  echo "  1. Run: $VALIDATION_SCRIPT --fix"
  echo "  2. Review and stage the fixes"
  echo "  3. Try committing again"
  echo ""
  echo "To bypass (NOT RECOMMENDED):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

