# Quick Reference

Fast lookup for common Terraform CLI commands.

## Setup (First Time)

```bash
# Bootstrap infrastructure (creates state storage)
npm run terraformCli -- bootstrap dev
```

## Planning & Deployment

```bash
# Preview changes (generates plan files)
npm run terraformCli -- plan dev

# Preview specific stacks
npm run terraformCli -- plan dev networking keyvault

# Deploy all stacks
npm run terraformCli -- deploy dev

# Deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault

# Deploy without confirmation
npm run terraformCli -- deploy dev --force
```

## Status & Monitoring

```bash
# Check deployment status
npm run terraformCli -- status dev

# Check specific stacks
npm run terraformCli -- status dev networking keyvault
```

## State Management

```bash
# Backup state
npm run terraformCli -- state backup dev

# Validate state
npm run terraformCli -- state validate dev

# Repair state (refresh from Azure)
npm run terraformCli -- state repair dev

# Show state
npm run terraformCli -- state show dev networking

# Clean state (find orphaned resources)
npm run terraformCli -- state clean dev
```

## Cleanup

```bash
# Preview cleanup
npm run terraformCli -- cleanup dev --dry-run

# Cleanup infrastructure
npm run terraformCli -- cleanup dev

# Cleanup without confirmation
npm run terraformCli -- cleanup dev --force
```

## Help

```bash
# Show all commands
npm run terraformCli -- --help

# Show command help
npm run terraformCli -- plan --help
npm run terraformCli -- deploy --help
npm run terraformCli -- state --help
npm run terraformCli -- cleanup --help
npm run terraformCli -- bootstrap --help
npm run terraformCli -- status --help
```

## Debug

```bash
# Enable debug logging
npm run terraformCli -- --debug deploy dev
```

## Environments

Available environments:
- `dev` - Development
- `test` - Testing
- `prod` - Production

## Stacks

Available stacks (in deployment order):
1. networking
2. keyvault
3. acr
4. cosmosdb
5. redis
6. servicebus
7. monitoring
8. aks
9. appgateway

## Common Scenarios

### Deploy to new environment

```bash
# 1. Bootstrap
npm run terraformCli -- bootstrap test

# 2. Deploy all stacks
npm run terraformCli -- deploy test

# 3. Verify
npm run terraformCli -- status test
```

### Update a stack

```bash
# 1. Edit stack files (e.g., stacks/networking/main.tf)

# 2. Preview changes (generates plan files)
npm run terraformCli -- plan dev networking

# 3. Review the plan output

# 4. Apply changes
npm run terraformCli -- deploy dev networking

# 5. Verify
npm run terraformCli -- status dev networking
```

### Fix state issues

```bash
# 1. Backup state
npm run terraformCli -- state backup dev

# 2. Repair state
npm run terraformCli -- state repair dev

# 3. Validate
npm run terraformCli -- state validate dev
```

### Complete reset

```bash
# 1. Preview
npm run terraformCli -- cleanup dev --dry-run

# 2. Cleanup
npm run terraformCli -- cleanup dev

# 3. Bootstrap again
npm run terraformCli -- bootstrap dev

# 4. Redeploy
npm run terraformCli -- deploy dev
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

Quick fixes:
- **State out of sync**: `npm run terraformCli -- state repair dev`
- **Resource already exists**: Wait for soft-delete purge or cleanup and redeploy
- **Deployment failed**: Check error message, fix issue, retry
- **Need help**: `npm run terraformCli -- --help` or enable debug mode

## Resource Group Names

- **dev**: `CAZ-SRVTHREDS-D-E-RG`
- **test**: `CAZ-SRVTHREDS-T-E-RG`
- **prod**: `CAZ-SRVTHREDS-P-E-RG`

## Bootstrap Resources

- **Resource Group**: `srvthreds-terraform-rg`
- **Storage Account**: `srvthredstfstate<random>`
- **Container**: `tfstate`

## Important Notes

- ✅ Always use the CLI - never run `terraform` directly
- ✅ Use `--dry-run` to preview changes
- ✅ Backup state before risky operations
- ✅ Check status regularly
- ⚠️ Cleanup is destructive and cannot be undone

