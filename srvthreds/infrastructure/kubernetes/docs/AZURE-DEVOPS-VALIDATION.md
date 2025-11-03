# Azure DevOps - Minikube Validation Integration

This document outlines how to integrate the Minikube validation process into Azure DevOps pipelines.

## Overview

The `validate-minikube.sh` script validates a Minikube deployment by:
1. Verifying all pods are running
2. Establishing connectivity to host databases (MongoDB, Redis, RabbitMQ)
3. Running `npm run bootstrap` to initialize test data
4. Executing `npm test` against the live cluster
5. Reporting success/failure with debugging information

## Azure DevOps Pipeline Integration

### Prerequisites

Your Azure DevOps pipeline needs:
- Node.js installed (v18+)
- kubectl installed
- Minikube installed (or another Kubernetes cluster)
- Docker available
- npm dependencies installed (`npm ci`)

### Pipeline YAML Structure

```yaml
# azure-pipelines.yml

trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  NODE_VERSION: '18.x'

stages:
  - stage: Setup
    displayName: 'Setup Minikube Environment'
    jobs:
      - job: SetupCluster
        displayName: 'Initialize Minikube Cluster'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'
            workingDirectory: $(Build.SourcesDirectory)

          - script: |
              # Install kubectl
              curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              chmod +x kubectl
              sudo mv kubectl /usr/local/bin/
            displayName: 'Install kubectl'

          - script: |
              # Install Minikube
              curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
              sudo install minikube-linux-amd64 /usr/local/bin/minikube
            displayName: 'Install Minikube'

          - script: |
              # Run Minikube setup
              bash infrastructure/kubernetes/scripts/setup-minikube.sh
            displayName: 'Setup Minikube cluster'
            timeoutInMinutes: 15

  - stage: Validate
    displayName: 'Validate Environment'
    dependsOn: Setup
    jobs:
      - job: RunTests
        displayName: 'Run Integration Tests'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'
            workingDirectory: $(Build.SourcesDirectory)

          - script: |
              # Run validation script
              bash infrastructure/kubernetes/scripts/validate-minikube.sh
            displayName: 'Validate Minikube environment'
            timeoutInMinutes: 10
            continueOnError: false

          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'
              failTaskOnFailedTests: true
              testRunTitle: 'Minikube Integration Tests'
            displayName: 'Publish test results'

          - script: |
              # Collect debugging information on failure
              kubectl get pods -n srvthreds -o wide
              kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine --tail=100
            displayName: 'Collect debug logs'
            condition: failed()
```

### Single-Stage Approach (Simpler)

If you want a simpler single-stage pipeline:

```yaml
# azure-pipelines-simple.yml

trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install npm dependencies'

  - script: |
      curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
      chmod +x kubectl && sudo mv kubectl /usr/local/bin/
    displayName: 'Install kubectl'

  - script: |
      curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
      sudo install minikube-linux-amd64 /usr/local/bin/minikube
    displayName: 'Install Minikube'

  - script: bash infrastructure/kubernetes/scripts/setup-minikube.sh
    displayName: 'Setup Minikube cluster'
    timeoutInMinutes: 15

  - script: bash infrastructure/kubernetes/scripts/validate-minikube.sh
    displayName: 'Validate with integration tests'
    timeoutInMinutes: 10

  - task: PublishTestResults@2
    condition: succeededOrFailed()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results.xml'
    displayName: 'Publish test results'
```

## Local Development Usage

Developers can run the same validation locally:

```bash
# Full setup and validation
./infrastructure/kubernetes/scripts/setup-minikube.sh
./infrastructure/kubernetes/scripts/validate-minikube.sh

# Or just validation if cluster is already running
./infrastructure/kubernetes/scripts/validate-minikube.sh
```

## How the Validation Script Works

### 1. **Context Verification**
Ensures kubectl is pointing to the correct Minikube cluster.

### 2. **Pod Readiness Checks**
Waits for all SrvThreds deployments to be ready:
- `srvthreds-engine`
- `srvthreds-session-agent`
- `srvthreds-persistence-agent`

### 3. **Database Connectivity**
Verifies connectivity to host databases (MongoDB, Redis, RabbitMQ).
These run on host Docker, not inside Minikube.

### 4. **Bootstrap Test Data**
Runs `npm run bootstrap -- --profile test` which:
- Clears existing database
- Loads test patterns from `run-profiles/test/patterns/`
- Loads config files from `run-profiles/test/run-config/`
- Runs custom Handler setup (if exists)

### 5. **Integration Tests**
Executes `npm test` with environment configured to connect to:
- MongoDB at `localhost:27017`
- Redis at `localhost:6379`
- RabbitMQ at `localhost:5672`

### 6. **Cleanup**
Automatic cleanup on exit (success or failure):
- Stops all port-forwards
- Releases ports

## Environment Variables

The script sets these automatically:

| Variable | Value | Purpose |
|----------|-------|---------|
| `MONGO_HOST` | `localhost:27017` | MongoDB connection |
| `MONGO_DIRECT_CONNECTION` | `true` | Single-node replica set mode |
| `REDIS_HOST` | `localhost:6379` | Redis connection |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ host |
| `RABBITMQ_PORT` | `5672` | RabbitMQ port |

## Troubleshooting

### Tests Fail with Connection Errors

**Problem**: Tests can't connect to databases.

**Solution**: Ensure host databases are running:
```bash
npm run deploymentCli -- minikube s_a_dbs
```

### Port Already in Use

**Problem**: Port-forward fails because port is already bound.

**Solution**: The script handles this gracefully. If ports are already accessible, it continues.

### Pods Not Ready

**Problem**: Pods fail readiness checks.

**Solution**: Check pod logs:
```bash
kubectl get pods -n srvthreds
kubectl logs -n srvthreds <pod-name>
```

### Bootstrap Fails

**Problem**: `npm run bootstrap` returns errors.

**Solution**: Check that test profile exists at `run-profiles/test/`.

## Azure DevOps Specific Considerations

### Build Agents
- Use `ubuntu-latest` for best Minikube support
- Requires nested virtualization for Docker driver

### Timeouts
- Setup: 15 minutes (includes building images)
- Validation: 10 minutes (tests should complete in 5-7 minutes)

### Artifacts
Consider publishing these artifacts on failure:
- Pod descriptions: `kubectl describe pods -n srvthreds`
- Engine logs: `kubectl logs -l app.kubernetes.io/name=srvthreds-engine -n srvthreds`
- Test output files

### Caching
Cache these to speed up builds:
- `node_modules/` (npm dependencies)
- Docker layer cache (if using docker build cache task)

## Next Steps

1. **Add Test Reporting**: Configure Vitest to output JUnit XML for Azure DevOps test reporting
2. **Parallel Testing**: Consider splitting tests into parallel jobs if test suite grows
3. **Environment Promotion**: Use this validation as a gate before promoting to higher environments
4. **Performance Baseline**: Track test execution time to detect performance regressions

## Related Documentation

- [setup-minikube.sh](../scripts/setup-minikube.sh) - Initial cluster setup
- [test.config.json](../../deployment/configs/agents/test.config.json) - Test execution configuration
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment documentation
