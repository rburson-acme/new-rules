#!/usr/bin/env bash
#
# Install Git Hooks for Terraform Validation
#
# This script installs pre-commit hooks to validate symlink consistency
# before allowing commits. Run this once per developer workstation.
#
# Usage: ./scripts/install-git-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════"
echo "  GIT HOOKS INSTALLATION"
echo "═══════════════════════════════════════════════════════"
echo ""

# Find the git repository root
echo "▸ Locating git repository..."
if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  echo -e "${RED}✗ Not in a git repository!${NC}"
  echo ""
  echo "This script must be run from within a git repository."
  echo "Current directory: $(pwd)"
  echo ""
  echo "To initialize a git repository:"
  echo "  git init"
  echo ""
  exit 1
fi

# This is a monorepo - the project is in srvthreds subdirectory
# We need to find the srvthreds directory relative to git root
echo "▸ Detecting monorepo structure..."

# Check if we're already in srvthreds or a subdirectory of it
CURRENT_DIR="$(pwd)"
if [[ "$CURRENT_DIR" == *"/srvthreds/"* ]] || [[ "$CURRENT_DIR" == *"/srvthreds" ]]; then
  # Extract the path up to and including srvthreds
  PROJECT_ROOT="${CURRENT_DIR%%/srvthreds/*}/srvthreds"
  echo -e "${GREEN}✓ Detected monorepo - project root: srvthreds${NC}"
elif [ -d "$GIT_ROOT/srvthreds" ]; then
  # srvthreds exists as subdirectory of git root
  PROJECT_ROOT="$GIT_ROOT/srvthreds"
  echo -e "${GREEN}✓ Detected monorepo - project root: srvthreds${NC}"
else
  # Not a monorepo, use git root
  PROJECT_ROOT="$GIT_ROOT"
  echo -e "${BLUE}Standard repository structure${NC}"
fi

GIT_DIR="$GIT_ROOT/.git"
GIT_HOOKS_DIR="$GIT_DIR/hooks"

# Check if .git directory exists
if [ ! -d "$GIT_DIR" ]; then
  echo -e "${RED}✗ Git directory not found!${NC}"
  echo "Expected: $GIT_DIR"
  echo ""
  echo "This might be a git worktree or submodule."
  echo "Please run this script from the main repository."
  exit 1
fi

# Create hooks directory if it doesn't exist
if [ ! -d "$GIT_HOOKS_DIR" ]; then
  echo -e "${YELLOW}⚠  Hooks directory doesn't exist, creating it...${NC}"
  mkdir -p "$GIT_HOOKS_DIR"
  echo -e "${GREEN}✓ Created $GIT_HOOKS_DIR${NC}"
fi

echo -e "${GREEN}✓ Found git repository${NC}"
echo -e "${BLUE}Git root: $GIT_ROOT${NC}"
echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Git hooks directory: $GIT_HOOKS_DIR${NC}"
echo ""

# Calculate relative path from hooks directory to the pre-commit script
# This ensures the symlink works regardless of where the repo is cloned
echo "▸ Calculating relative path for symlink..."

PRE_COMMIT_HOOK="$GIT_HOOKS_DIR/pre-commit"
PRE_COMMIT_SOURCE="$SCRIPT_DIR/pre-commit-hook.sh"

if [ ! -f "$PRE_COMMIT_SOURCE" ]; then
  echo -e "${RED}✗ Source hook not found: $PRE_COMMIT_SOURCE${NC}"
  exit 1
fi

# Calculate relative path from .git/hooks to infrastructure/cloud/terraform/scripts
# This makes the symlink portable across different clone locations
RELATIVE_PATH=$(python3 -c "import os.path; print(os.path.relpath('$PRE_COMMIT_SOURCE', '$GIT_HOOKS_DIR'))" 2>/dev/null) || \
  RELATIVE_PATH=$(perl -MFile::Spec -e "print File::Spec->abs2rel('$PRE_COMMIT_SOURCE', '$GIT_HOOKS_DIR')" 2>/dev/null) || \
  RELATIVE_PATH="../../srvthreds/infrastructure/cloud/terraform/scripts/pre-commit-hook.sh"

echo -e "${BLUE}Symlink target: $RELATIVE_PATH${NC}"
echo ""

# Install pre-commit hook
echo "▸ Installing pre-commit hook..."

# Check if hook already exists
if [ -f "$PRE_COMMIT_HOOK" ] || [ -L "$PRE_COMMIT_HOOK" ]; then
  echo -e "${YELLOW}⚠  Pre-commit hook already exists${NC}"

  # Check if it's our hook
  if [ -L "$PRE_COMMIT_HOOK" ]; then
    CURRENT_TARGET=$(readlink "$PRE_COMMIT_HOOK")

    # Check if it points to our script (handle both relative and absolute paths)
    if [[ "$CURRENT_TARGET" == *"pre-commit-hook.sh" ]]; then
      echo -e "${GREEN}✓ Hook is already correctly installed${NC}"
      echo -e "${BLUE}Current target: $CURRENT_TARGET${NC}"
      echo ""
      echo "═══════════════════════════════════════════════════════"
      echo "  INSTALLATION COMPLETE"
      echo "═══════════════════════════════════════════════════════"
      echo ""
      echo "Pre-commit hook is active and will validate symlinks before commits."
      exit 0
    fi
  fi
  
  # Ask user if they want to replace
  echo ""
  echo "Current hook content:"
  head -5 "$PRE_COMMIT_HOOK"
  echo "..."
  echo ""
  read -p "Replace existing hook? (y/N): " -n 1 -r
  echo ""
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
  fi
  
  # Backup existing hook
  BACKUP="$PRE_COMMIT_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
  echo "Backing up existing hook to: $BACKUP"
  mv "$PRE_COMMIT_HOOK" "$BACKUP"
fi

# Create symlink
echo "▸ Creating symlink..."
cd "$GIT_HOOKS_DIR"
ln -s "$RELATIVE_PATH" pre-commit

# Verify symlink was created
if [ -L "$PRE_COMMIT_HOOK" ]; then
  echo -e "${GREEN}✓ Symlink created successfully${NC}"
  ACTUAL_TARGET=$(readlink "$PRE_COMMIT_HOOK")
  echo -e "${BLUE}Symlink: $PRE_COMMIT_HOOK -> $ACTUAL_TARGET${NC}"
else
  echo -e "${RED}✗ Failed to create symlink${NC}"
  exit 1
fi

# Make sure the source script is executable
if [ ! -x "$PRE_COMMIT_SOURCE" ]; then
  echo "▸ Making source script executable..."
  chmod +x "$PRE_COMMIT_SOURCE"
fi

echo ""

# Test the hook
echo "▸ Testing hook installation..."
if "$PRE_COMMIT_HOOK" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Hook is executable and working${NC}"
else
  echo -e "${YELLOW}⚠  Hook test returned non-zero (may be expected)${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  INSTALLATION COMPLETE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Git hooks successfully installed!${NC}"
echo ""
echo "What happens now:"
echo "  1. Every time you commit, symlinks will be validated"
echo "  2. If validation fails, commit will be blocked"
echo "  3. You'll see clear error messages with fix instructions"
echo ""
echo "To test the validation:"
echo "  cd $PROJECT_ROOT/infrastructure/cloud/terraform"
echo "  ./scripts/validate-symlinks.sh"
echo ""
echo "To test the hook:"
echo "  # Make a change to a Terraform file and try to commit"
echo "  git commit -m \"test\""
echo ""
echo "To bypass the hook (NOT RECOMMENDED):"
echo "  git commit --no-verify"
echo ""

