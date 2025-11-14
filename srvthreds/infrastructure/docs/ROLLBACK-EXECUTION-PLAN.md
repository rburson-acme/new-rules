# Rollback Execution Plan: Restore Azure Managed Services

**Created:** 2025-01-14
**Purpose:** Step-by-step commands to rollback from containerized databases to Azure managed services
**Executor:** User (manual execution required)

---

## Overview

This plan will:
1. Retrieve connection strings from Azure managed services
2. Store them securely in Azure Key Vault
3. Update Kubernetes configuration to use managed services
4. Remove containerized database deployments
5. Restart application pods to pick up new configuration

**Estimated Time:** 30-45 minutes
**Downtime:** 2-5 minutes during pod restart

---

## Prerequisites

- Azure CLI authenticated: `az login`
- kubectl configured with AKS context
- Access to CAZ-SRVTHREDS-D-E-RG resource group
- Permissions to read Key Vault and manage AKS

---

## Phase 1: Retrieve Azure Managed Service Connection Information

### Step 1.1: Get Cosmos DB Connection String

```bash
# Retrieve Cosmos DB MongoDB connection string
az cosmosdb keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos \
  --type connection-strings \
  --query "connectionStrings[?description=='Primary MongoDB Connection String'].connectionString" \
  -o tsv
```

**Expected Output:**
```
mongodb://cazsrvthredsdecosmos:<PRIMARY_KEY>@cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@cazsrvthredsdecosmos@
```

**Action:** Copy this connection string to a secure temporary location (e.g., password manager)

---

### Step 1.2: Get Cosmos DB Primary Key (Alternative)

```bash
# If you need just the primary key instead of full connection string
az cosmosdb keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos \
  --type keys \
  --query primaryMasterKey \
  -o tsv
```

**Expected Output:**
```
<LONG_BASE64_KEY>
```

**Action:** Copy this key to secure temporary location

---

### Step 1.3: Get Redis Access Key

```bash
# Retrieve Redis primary access key
az redis list-keys \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-redis \
  --query primaryKey \
  -o tsv
```

**Expected Output:**
```
<REDIS_PRIMARY_KEY>
```

**Action:** Copy this key to secure temporary location

---

### Step 1.4: Get Redis Hostname and Port

```bash
# Get Redis connection details
az redis show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-redis \
  --query '{hostName: hostName, sslPort: sslPort, enableNonSslPort: enableNonSslPort}' \
  -o json
```

**Expected Output:**
```json
{
  "enableNonSslPort": false,
  "hostName": "caz-srvthreds-d-e-redis.redis.cache.windows.net",
  "sslPort": 6380
}
```

**Action:** Note the hostName and sslPort values

---

### Step 1.5: Get Service Bus Connection String

```bash
# Retrieve Service Bus connection string
az servicebus namespace authorization-rule keys list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --namespace-name caz-srvthreds-d-e-sbus \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString \
  -o tsv
```

**Expected Output:**
```
Endpoint=sb://caz-srvthreds-d-e-sbus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<KEY>
```

**Action:** Copy this connection string to secure temporary location

---

## Phase 2: Store Secrets in Azure Key Vault

### Step 2.1: Verify Key Vault Access

```bash
# Verify you have access to Key Vault
az keyvault show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-KEY \
  --query '{name: name, vaultUri: properties.vaultUri}' \
  -o json
```

**Expected Output:**
```json
{
  "name": "CAZ-SRVTHREDS-D-E-KEY",
  "vaultUri": "https://caz-srvthreds-d-e-key.vault.azure.net/"
}
```

---

### Step 2.2: Store Cosmos DB Connection String in Key Vault

```bash
# Store Cosmos DB connection string
# Replace <COSMOS_CONNECTION_STRING> with the value from Step 1.1
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name cosmos-mongodb-connection-string \
  --value "<COSMOS_CONNECTION_STRING>"
```

**Expected Output:**
```json
{
  "attributes": {
    "enabled": true,
    ...
  },
  "id": "https://caz-srvthreds-d-e-key.vault.azure.net/secrets/cosmos-mongodb-connection-string/...",
  "name": "cosmos-mongodb-connection-string"
}
```

