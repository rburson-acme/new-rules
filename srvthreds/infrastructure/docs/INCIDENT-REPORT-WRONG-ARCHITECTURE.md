# Incident Report: Incorrect Architecture Implementation

**Date:** 2025-11-13
**Severity:** CRITICAL
**Status:** Requires Immediate Correction

---

## Summary

During the AKS deployment session on November 13, 2025, containerized versions of MongoDB, Redis, and RabbitMQ were deployed to the Kubernetes cluster instead of connecting to the provisioned Azure managed services (Cosmos DB, Azure Cache for Redis, Service Bus). This is the **opposite of the intended production architecture**.

---

## What Was Done Wrong

### Deployed (Incorrect):
- MongoDB 7 container in AKS pod with `emptyDir` storage
- Redis 7 container in AKS pod with `emptyDir` storage
- RabbitMQ 3 container in AKS pod with `emptyDir` storage

### Should Have Connected To (Correct):
- **Azure Cosmos DB** (MongoDB API): `cazsrvthredsdecosmos.mongo.cosmos.azure.com`
- **Azure Cache for Redis**: `caz-srvthreds-d-e-redis.redis.cache.windows.net`
- **Azure Service Bus**: `caz-srvthreds-d-e-sbus.servicebus.windows.net`

---

## Why This Is Critical

1. **Performance Issues**: Containerized databases in Kubernetes have known performance problems at scale:
   - I/O contention with other pods
   - Network overhead for persistent volumes
   - No native clustering/replication optimization
   - Resource limits constrained by node sizing

2. **Not Production-Ready**: The current setup is unsuitable for high-traffic production:
   - No automatic failover or geo-replication
   - No managed backups
   - No enterprise SLAs
   - Manual scaling required

3. **Cost Inefficiency**: Paying for unused managed services ($110-260/month) while running inferior containerized versions

4. **Architecture Violation**: Your Terraform infrastructure explicitly provisions managed services with:
   - Zone redundancy
   - Geo-replication
   - Continuous backups
   - Private endpoints
   - Enterprise-grade security

---

## Root Cause Analysis

### What Happened:

**November 13, 2025 - Commit 560e93b: "Adding services deployment"**

The following files were created/deployed with containerized services:

1. `infrastructure/cloud/kubernetes/manifests/base/mongo-repl-1.yaml`
   - Deployed MongoDB container: `mongo:7`
   - Used `emptyDir` for storage (data loss on pod restart)

2. `infrastructure/cloud/kubernetes/manifests/base/redis.yaml`
   - Deployed Redis container: `redis:7-alpine`
   - Used `emptyDir` for storage

3. `infrastructure/cloud/kubernetes/manifests/base/rabbitmq.yaml`
   - Deployed RabbitMQ container: `rabbitmq:3-management-alpine`
   - Used `emptyDir` for storage

4. `infrastructure/cloud/kubernetes/manifests/base/configmap.yaml`
   - **CRITICAL ERROR**: Set connection strings to Kubernetes services instead of Azure managed services:
   ```yaml
   MONGO_HOST: mongodb-service:27017          # WRONG - Should be Cosmos DB
   REDIS_HOST: redis-service:6379             # WRONG - Should be Azure Cache
   RABBITMQ_HOST: rabbitmq-service            # WRONG - Should be Service Bus
   ```

### Why It Happened:

1. **Assumed minikube-style deployment pattern** (containerized everything) instead of cloud-native managed services
2. **Did not review Terraform configuration** to understand provisioned Azure resources
3. **Did not verify connection strings** against Azure managed service endpoints
4. **Copied manifests from local minikube setup** without adapting for cloud

---

## Correct Architecture

### Original Terraform-Provisioned Infrastructure:

```
Azure Cosmos DB (MongoDB API)
├── Account: cazsrvthredsdecosmos
├── Endpoint: cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255
├── Private Endpoint: privatelink.mongo.cosmos.azure.com
├── Features: Zone redundancy, geo-replication, autoscale, continuous backup
└── Cost: ~$50-200/month (provisioned throughput)

Azure Cache for Redis
├── Name: caz-srvthreds-d-e-redis
├── Endpoint: caz-srvthreds-d-e-redis.redis.cache.windows.net:6380
├── Features: Clustering, persistence, zone redundancy, TLS
└── Cost: ~$50/month (Standard tier)

Azure Service Bus
├── Namespace: caz-srvthreds-d-e-sbus
├── Endpoint: caz-srvthreds-d-e-sbus.servicebus.windows.net
├── Features: Premium tier, zone redundancy, private endpoint
└── Cost: ~$10-30/month
```

### Required Connection Configuration:

