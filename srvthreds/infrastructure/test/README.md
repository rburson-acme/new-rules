# Infrastructure Testing

Unit tests for SrvThreds infrastructure tooling and Terraform modules.

## Overview

This directory contains tests for:
- **Terraform CLI** wrapper tool
- **Terraform modules** configuration validation
- **Security validation** scripts
- **Configuration management** utilities

## Running Tests

### Run All Infrastructure Tests

From the project root:

```bash
# Run all tests (infrastructure + application)
npm test

# Run only infrastructure tests
npm test infrastructure/test

# Run with coverage
npm run test:coverage -- infrastructure/test
```

From the infrastructure directory:

```bash
# Using vitest configuration
npx vitest run --config infrastructure/test/vitest.config.ts

# Watch mode for development
npx vitest watch --config infrastructure/test/vitest.config.ts

# With coverage
npx vitest run --coverage --config infrastructure/test/vitest.config.ts
```

### Run Specific Test Files

```bash
# Terraform CLI tests only
npm test infrastructure/test/terraform-cli.test.ts

# Terraform modules tests only
npm test infrastructure/test/terraform-modules.test.ts
```

## Test Structure

```
infrastructure/test/
├── vitest.config.ts           # Vitest configuration for infrastructure tests
├── README.md                   # This file
├── terraform-cli.test.ts       # Terraform CLI wrapper tests
└── terraform-modules.test.ts   # Terraform module validation tests
```

## Test Coverage

Tests cover the following areas:

### Terraform CLI Tests

- **Configuration Loading**: Validate deployment configuration structure
- **Stack Dependencies**: Resolve dependency order for deployment
- **Command Execution**: Mock terraform command execution
- **Error Handling**: Handle missing configs, timeouts, failures
- **Backend Configuration**: Generate and validate backend configs
- **Variable Management**: Handle terraform variables and sensitive data

### Terraform Module Tests

- **Naming Conventions**: Azure resource naming (Army NETCOM standard)
- **Variable Validation**: Environment, region, resource requirements
- **Security Configurations**: Enforce security best practices
- **RBAC Configurations**: Validate role assignments and managed identities
- **Tag Management**: Enforce required tags and consistency

## Writing New Tests

### Test File Naming

Follow the convention: `<feature>.test.ts`

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mocking Guidelines

1. **Mock External Dependencies**: Don't call real Azure APIs or Terraform
2. **Use Type-Safe Mocks**: Define interfaces matching actual implementations
3. **Test Behavior, Not Implementation**: Focus on what the code does, not how
4. **Keep Tests Fast**: All infrastructure tests should run in < 1 second

### Example Mock

```typescript
class MockTerraformExecutor {
  async executeCommand(
    command: string,
    args: string[],
    options: ShellOptions
  ): Promise<TerraformCommandResult> {
    // Mock successful terraform command
    if (command === 'terraform' && args[0] === 'version') {
      return {
        success: true,
        stdout: 'Terraform v1.5.0',
        stderr: '',
        exitCode: 0,
      };
    }

    // Default failure
    return {
      success: false,
      stdout: '',
      stderr: 'Unknown command',
      exitCode: 1,
    };
  }
}
```

## Coverage Thresholds

The tests aim for the following coverage:

- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 75%

Coverage reports are generated in `infrastructure/test/coverage/`

## Integration with CI/CD

These tests run automatically:

1. **Pre-commit**: Via lint-staged hook
2. **PR Validation**: GitHub Actions workflow
3. **Pre-deployment**: Before terraform deployments

### CI/CD Configuration

```yaml
# .github/workflows/infrastructure-tests.yml
name: Infrastructure Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test infrastructure/test
```

## Troubleshooting

### Tests Not Found

Ensure you're running from the correct directory:

```bash
# From project root
npm test infrastructure/test

# OR from infrastructure directory
cd infrastructure
npx vitest run --config test/vitest.config.ts
```

### Import Errors

The tests use the same TypeScript configuration as the main project. If you see import errors:

```bash
# Check TypeScript configuration
npx tsc --noEmit --project infrastructure/test
```

### Coverage Not Generated

```bash
# Install coverage provider
npm install -D @vitest/coverage-v8

# Run with coverage
npm test -- --coverage infrastructure/test
```

## Best Practices

1. **Test One Thing**: Each test should validate one specific behavior
2. **Use Descriptive Names**: Test names should explain what's being tested
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Avoid Test Interdependence**: Tests should run in any order
5. **Mock External Dependencies**: Don't rely on external services
6. **Keep Tests Fast**: Aim for < 100ms per test
7. **Update Tests with Code Changes**: Keep tests in sync with implementation

## Related Documentation

- [Terraform CLI README](../tools/terraform-cli/README.md)
- [RBAC Module README](../cloud/terraform/modules/azure/rbac/README.md)
- [Security Validation Script](../cloud/terraform/scripts/validate-security.sh)
- [Main Project Testing Guide](../../src/test/README.md)

## Contributing

When adding new infrastructure tooling:

1. Write tests first (TDD approach)
2. Ensure tests pass before committing
3. Add test coverage for edge cases
4. Update this README if adding new test categories

---

**Last Updated**: 2025-01-11
**Test Framework**: Vitest 2.1.1
**Coverage Tool**: v8