---

### Step 2.3: Store Redis Access Key in Key Vault

```bash
# Store Redis access key
# Replace <REDIS_PRIMARY_KEY> with the value from Step 1.3
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name redis-access-key \
  --value "<REDIS_PRIMARY_KEY>"
```

---

### Step 2.4: Store Service Bus Connection String in Key Vault

```bash
# Store Service Bus connection string
# Replace <SERVICEBUS_CONNECTION_STRING> with the value from Step 1.5
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name servicebus-connection-string \
  --value "<SERVICEBUS_CONNECTION_STRING>"
```

---

### Step 2.5: Verify Secrets Stored

```bash
# List all secrets in Key Vault
az keyvault secret list \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --query "[?contains(name, 'cosmos') || contains(name, 'redis') || contains(name, 'servicebus')].name" \
  -o table
```

**Expected Output:**
```
Result
--------------------------------
cosmos-mongodb-connection-string
redis-access-key
servicebus-connection-string
```

---

## Phase 3: Create Kubernetes Secret from Key Vault Values

### Step 3.1: Retrieve Secrets from Key Vault for Kubernetes

```bash
# Get Cosmos DB connection string
COSMOS_CONN=$(az keyvault secret show \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name cosmos-mongodb-connection-string \
  --query value -o tsv)

# Get Redis access key
REDIS_KEY=$(az keyvault secret show \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name redis-access-key \
  --query value -o tsv)

# Get Service Bus connection string
SERVICEBUS_CONN=$(az keyvault secret show \
  --vault-name CAZ-SRVTHREDS-D-E-KEY \
  --name servicebus-connection-string \
  --query value -o tsv)

# Verify variables are set
echo "Cosmos DB: ${COSMOS_CONN:0:50}..."
echo "Redis Key: ${REDIS_KEY:0:20}..."
echo "Service Bus: ${SERVICEBUS_CONN:0:50}..."
```

---

### Step 3.2: Create Kubernetes Secret

```bash
# Create secret in srvthreds namespace
kubectl create secret generic azure-managed-services \
  --namespace srvthreds \
  --from-literal=mongo-connection-string="$COSMOS_CONN" \
  --from-literal=redis-password="$REDIS_KEY" \
  --from-literal=servicebus-connection-string="$SERVICEBUS_CONN" \
  --context CAZ-SRVTHREDS-D-E-AKS
```

**Expected Output:**
```
secret/azure-managed-services created
```

---

### Step 3.3: Verify Secret Created

```bash
# Verify secret exists
kubectl get secret azure-managed-services -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Check secret has correct keys (values will be base64 encoded)
kubectl get secret azure-managed-services -n srvthreds -o json --context CAZ-SRVTHREDS-D-E-AKS | jq -r '.data | keys'
```

**Expected Output:**
```
[
  "mongo-connection-string",
  "redis-password",
  "servicebus-connection-string"
]
```

---

## Phase 4: Update ConfigMap for Managed Services

### Step 4.1: Backup Current ConfigMap

```bash
# Save current configmap to file for rollback if needed
kubectl get configmap srvthreds-config -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS -o yaml > /tmp/configmap-backup-$(date +%Y%m%d-%H%M%S).yaml

# Verify backup
ls -lh /tmp/configmap-backup-*.yaml
```

---

### Step 4.2: Create New ConfigMap File

Create file: `infrastructure/cloud/kubernetes/manifests/base/configmap-managed-services.yaml`

```yaml
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
  MONGO_RETRY_WRITES: "false"
  MONGO_MAX_IDLE_TIME_MS: "120000"

  # Azure Cache for Redis
  REDIS_HOST: caz-srvthreds-d-e-redis.redis.cache.windows.net
  REDIS_PORT: "6380"
  REDIS_TLS_ENABLED: "true"

  # JWT settings (unchanged)
  JWT_EXPIRE_TIME: 1h
  REFRESH_TOKEN_EXPIRE_TIME: 7d
```

**Action:** Create this file in your repository

---

### Step 4.3: Apply New ConfigMap

```bash
# Apply the new ConfigMap
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/configmap-managed-services.yaml --context CAZ-SRVTHREDS-D-E-AKS
```

