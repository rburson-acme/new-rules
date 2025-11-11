# Terraform CLI Types

This directory contains all centralized type definitions, interfaces, constants, and enums used throughout the Terraform CLI.

## File Organization

```
types/
├── index.ts              # Main export file - import from here
├── config.types.ts       # Configuration-related types
├── state.types.ts        # Terraform state types
├── command.types.ts      # Command options and results
├── executor.types.ts     # Executor interface for DI
├── constants.ts          # Constants and enums
└── README.md            # This file
```

## Usage

### Importing Types

**Recommended: Import from index**
```typescript
import type {
  EnvironmentConfig,
  TerraformState,
  TerraformInitOptions
} from '../types/index.js';
```

**Alternative: Import from specific files**
```typescript
import type { EnvironmentConfig } from '../types/config.types.js';
import type { TerraformState } from '../types/state.types.js';
```

### Importing Constants

```typescript
import { COMMAND_DESCRIPTIONS, BACKEND_CONFIG } from '../types/constants.js';
```

## Type Categories

### Configuration Types (`config.types.ts`)
Types related to CLI and infrastructure configuration:
- `TerraformStackConfig` - Stack definition
- `StackConfig` - Alias for stack configuration
- `EnvironmentConfig` - Environment settings
- `DeployConfig` - Deployment configuration
- `EnvironmentsConfig` - Map of environment configs

### State Types (`state.types.ts`)
Types representing Terraform state structure:
- `TerraformState` - Complete state structure
- `TerraformResource` - Individual resource in state
- `TerraformOutput` - Output value with metadata

### Command Types (`command.types.ts`)
Types for command execution and options:
- `TerraformCommandResult` - Command execution result
- `TerraformInitOptions` - Options for init command
- `TerraformPlanOptions` - Options for plan command
- `TerraformApplyOptions` - Options for apply command

### Executor Types (`executor.types.ts`)
Interface for dependency injection:
- `ITerraformExecutor` - Executor interface for testing

### Constants (`constants.ts`)
Application-wide constants:
- `COMMAND_DESCRIPTIONS` - Command description strings
- `BACKEND_CONFIG` - Terraform backend defaults
- `EXIT_CODES` - CLI exit codes
- `STATE_COMMANDS` - Valid state subcommands
- `StateCommand` - Type for state commands

## Benefits of This Structure

### 1. Easy Discovery
All types are in one predictable location, making them easy to find.

### 2. Better IDE Support
- Faster autocomplete
- Better type inference
- Clearer import paths

### 3. Improved Compilation
- Types can be compiled independently
- Better incremental compilation
- Faster type checking

### 4. Maintainability
- Single source of truth for types
- Easy to update related types together
- Clear organization by concern

### 5. Documentation
- Types are self-documenting
- Easy to generate API documentation
- Clear contracts between modules

## Adding New Types

When adding new types, follow these steps:

1. **Choose the appropriate file** based on the type's purpose:
   - Configuration? → `config.types.ts`
   - State-related? → `state.types.ts`
   - Command-related? → `command.types.ts`
   - Constants/enums? → `constants.ts`

2. **Add JSDoc documentation** explaining the type's purpose

3. **Export from `index.ts`** for easy importing

4. **Update this README** if adding a new category

## Example: Adding a New Type

```typescript
// 1. Add to appropriate file (e.g., command.types.ts)
/**
 * Options for terraform destroy command
 */
export interface TerraformDestroyOptions extends ShellOptions {
  /** Force destroy without confirmation */
  force?: boolean;
  /** Target specific resources */
  target?: string[];
}

// 2. Export from index.ts
export type {
  TerraformDestroyOptions
} from './command.types.js';

// 3. Use in your code
import type { TerraformDestroyOptions } from '../types/index.js';
```

## Migration Guide

If you have existing code importing types from other locations:

**Old:**
```typescript
import { EnvironmentConfig } from '../utils/terraform.js';
```

**New:**
```typescript
import type { EnvironmentConfig } from '../types/index.js';
```

Note: The old imports still work due to re-exports for backward compatibility, but new code should use the centralized types directory.