**ConfigMap should contain:**
```yaml
# Azure Cosmos DB (MongoDB API)
MONGO_HOST: cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255
MONGO_CONNECTION_STRING: mongodb://cazsrvthredsdecosmos:<PRIMARY_KEY>@cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000
MONGO_SSL: "true"
MONGO_SSL_VALIDATE: "true"

# Azure Cache for Redis
REDIS_HOST: caz-srvthreds-d-e-redis.redis.cache.windows.net
REDIS_PORT: "6380"
REDIS_TLS_ENABLED: "true"
REDIS_PASSWORD: <REDIS_PRIMARY_KEY>

# Azure Service Bus (replaces RabbitMQ)
SERVICEBUS_CONNECTION_STRING: Endpoint=sb://caz-srvthreds-d-e-sbus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<KEY>
```

---

## Impact Assessment

### Current State (Incorrect):
- ❌ Applications connecting to containerized databases in AKS
- ❌ Data stored in `emptyDir` (ephemeral, data loss on restart)
- ❌ No high availability or failover
- ❌ No managed backups
- ❌ Poor performance under load
- ❌ Azure managed services sitting idle ($110-260/month wasted)

### Required State (Correct):
- ✅ Applications connecting to Azure managed services
- ✅ Data persisted in Cosmos DB with geo-replication
- ✅ Automatic failover and zone redundancy
- ✅ Continuous backups with point-in-time restore
- ✅ Enterprise-grade performance and scaling
- ✅ Utilizing provisioned infrastructure properly

---

## Rollback Plan

### Step 1: Retrieve Azure Managed Service Connection Strings

**DO NOT EXECUTE - DOCUMENTATION ONLY**

```bash
# Get Cosmos DB connection string
az cosmosdb keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos \
  --type connection-strings \
  --query "connectionStrings[?description=='Primary MongoDB Connection String'].connectionString" \
  -o tsv

# Get Redis access key
az redis list-keys \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-redis \
  --query primaryKey -o tsv

# Get Service Bus connection string
az servicebus namespace authorization-rule keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --namespace-name caz-srvthreds-d-e-sbus \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

### Step 2: Store Secrets in Azure Key Vault

**DO NOT EXECUTE - DOCUMENTATION ONLY**

```bash
# Store Cosmos DB connection string
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name cosmos-connection-string \
  --value "<COSMOS_CONNECTION_STRING>"

# Store Redis access key
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name redis-access-key \
  --value "<REDIS_PRIMARY_KEY>"

# Store Service Bus connection string
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name servicebus-connection-string \
  --value "<SERVICEBUS_CONNECTION_STRING>"
```

### Step 3: Update ConfigMap

**Create new ConfigMap:**
```yaml
# infrastructure/cloud/kubernetes/manifests/base/configmap-managed-services.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds
data:
  # Azure Cosmos DB (MongoDB API)
  MONGO_HOST: cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255
  MONGO_SSL: "true"
  MONGO_DIRECT_CONNECTION: "false"
  MONGO_REPLICA_SET: "globaldb"

  # Azure Cache for Redis
  REDIS_HOST: caz-srvthreds-d-e-redis.redis.cache.windows.net
  REDIS_PORT: "6380"
  REDIS_TLS_ENABLED: "true"

  # JWT settings (unchanged)
  JWT_EXPIRE_TIME: 1h
  REFRESH_TOKEN_EXPIRE_TIME: 7d
```

### Step 4: Create Kubernetes Secrets from Key Vault

**DO NOT EXECUTE - DOCUMENTATION ONLY**

Option A: Manual secret creation (temporary):
```bash
kubectl create secret generic azure-managed-services \
  --namespace srvthreds \
  --from-literal=mongo-connection-string="<FROM_KEY_VAULT>" \
  --from-literal=redis-access-key="<FROM_KEY_VAULT>" \
  --from-literal=servicebus-connection-string="<FROM_KEY_VAULT>"
```

Option B: CSI Driver (recommended):
```yaml
# Use Azure Key Vault CSI driver to mount secrets
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-srvthreds-secrets
  namespace: srvthreds
spec:
  provider: azure
  parameters:
    keyvaultName: CAZ-SRVTHREDS-D-E-KEY
    objects: |
      array:
        - objectName: cosmos-connection-string
          objectType: secret
        - objectName: redis-access-key
          objectType: secret
        - objectName: servicebus-connection-string
          objectType: secret
```

### Step 5: Update Application Deployments

**Modify deployment YAMLs to reference secrets:**
```yaml
# Example for srvthreds-engine
env:
- name: MONGO_CONNECTION_STRING
  valueFrom:
    secretKeyRef:
      name: azure-managed-services
      key: mongo-connection-string
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: azure-managed-services
      key: redis-access-key
```

### Step 6: Remove Containerized Database Deployments

**DO NOT EXECUTE - DOCUMENTATION ONLY**

```bash
# Delete containerized database pods
kubectl delete deployment mongo-repl-1 -n srvthreds
kubectl delete deployment redis -n srvthreds
kubectl delete deployment rabbitmq -n srvthreds