**Expected Output:**
```
configmap/srvthreds-config configured
```

---

### Step 4.4: Verify ConfigMap Updated

```bash
# Verify ConfigMap has correct values
kubectl get configmap srvthreds-config -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS -o yaml | grep -A 15 "^data:"
```

**Expected Output:**
```yaml
data:
  JWT_EXPIRE_TIME: 1h
  MONGO_DIRECT_CONNECTION: "false"
  MONGO_HOST: cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255
  MONGO_MAX_IDLE_TIME_MS: "120000"
  MONGO_REPLICA_SET: "globaldb"
  MONGO_RETRY_WRITES: "false"
  MONGO_SSL: "true"
  REDIS_HOST: caz-srvthreds-d-e-redis.redis.cache.windows.net
  REDIS_PORT: "6380"
  REDIS_TLS_ENABLED: "true"
  REFRESH_TOKEN_EXPIRE_TIME: 7d
```

---

## Phase 5: Update Application Deployments to Use Secrets

### Step 5.1: Update Engine Deployment

Edit file: `infrastructure/cloud/kubernetes/manifests/base/srvthreds-engine.yaml`

Find the `env:` section and add:

```yaml
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
      key: redis-password
# Keep existing envFrom for ConfigMap
envFrom:
- configMapRef:
    name: srvthreds-config
```

**Action:** Edit the file, save it

---

### Step 5.2: Update Session Agent Deployment

Edit file: `infrastructure/cloud/kubernetes/manifests/base/srvthreds-session-agent.yaml`

Add the same `env:` entries as Step 5.1:

```yaml
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
      key: redis-password
envFrom:
- configMapRef:
    name: srvthreds-config
```

**Action:** Edit the file, save it

---

### Step 5.3: Update Persistence Agent Deployment

Edit file: `infrastructure/cloud/kubernetes/manifests/base/srvthreds-persistence-agent.yaml`

Add the same `env:` entries:

```yaml
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
      key: redis-password
envFrom:
- configMapRef:
    name: srvthreds-config
```

**Action:** Edit the file, save it

---

### Step 5.4: Apply Updated Deployments

```bash
# Apply all deployment updates
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/srvthreds-engine.yaml --context CAZ-SRVTHREDS-D-E-AKS
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/srvthreds-session-agent.yaml --context CAZ-SRVTHREDS-D-E-AKS
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/srvthreds-persistence-agent.yaml --context CAZ-SRVTHREDS-D-E-AKS
```

**Expected Output:**
```
deployment.apps/srvthreds-engine configured
deployment.apps/srvthreds-session-agent configured
deployment.apps/srvthreds-persistence-agent configured
```

---

## Phase 6: Restart Application Pods

### Step 6.1: Restart Application Deployments

```bash
# Restart Engine
kubectl rollout restart deployment srvthreds-engine -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Restart Session Agent
kubectl rollout restart deployment srvthreds-session-agent -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Restart Persistence Agent
kubectl rollout restart deployment srvthreds-persistence-agent -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
```

**Expected Output:**
```
deployment.apps/srvthreds-engine restarted
deployment.apps/srvthreds-session-agent restarted
deployment.apps/srvthreds-persistence-agent restarted
```

---

### Step 6.2: Monitor Pod Startup

```bash
# Watch pods restart
kubectl get pods -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS -w
```

**Wait for all pods to show `Running` and `1/1` ready**

Press `Ctrl+C` to exit watch mode

---

### Step 6.3: Check Pod Logs for Cosmos DB Connection

```bash
# Check Engine logs for Cosmos DB connection
kubectl logs -n srvthreds deployment/srvthreds-engine --tail=50 --context CAZ-SRVTHREDS-D-E-AKS | grep -i "mongo\|cosmos\|connection"

# Check Session Agent logs
kubectl logs -n srvthreds deployment/srvthreds-session-agent --tail=50 --context CAZ-SRVTHREDS-D-E-AKS | grep -i "mongo\|cosmos\|redis"

# Check Persistence Agent logs
kubectl logs -n srvthreds deployment/srvthreds-persistence-agent --tail=50 --context CAZ-SRVTHREDS-D-E-AKS | grep -i "mongo\|cosmos"
```

