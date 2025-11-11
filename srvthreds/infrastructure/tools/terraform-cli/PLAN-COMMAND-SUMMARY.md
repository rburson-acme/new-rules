# Plan Command Addition

## Overview

Added a dedicated `plan` command to the Terraform CLI that allows infrastructure teams to preview changes before deployment.

## What Was Added

### New Command: `plan`

```bash
npm run terraformCli -- plan <environment> [stacks...]
```

**Purpose**: Preview infrastructure changes without applying them

**What it does**:
1. Initializes Terraform for each stack
2. Validates configuration
3. Generates Terraform plan files showing what would change
4. Does NOT apply any changes

**Usage Examples**:
```bash
# Preview all stacks for dev environment
npm run terraformCli -- plan dev

# Preview specific stacks
npm run terraformCli -- plan dev networking keyvault

# Preview a single stack
npm run terraformCli -- plan dev networking
```

## Workflow

The recommended workflow is now:

```bash
# 1. Preview changes
npm run terraformCli -- plan dev

# 2. Review the plan output carefully

# 3. If satisfied, deploy
npm run terraformCli -- deploy dev
```

This is safer than the previous `deploy --dry-run` approach because:
- Plan files are generated and can be reviewed
- Clear separation between planning and applying
- Follows standard Terraform workflow patterns

## Implementation Details

### Files Modified

1. **infrastructure/tools/terraform-cli/commands/deploy.ts**
   - Added `planCommand()` function
   - Exported as `planCommand`

2. **infrastructure/tools/terraform-cli/cli.ts**
   - Imported `planCommand` from deploy.ts
   - Added plan command to commands map
   - Updated help text with plan command
   - Added plan example to usage examples

3. **infrastructure/tools/terraform-cli/README.md**
   - Added plan command to overview
   - Added plan example to usage section
   - Added detailed plan command documentation

4. **infrastructure/cloud/terraform/docs/QUICK-REFERENCE.md**
   - Added plan command to planning & deployment section
   - Updated common scenarios to use plan command
   - Added plan command to help section

5. **infrastructure/cloud/terraform/README.md**
   - Added plan command to common commands section

## Comparison: Plan vs Deploy --dry-run

| Feature | `plan` | `deploy --dry-run` |
|---------|--------|-------------------|
| Generates plan files | ✅ Yes | ✅ Yes |
| Shows what would change | ✅ Yes | ✅ Yes |
| Applies changes | ❌ No | ❌ No |
| Requires confirmation | ❌ No | ❌ No |
| Workflow clarity | ✅ Clear separation | ⚠️ Mixed concerns |

## Benefits

1. **Clearer Intent** - `plan` explicitly means "preview only"
2. **Standard Pattern** - Follows Terraform's `terraform plan` convention
3. **Safer Workflow** - Explicit separation between planning and applying
4. **Better Documentation** - Clear command purpose in help text
5. **Flexibility** - Can use plan without deploying, or deploy without planning

## Backward Compatibility

The `deploy --dry-run` option is still available and works as before. The plan command is an additional option, not a replacement.

## Testing

The plan command has been tested and verified to:
- Show in CLI help: `npm run terraformCli -- --help`
- Display command help: `npm run terraformCli -- plan`
- Handle missing arguments correctly
- Support all stack selection options

## Next Steps

1. Use `npm run terraformCli -- plan dev` to preview changes
2. Review the plan output
3. Use `npm run terraformCli -- deploy dev` to apply changes
4. Check status with `npm run terraformCli -- status dev`

