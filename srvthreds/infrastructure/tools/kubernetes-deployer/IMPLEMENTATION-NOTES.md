# Implementation Notes

## Utility Code Consolidation

### Current State (Phase 0)

The kubernetes-deployer currently includes its own utility implementations:
- `src/utils/shell.ts` - Shell command execution
- `src/utils/logger.ts` - Logging with context
- `src/utils/errors.ts` - Custom error types
- `src/utils/retry.ts` - Retry logic with exponential backoff

### Shared Infrastructure

The `infrastructure/tools/shared/` directory already contains similar utilities:
- `shared/shell.ts` - Shell execution (`execCommand`, `execCommandAsync`)
- `shared/logger.ts` - Global logger singleton with color output
- `shared/error-handler.ts` - CLI error types and handling

### Why Not Consolidate Immediately?

**Decision:** Keep separate utilities for Phase 0, consolidate in Phase 5

**Reasoning:**
1. **Different APIs**:
   - Shared logger is a singleton; kubernetes-deployer uses instance-based loggers with context
   - Shared shell returns `ShellResult`; kubernetes-deployer needs `ExecResult` with different structure
   - kubernetes-deployer shell includes kubectl-specific logic (JSON parsing, dry-run handling)

2. **Kubernetes-Specific Features**:
   - Retry logic with backoff (not in shared)
   - Kubectl command building and parsing
   - Type-safe resource operations
   - State management for deployments

3. **Phase 0 Goal**:
   - Prove the architecture works
   - Get feedback on the API design
   - Keep changes isolated while iterating

4. **Phase 5 Consolidation**:
   - Once we see usage patterns across MinikubeDeployer and AKSDeployer
   - Can create unified utilities that serve all deployers
   - Can refactor shared utilities to support both singleton and instance patterns
   - Minimizes code volume after proving the approach

### Consolidation Plan (Phase 5)

When consolidating in Phase 5:

1. **Enhance shared utilities** to support kubernetes-deployer needs:
   ```typescript
   // Option 1: Extend shared logger to support instances
   export function createLogger(context: string): Logger { ... }

   // Option 2: Adapt kubernetes-deployer to use singleton
   import { logger } from '../../shared/logger.js';
   logger.info('message', 'KubernetesClient'); // context as parameter
   ```

2. **Standardize shell execution**:
   - Align `ShellResult` and `ExecResult` types
   - Move kubectl-specific logic to KubernetesClient
   - Keep shared shell generic

3. **Move retry logic to shared**:
   - `retry()` is useful for all deployers
   - Add to `shared/` as generic utility

4. **Consolidate error types**:
   - Keep base errors in `shared/error-handler.ts`
   - Kubernetes-specific errors stay in deployer

### Benefits of Deferred Consolidation

- **Faster Phase 0 completion** - No need to refactor shared code
- **Clearer requirements** - See what's actually needed across deployers
- **Lower risk** - Don't break terraform-cli or deployment-cli
- **Better design** - Make informed decisions after seeing usage

### Trade-offs

- **Temporary duplication** - ~200 lines of utility code duplicated
- **Larger Phase 0** - More initial code to write
- **Future refactor needed** - Phase 5 consolidation work

The trade-off is acceptable because Phase 0 is about proving the architecture, not optimizing code reuse.