**Look for:**
- ✅ Successful connection messages to Cosmos DB
- ✅ Successful connection to Redis
- ❌ No connection errors or timeouts

---

## Phase 7: Verify Managed Service Connections

### Step 7.1: Check Cosmos DB Connections

```bash
# Check active connections to Cosmos DB
az cosmosdb show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos \
  --query '{name: name, provisioningState: provisioningState}' \
  -o json
```

---

### Step 7.2: Check Redis Connections

```bash
# Get Redis metrics (requires metrics to be enabled)
az monitor metrics list \
  --resource /subscriptions/$(az account show --query id -o tsv)/resourceGroups/CAZ-SRVTHREDS-D-E-RG/providers/Microsoft.Cache/Redis/caz-srvthreds-d-e-redis \
  --metric connectedclients \
  --interval PT1M \
  --query 'value[0].timeseries[0].data[-1].average' \
  -o tsv
```

**Expected Output:** Should show > 0 connected clients

---

### Step 7.3: Test Application Functionality

```bash
# If you have port-forwarding set up, test the application
kubectl port-forward -n srvthreds deployment/srvthreds-session-agent 3000:3000 --context CAZ-SRVTHREDS-D-E-AKS
```

**In another terminal, test the endpoint:**
```bash
curl http://localhost:3000/health
```

**Expected:** Application responds (verifying it can connect to Cosmos DB/Redis)

---

## Phase 8: Remove Containerized Database Deployments

### Step 8.1: Scale Down Containerized Databases

```bash
# Scale down MongoDB replica
kubectl scale deployment mongo-repl-1 --replicas=0 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Scale down Redis
kubectl scale deployment redis --replicas=0 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Scale down RabbitMQ
kubectl scale deployment rabbitmq --replicas=0 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
```

**Expected Output:**
```
deployment.apps/mongo-repl-1 scaled
deployment.apps/redis scaled
deployment.apps/rabbitmq scaled
```

---

### Step 8.2: Verify Applications Still Running

```bash
# Check application pods are still healthy
kubectl get pods -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS | grep srvthreds-
```

**Expected:** All srvthreds application pods should still be `Running`

---

### Step 8.3: Monitor Application Logs

```bash
# Watch for any errors after scaling down containerized databases
kubectl logs -n srvthreds deployment/srvthreds-engine --tail=20 --context CAZ-SRVTHREDS-D-E-AKS
```

**Look for:** No connection errors (confirms apps using Cosmos DB/Redis)

---

### Step 8.4: Delete Containerized Database Deployments (Optional)

**WARNING:** Only do this after confirming applications work with managed services for 24-48 hours

```bash
# Delete MongoDB deployment
kubectl delete deployment mongo-repl-1 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl delete deployment mongo -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Delete Redis deployment
kubectl delete deployment redis -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Delete RabbitMQ deployment
kubectl delete deployment rabbitmq -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# Delete services (optional - can keep for DNS compatibility)
kubectl delete service mongodb-service -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl delete service redis-service -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl delete service rabbitmq-service -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
```

---

## Phase 9: Update Source Files

### Step 9.1: Remove Containerized Database Manifests

```bash
# Remove from version control (or move to archive)
git rm infrastructure/cloud/kubernetes/manifests/base/mongo-repl-1.yaml
git rm infrastructure/cloud/kubernetes/manifests/base/mongo.yaml
git rm infrastructure/cloud/kubernetes/manifests/base/redis.yaml
git rm infrastructure/cloud/kubernetes/manifests/base/rabbitmq.yaml

# Rename old configmap
git mv infrastructure/cloud/kubernetes/manifests/base/configmap.yaml infrastructure/cloud/kubernetes/manifests/base/configmap-OLD-CONTAINERIZED.yaml

# BAD STEPS -------------------------------
# Add new configmap
git add infrastructure/cloud/kubernetes/manifests/base/configmap-managed-services.yaml

# Add updated deployment files
git add infrastructure/cloud/kubernetes/manifests/base/srvthreds-engine.yaml
git add infrastructure/cloud/kubernetes/manifests/base/srvthreds-session-agent.yaml
git add infrastructure/cloud/kubernetes/manifests/base/srvthreds-persistence-agent.yaml
```
# BAD STEPS -------------------------------
---