# Keep services if needed for DNS compatibility, but they'll have no endpoints
# Or delete them too:
kubectl delete service mongodb-service -n srvthreds
kubectl delete service redis-service -n srvthreds
kubectl delete service rabbitmq-service -n srvthreds
```

### Step 7: Update Application Code for Service Bus

**Note:** RabbitMQ → Service Bus requires code changes in application:
- Replace `amqp` library with `@azure/service-bus`
- Update message publishing/consuming logic
- Adapt queue/topic patterns

**Files requiring changes:**
- `src/ts/thredlib/io/EventManager.ts`
- Agent configuration files
- Rascal config → Service Bus config

---

## Code Changes Required

### 1. Application Connection Logic

**Before (Kubernetes Services):**
```typescript
const mongoUrl = `mongodb://${process.env.MONGO_HOST}`;
const redis = createClient({ url: `redis://${process.env.REDIS_HOST}` });
```

**After (Azure Managed Services):**
```typescript
// Cosmos DB
const mongoUrl = process.env.MONGO_CONNECTION_STRING;
const mongoOptions = {
  ssl: true,
  replicaSet: 'globaldb',
  retryWrites: false,
  maxIdleTimeMS: 120000
};

// Azure Cache for Redis
const redis = createClient({
  url: `rediss://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
  tls: { rejectUnauthorized: true }
});
```

### 2. RabbitMQ → Service Bus Migration

**Replace:**
```typescript
import * as amqp from 'amqplib';
// RabbitMQ connection logic
```

**With:**
```typescript
import { ServiceBusClient } from '@azure/service-bus';

const serviceBusClient = new ServiceBusClient(
  process.env.SERVICEBUS_CONNECTION_STRING
);
```

---

## Files That Need Correction

### Kubernetes Manifests (Incorrect - Need Deletion/Update):
1. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/cloud/kubernetes/manifests/base/mongo-repl-1.yaml` - DELETE
2. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/cloud/kubernetes/manifests/base/mongo.yaml` - DELETE
3. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/cloud/kubernetes/manifests/base/redis.yaml` - DELETE
4. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/cloud/kubernetes/manifests/base/rabbitmq.yaml` - DELETE
5. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/cloud/kubernetes/manifests/base/configmap.yaml` - REPLACE with managed service config

### Application Code (Needs Updates):
1. Connection string handling for Cosmos DB SSL/TLS
2. Redis TLS configuration
3. RabbitMQ → Service Bus adapter layer

### Documentation (Needs Correction):
1. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/docs/AZURE-RESOURCES-AND-CLIENT-HOSTING.md` - Remove incorrect deletion recommendations
2. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/docs/ARCHITECTURAL-DECISIONS.md` - Remove ADR-002 about self-hosted databases
3. `/Users/aresha/Repos/new-rules/srvthreds/infrastructure/docs/PRODUCTION-READINESS-PLAN.md` - Remove persistent storage phases

---

## Correct Architecture Diagram

```
Internet
    ↓ HTTPS
Azure Application Gateway (WAF)
    ↓
Azure Load Balancer
    ↓
AKS Cluster (Application Tier Only)
    ├── Session Agent (stateless)
    ├── Engine (stateless)
    └── Persistence Agent (stateless)

Data Tier (Azure Managed Services via Private Endpoints)
    ├── Azure Cosmos DB (MongoDB API)
    │   └── Geo-replicated, zone-redundant
    ├── Azure Cache for Redis
    │   └── Clustered, persistent, TLS
    └── Azure Service Bus
        └── Premium tier, message persistence
```

**Key Principle:** Compute in AKS, Data in Managed Services

---

## Lessons Learned

1. **Always review Terraform/IaC** before implementing Kubernetes manifests
2. **Verify connection strings** match provisioned Azure resources
3. **Do not assume local development patterns** apply to cloud environments
4. **Ask clarifying questions** when architecture seems duplicated
5. **Containerized databases are NOT production-ready** for high-traffic systems

---

## Required Actions

### Immediate (User Decision Required):
1. **Approve connection string retrieval** from Azure managed services
2. **Review and approve rollback plan** steps
3. **Decide on Service Bus migration timeline** (requires code changes)

### Implementation (After Approval):
1. Retrieve and store connection strings in Key Vault
2. Update ConfigMap with managed service endpoints
3. Update application deployments to use secrets
4. Test connection to Cosmos DB, Redis, Service Bus
5. Delete containerized database deployments
6. Update application code for Service Bus (if replacing RabbitMQ)

### Documentation:
1. Correct all incorrect documentation created
2. Document proper managed service architecture
3. Create migration guide for other environments

---

## Status

**Current:** Applications running against containerized databases (INCORRECT)
**Target:** Applications connecting to Azure managed services (CORRECT)
**Blocker:** Requires user approval and connection string retrieval

**Next Step:** User to review this incident report and approve rollback plan execution.
