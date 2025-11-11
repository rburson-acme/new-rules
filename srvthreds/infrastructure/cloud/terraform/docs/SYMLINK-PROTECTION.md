# Symlink Protection Strategy

**Purpose**: Prevent symlink configuration drift in Terraform infrastructure  
**Criticality**: HIGH - Symlink consistency is essential for reliable CI/CD deployments  
**Last Updated**: 2025-11-10

---

## Why Symlink Protection Matters

### The Problem

Symlinks are **critical** to our Terraform state management architecture:

1. **Single Source of Truth**: `_shared/backend-config.tf` defines backend configuration once
2. **All Stacks Reference It**: Via symlinks named `backend-config.tf`
3. **Drift = Deployment Failures**: Broken/missing symlinks cause CI/CD failures
4. **Silent Failures**: Git doesn't validate symlink targets, can commit broken links

### The Risk

Without protection, developers might:
- ❌ Create stacks without symlinks
- ❌ Use wrong symlink names (`shared-backend-config.tf` vs `backend-config.tf`)
- ❌ Point symlinks to wrong targets
- ❌ Duplicate `backend_config` definitions in stack files
- ❌ Commit broken symlinks that work locally but fail in CI/CD

### The Impact

- 🔥 **CI/CD Pipeline Failures**: Deployments fail with cryptic errors
- 🔥 **State Management Breaks**: Can't reference remote state
- 🔥 **Inconsistent Deployments**: Different stacks use different backend configs
- 🔥 **Hard to Debug**: Symlink issues aren't obvious in code review

---

## Protection Layers

We implement **defense in depth** with multiple protection layers:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Developer Workstation (Pre-Commit Hook)   │
│ - Validates before git commit                       │
│ - Catches issues immediately                        │
│ - Fast feedback loop                                │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: CI/CD Pipeline (Validation Step)          │
│ - Validates on every PR/push                        │
│ - Blocks merge if validation fails                  │
│ - Catches issues that bypass pre-commit             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: Deploy Script (Runtime Check)             │
│ - Validates before deployment                       │
│ - Last line of defense                              │
│ - Prevents bad deployments                          │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Pre-Commit Hook

### Installation

**Option A: Automatic (Recommended)**

```bash
# From anywhere in the repository
cd /path/to/repo/srvthreds/infrastructure/cloud/terraform
./scripts/install-git-hooks.sh
```

The script automatically:
- Detects monorepo structure
- Finds the git repository root
- Creates the `.git/hooks` directory if needed
- Calculates correct relative paths
- Creates the symlink with proper target

**Option B: Manual (Not Recommended)**

If you need to install manually, the script handles monorepo complexity for you.
Use Option A instead.

### How It Works

1. Developer runs `git commit`
2. Hook detects if Terraform files are being committed
3. Runs `validate-symlinks.sh`
4. **Blocks commit** if validation fails
5. Developer fixes issues and commits again

### Benefits

- ✅ Immediate feedback (before commit)
- ✅ Prevents broken symlinks from entering repo
- ✅ Fast (runs in <1 second)
- ✅ Can be bypassed in emergencies (`--no-verify`)

### Limitations

- ⚠️ Requires manual installation per developer
- ⚠️ Can be bypassed with `--no-verify`
- ⚠️ Only runs on developer machines

---

## Layer 2: CI/CD Pipeline Integration

### GitHub Actions Example

```yaml
name: Terraform Validation

on:
  pull_request:
    paths:
      - 'infrastructure/cloud/terraform/**'
  push:
    branches:
      - main
      - develop
    paths:
      - 'infrastructure/cloud/terraform/**'

jobs:
  validate-symlinks:
    name: Validate Terraform Symlinks
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Validate symlink consistency
        run: |
          cd infrastructure/cloud/terraform
          ./scripts/validate-symlinks.sh
        
      - name: Report validation failure
        if: failure()
        run: |
          echo "::error::Symlink validation failed!"
          echo "::error::Run './scripts/validate-symlinks.sh --fix' to fix issues"
          exit 1
```