### Step 9.2: Update Kustomization File

Edit: `infrastructure/cloud/kubernetes/manifests/base/kustomization.yaml`

**Remove:**
```yaml
resources:
  - mongo-repl-1.yaml
  - mongo.yaml
  - redis.yaml
  - rabbitmq.yaml
  - configmap.yaml
```

**Update to:**
```yaml
resources:
  - configmap-managed-services.yaml
  - srvthreds-engine.yaml
  - srvthreds-session-agent.yaml
  - srvthreds-persistence-agent.yaml
  - srvthreds-bootstrap-job.yaml
  - namespace.yaml
```

**Action:** Save the file

---

### Step 9.3: Commit Changes

```bash
# Commit the rollback
git commit -m "fix: Rollback to Azure managed services (Cosmos DB, Redis, Service Bus)

- Remove containerized MongoDB, Redis, RabbitMQ deployments
- Update ConfigMap to use Azure managed service endpoints
- Update application deployments to reference Azure Key Vault secrets
- Applications now connect to:
  - Azure Cosmos DB (MongoDB API)
  - Azure Cache for Redis
  - Azure Service Bus (future migration from RabbitMQ)

This corrects the incorrect architecture deployed in commit 560e93b
which used containerized databases unsuitable for production scale."
```

---

## Phase 10: Verification Checklist

### Step 10.1: Run Complete Verification

```bash
# 1. Check all application pods are running
kubectl get pods -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# 2. Check no containerized database pods exist
kubectl get pods -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS | grep -E "mongo|redis|rabbitmq"

# 3. Verify ConfigMap has managed service endpoints
kubectl get configmap srvthreds-config -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS -o yaml | grep MONGO_HOST

# 4. Verify Secret exists
kubectl get secret azure-managed-services -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# 5. Check application logs for errors
kubectl logs -n srvthreds deployment/srvthreds-engine --tail=100 --context CAZ-SRVTHREDS-D-E-AKS | grep -i error
kubectl logs -n srvthreds deployment/srvthreds-session-agent --tail=100 --context CAZ-SRVTHREDS-D-E-AKS | grep -i error
kubectl logs -n srvthreds deployment/srvthreds-persistence-agent --tail=100 --context CAZ-SRVTHREDS-D-E-AKS | grep -i error
```

---

### Step 10.2: Final Validation Checklist

**Mark each item when verified:**

- [ ] Cosmos DB connection string stored in Key Vault
- [ ] Redis access key stored in Key Vault
- [ ] Service Bus connection string stored in Key Vault
- [ ] Kubernetes secret `azure-managed-services` created
- [ ] ConfigMap updated with managed service endpoints
- [ ] All application deployments updated to reference secrets
- [ ] All application pods restarted successfully
- [ ] Application pods showing `Running` status
- [ ] Application logs show no connection errors
- [ ] Containerized database deployments scaled to 0 replicas
- [ ] Applications still functional with managed services
- [ ] Source files updated and committed to git
- [ ] Kustomization file updated

---

## Troubleshooting

### Issue: Pods Fail to Start After Restart

**Symptoms:**
```
kubectl get pods -n srvthreds
NAME                                    READY   STATUS             RESTARTS
srvthreds-engine-xxx                    0/1     CrashLoopBackOff   3
```

**Check logs:**
```bash
kubectl logs -n srvthreds deployment/srvthreds-engine --context CAZ-SRVTHREDS-D-E-AKS
```

**Common causes:**
1. **Connection string format issue** - Verify Cosmos DB connection string has all required parameters
2. **Redis TLS issue** - Ensure `REDIS_TLS_ENABLED: "true"` in ConfigMap
3. **Secret not mounted** - Verify secret exists: `kubectl get secret azure-managed-services -n srvthreds`

---

### Issue: "MongoNetworkError" in Logs

**Symptoms:**
```
MongoNetworkError: failed to connect to server [cazsrvthredsdecosmos.mongo.cosmos.azure.com:10255]
```

