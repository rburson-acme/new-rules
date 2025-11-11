#!/usr/bin/env bash
#
# Fix Symlink Consistency
# 
# This script fixes minor symlink naming inconsistencies found in the sanity check.
# Safe to run - only fixes naming, doesn't change functionality.
#
# Usage: ./scripts/fix-symlink-consistency.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STACKS_DIR="$TERRAFORM_DIR/stacks"

echo "═══════════════════════════════════════════════════════"
echo "  FIXING SYMLINK CONSISTENCY"
echo "═══════════════════════════════════════════════════════"
echo ""

# Fix 1: ACR symlink name
echo "▸ Fixing ACR symlink name..."
cd "$STACKS_DIR/acr"
if [ -L "shared-backend-config.tf" ]; then
  echo "  Found: shared-backend-config.tf (wrong name)"
  rm shared-backend-config.tf
  ln -s ../_shared/backend-config.tf backend-config.tf
  echo "  ✓ Renamed to: backend-config.tf"
else
  echo "  ✓ Already correct"
fi

echo ""
echo "▸ Verifying all symlinks..."
cd "$STACKS_DIR"

CORRECT=0
INCORRECT=0

for stack in keyvault acr cosmosdb redis servicebus aks appgateway monitoring; do
  if [ -L "$stack/backend-config.tf" ]; then
    target=$(readlink "$stack/backend-config.tf")
    if [ "$target" = "../_shared/backend-config.tf" ]; then
      echo "  ✓ $stack/backend-config.tf -> ../_shared/backend-config.tf"
      ((CORRECT++))
    else
      echo "  ⚠️  $stack/backend-config.tf -> $target (unexpected target)"
      ((INCORRECT++))
    fi
  elif [ -L "$stack/shared-backend-config.tf" ]; then
    echo "  ⚠️  $stack/shared-backend-config.tf (wrong name)"
    ((INCORRECT++))
  else
    echo "  ⚠️  $stack has no backend-config symlink"
    ((INCORRECT++))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════════════════"
echo "  Correct symlinks: $CORRECT"
echo "  Issues found: $INCORRECT"
echo ""

if [ $INCORRECT -eq 0 ]; then
  echo "✅ All symlinks are consistent!"
else
  echo "⚠️  Some issues remain - check output above"
  exit 1
fi