### Azure DevOps Example

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - infrastructure/cloud/terraform/*

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
  
  - task: Bash@3
    displayName: 'Validate Terraform Symlinks'
    inputs:
      targetType: 'inline'
      script: |
        cd infrastructure/cloud/terraform
        ./scripts/validate-symlinks.sh
      failOnStderr: true
  
  - task: PublishTestResults@2
    condition: failed()
    displayName: 'Report Validation Failure'
    inputs:
      testResultsFormat: 'JUnit'
      failTaskOnFailedTests: true
```

### GitLab CI Example

```yaml
stages:
  - validate
  - plan
  - apply

validate-symlinks:
  stage: validate
  image: ubuntu:latest
  script:
    - cd infrastructure/cloud/terraform
    - ./scripts/validate-symlinks.sh
  rules:
    - changes:
        - infrastructure/cloud/terraform/**
  allow_failure: false
```

### Benefits

- ✅ Runs automatically on every PR/push
- ✅ Can't be bypassed
- ✅ Visible in PR checks
- ✅ Blocks merge if validation fails

---

## Layer 3: Deploy Script Integration

### How It Works

The `deploy-stack.sh` script now includes validation:

```bash
# Automatically runs before deployment
./scripts/deploy-stack.sh all dev

# Validation happens in deploy_all() function:
# 1. Checks symlinks before any deployment
# 2. Aborts if validation fails
# 3. Provides clear error message
```

### Benefits

- ✅ Last line of defense
- ✅ Prevents bad deployments
- ✅ Works in all environments (local, CI/CD)
- ✅ No additional steps required

---

## Validation Script Details

### What It Checks

The `validate-symlinks.sh` script validates:

1. **Source File Exists**: `_shared/backend-config.tf` exists
2. **Source File Content**: Contains `backend_config` and `state_key_format`
3. **Required Symlinks**: All stacks that use remote state have symlinks
4. **Symlink Names**: All use `backend-config.tf` (not `shared-backend-config.tf`)
5. **Symlink Targets**: All point to `../_shared/backend-config.tf`
6. **No Old Symlinks**: No stacks have old `shared-backend-config.tf` files
7. **No Duplicates**: No stacks have inline `backend_config` definitions
8. **Variable Names**: All use `state_key_format` (not `state_key_pattern`)

### Exit Codes

- `0` - All validations passed
- `1` - Validation failures found

### Auto-Fix Mode

```bash
# Automatically fix common issues
./scripts/validate-symlinks.sh --fix

# What it fixes:
# - Creates missing symlinks
# - Renames incorrect symlink names
# - Updates symlink targets
# - Removes old symlinks
```

### Output Example

```
═══════════════════════════════════════════════════════
  SYMLINK VALIDATION
═══════════════════════════════════════════════════════

▸ Validating shared backend configuration source...
✓ _shared/backend-config.tf exists
✓ _shared/backend-config.tf contains backend_config
✓ _shared/backend-config.tf contains state_key_format

▸ Validating stacks that REQUIRE symlinks...
✓ keyvault: Symlink correct
✓ acr: Symlink correct
✓ cosmosdb: Symlink correct
✓ redis: Symlink correct
✓ servicebus: Symlink correct
✓ aks: Symlink correct
✓ appgateway: Symlink correct
✓ monitoring: Symlink correct

▸ Validating stacks that should NOT have symlinks...
✓ networking: Correctly has no symlink
✓ _shared: Correctly has no symlink
✓ common: Correctly has no symlink

▸ Checking for duplicate backend_config definitions...
✓ keyvault: No duplicate backend_config
✓ acr: No duplicate backend_config
...

═══════════════════════════════════════════════════════
  VALIDATION SUMMARY
═══════════════════════════════════════════════════════
Total checks:   24
Errors:         0
Warnings:       0

✅ ALL VALIDATIONS PASSED!
```

---

## Developer Workflow

### Creating a New Stack

```bash
# 1. Create stack directory
mkdir infrastructure/cloud/terraform/stacks/newstack

# 2. Create symlink (CRITICAL!)
cd infrastructure/cloud/terraform/stacks/newstack
ln -s ../_shared/backend-config.tf ./backend-config.tf

# 3. Create main.tf with remote state reference
cat > main.tf << 'EOF'
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}
EOF

# 4. Validate before committing
cd ../..
./scripts/validate-symlinks.sh

# 5. Commit
git add stacks/newstack
git commit -m "Add newstack"
```

### Fixing Validation Errors

```bash
# Run validation
./scripts/validate-symlinks.sh

# If errors found, auto-fix
./scripts/validate-symlinks.sh --fix

# Verify fixes
./scripts/validate-symlinks.sh

# Commit fixes
git add -A
git commit -m "Fix symlink consistency"
```

---

## Troubleshooting

### Error: "Missing symlink backend-config.tf"

**Cause**: Stack uses remote state but doesn't have symlink

**Fix**:
```bash
cd stacks/<stack-name>
ln -s ../_shared/backend-config.tf ./backend-config.tf
```

### Error: "Symlink points to wrong target"

**Cause**: Symlink exists but points to wrong file

**Fix**:
```bash
cd stacks/<stack-name>
rm backend-config.tf
ln -s ../_shared/backend-config.tf ./backend-config.tf
```

### Error: "Duplicate backend_config in main.tf"

**Cause**: Stack has both symlink AND inline definition

**Fix**: Remove inline definition from `main.tf`:
```bash
# Remove these lines from main.tf:
locals {
  backend_config = {
    ...
  }
}
```

### Pre-Commit Hook Not Running

**Cause**: Hook not installed or not executable

**Fix**:
```bash
cd /path/to/srvthreds
chmod +x .git/hooks/pre-commit
# Or reinstall
ln -sf ../../infrastructure/cloud/terraform/scripts/pre-commit-hook.sh .git/hooks/pre-commit
```

---

## Maintenance

### Regular Checks

Run validation regularly:

```bash
# Weekly or before major deployments
./infrastructure/cloud/terraform/scripts/validate-symlinks.sh
```

### After Onboarding New Developers

Ensure they install the pre-commit hook:

```bash
# Add to onboarding checklist
cd /path/to/srvthreds
ln -s ../../infrastructure/cloud/terraform/scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Updating Validation Rules

If you add new stacks or change symlink strategy:

1. Update `REQUIRED_SYMLINK_STACKS` array in `validate-symlinks.sh`
2. Update `NO_SYMLINK_STACKS` array if needed
3. Test validation: `./scripts/validate-symlinks.sh`
4. Update this documentation

---

## Summary

### Protection Checklist

- ✅ Pre-commit hook installed on developer machines
- ✅ CI/CD pipeline includes validation step
- ✅ Deploy script validates before deployment
- ✅ Validation script tested and working
- ✅ Documentation updated
- ✅ Team trained on workflow

### Key Files

- `scripts/validate-symlinks.sh` - Main validation script
- `scripts/pre-commit-hook.sh` - Git pre-commit hook
- `scripts/deploy-stack.sh` - Deploy script (includes validation)
- `stacks/_shared/backend-config.tf` - Source of truth
- `SYMLINK-PROTECTION.md` - This document

### Quick Commands

```bash
# Validate
./scripts/validate-symlinks.sh

# Auto-fix
./scripts/validate-symlinks.sh --fix

# Install pre-commit hook
ln -s ../../infrastructure/cloud/terraform/scripts/pre-commit-hook.sh .git/hooks/pre-commit

# Deploy (includes validation)
./scripts/deploy-stack.sh all dev
```

---

**Remember**: Symlink consistency is **critical** for reliable deployments. When in doubt, run validation!