**Causes:**
1. **Private endpoint issue** - Cosmos DB might only be accessible via private endpoint
2. **Firewall rules** - Cosmos DB firewall may be blocking AKS

**Fix:**
```bash
# Add AKS outbound IP to Cosmos DB firewall
az cosmosdb update \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos \
  --enable-public-network true
```

OR configure private endpoint access properly

---

### Issue: "RedisConnectionError" in Logs

**Symptoms:**
```
Error: connect ETIMEDOUT caz-srvthreds-d-e-redis.redis.cache.windows.net:6380
```

**Causes:**
1. **Non-SSL port disabled** - Redis has `enableNonSslPort: false`
2. **Password missing** - Secret not mounted correctly

**Verify:**
```bash
# Check Redis configuration
az redis show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-redis \
  --query '{sslPort: sslPort, enableNonSslPort: enableNonSslPort}'
```

**Fix:** Ensure application uses port 6380 (SSL) and includes password from secret

---

### Issue: Secret Not Found Error

**Symptoms:**
```
Error: secrets "azure-managed-services" not found
```

**Fix:**
```bash
# Recreate secret
kubectl create secret generic azure-managed-services \
  --namespace srvthreds \
  --from-literal=mongo-connection-string="$(az keyvault secret show --vault-name CAZ-SRVTHREDS-D-E-KEY --name cosmos-mongodb-connection-string --query value -o tsv)" \
  --from-literal=redis-password="$(az keyvault secret show --vault-name CAZ-SRVTHREDS-D-E-KEY --name redis-access-key --query value -o tsv)" \
  --from-literal=servicebus-connection-string="$(az keyvault secret show --vault-name CAZ-SRVTHREDS-D-E-KEY --name servicebus-connection-string --query value -o tsv)" \
  --context CAZ-SRVTHREDS-D-E-AKS
```

---

## Rollback of Rollback (Emergency)

**If managed services don't work and you need to revert to containerized databases:**

```bash
# 1. Restore old ConfigMap
kubectl apply -f /tmp/configmap-backup-<timestamp>.yaml --context CAZ-SRVTHREDS-D-E-AKS

# 2. Scale up containerized databases
kubectl scale deployment mongo-repl-1 --replicas=1 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl scale deployment redis --replicas=1 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl scale deployment rabbitmq --replicas=1 -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS

# 3. Wait for database pods to be ready
kubectl wait --for=condition=ready pod -l app=mongo-repl-1 -n srvthreds --timeout=300s --context CAZ-SRVTHREDS-D-E-AKS
kubectl wait --for=condition=ready pod -l app=redis -n srvthreds --timeout=120s --context CAZ-SRVTHREDS-D-E-AKS
kubectl wait --for=condition=ready pod -l app=rabbitmq -n srvthreds --timeout=120s --context CAZ-SRVTHREDS-D-E-AKS

# 4. Restart application pods
kubectl rollout restart deployment srvthreds-engine -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl rollout restart deployment srvthreds-session-agent -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
kubectl rollout restart deployment srvthreds-persistence-agent -n srvthreds --context CAZ-SRVTHREDS-D-E-AKS
```

---

## Success Criteria

**Rollback is complete when:**

✅ All application pods in `Running` state
✅ Application logs show connections to Cosmos DB (`cazsrvthredsdecosmos.mongo.cosmos.azure.com`)
✅ Application logs show connections to Azure Redis (`caz-srvthreds-d-e-redis.redis.cache.windows.net`)
✅ No containerized database pods running
✅ Application functionality verified (API calls work, WebSocket connections work)
✅ Changes committed to git

---

## Post-Rollback Tasks

1. **Monitor for 24-48 hours** before deleting containerized database deployments
2. **Review Cosmos DB costs** in Azure Cost Management after 1 week
3. **Plan Service Bus migration** (replacing RabbitMQ requires code changes)
4. **Update documentation** to reflect correct architecture
5. **Create runbooks** for managed service operations (backups, scaling, failover)

---

## Questions During Execution

If you encounter any issues or have questions during execution, document them but **do not** ask the AI to execute commands. The AI is in read-only mode for your cloud environment.

**End of Rollback Plan**
