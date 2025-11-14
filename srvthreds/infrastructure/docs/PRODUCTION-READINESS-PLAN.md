# Production-Ready Azure Infrastructure Plan

**Last Updated:** 2025-01-13
**Status:** Planning Phase
**Goal:** Production-grade AKS deployment with dev/test/prod parity, optimized for cost

---

## Executive Summary

This document outlines the complete infrastructure required to make SrvThreds production-ready on Azure Kubernetes Service (AKS). The architecture is designed to be consistent across dev/test/prod environments with only resource sizing differences, minimizing surprises during promotion while keeping development costs low.

**Current State:** Dev environment running on AKS with ClusterIP services (port-forward access only)
**Target State:** Production-ready infrastructure with public ingress, security hardening, monitoring, and persistent storage

---

## Architecture Overview

### Current Architecture (Dev - As Is)
```
Internet
    ↓ (port-forward only)
kubectl → AKS Cluster
    ├── Session Agent (ClusterIP)
    ├── Engine (ClusterIP)
    ├── Persistence Agent (ClusterIP)
    ├── MongoDB (emptyDir - ephemeral)
    ├── Redis (emptyDir - ephemeral)
    └── RabbitMQ (emptyDir - ephemeral)
```

### Target Architecture (All Environments)
```
Internet
    ↓ HTTPS (SSL/TLS)
Azure Front Door / Application Gateway
    ↓ (WAF, DDoS Protection)
Azure Load Balancer (L4)
    ↓
AKS Cluster (Private/Public based on env)
    ├── Nginx Ingress Controller
    │   ├── Session Agent Service
    │   └── Engine Service
    ├── Application Services
    │   ├── Session Agent
    │   ├── Engine
    │   └── Persistence Agent
    ├── Infrastructure Services
    │   ├── MongoDB (Azure Disk - Persistent)
    │   ├── Redis (Azure Disk - Persistent)
    │   └── RabbitMQ (Azure Disk - Persistent)
    └── Observability Stack
        ├── Azure Monitor / Container Insights
        ├── Application Insights
        └── Log Analytics Workspace
```

---

## Phase 1: Network & Ingress Infrastructure

### 1.1 Network Security Groups (NSG)
**Priority:** Critical
**Cost Impact:** Minimal ($0-5/month)

**Requirements:**
- [ ] Create NSG rules for AKS subnet
- [ ] Restrict inbound traffic to LoadBalancer/AppGateway only
- [ ] Allow outbound to Azure services (ACR, Storage, Monitor)
- [ ] Implement IP whitelisting for dev environment
- [ ] Document security group rules in IaC

**Dev Configuration:**
```yaml
# Restrict to office/VPN IPs only
inbound_rules:
  - name: allow-office-https
    source: <OFFICE_IP_RANGES>
    destination: LoadBalancer
    port: 443
    priority: 100
```

**Prod Configuration:**
```yaml
# Open to internet but protected by WAF
inbound_rules:
  - name: allow-internet-https
    source: Internet
    destination: ApplicationGateway
    port: 443
    priority: 100
```

### 1.2 Ingress Controller (Nginx)
**Priority:** Critical
**Cost Impact:** ~$50-100/month (LoadBalancer costs)

**Why Nginx over bare LoadBalancer:**
- Single LoadBalancer IP for multiple services (cost savings)
- Path-based routing (/api → Engine, /socket.io → Session Agent)
- SSL/TLS termination at ingress level
- WebSocket support for Socket.IO
- Request rate limiting and throttling
- Health check configuration
- Easier to add services without provisioning new IPs

**Implementation:**
```bash
# Install Nginx Ingress Controller via Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

**Manifest Structure:**
```yaml
# infrastructure/cloud/kubernetes/manifests/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: srvthreds-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/websocket-services: "srvthreds-session-agent-service"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.srvthreds.example.com
    secretName: srvthreds-tls-cert
  rules:
  - host: api.srvthreds.example.com
    http:
      paths:
      - path: /socket.io
        pathType: Prefix
        backend:
          service:
            name: srvthreds-session-agent-service
            port: 3000
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: srvthreds-engine-service
            port: 8082
```

### 1.3 Azure Application Gateway (Optional - Prod Only)
**Priority:** Medium (Phase 2)
**Cost Impact:** ~$200-300/month

**Benefits over LoadBalancer:**
- Web Application Firewall (WAF) - OWASP top 10 protection
- SSL offloading at Azure edge
- Autoscaling capabilities
- Better DDoS protection
- Azure-native integration

**Use Case:** Recommended for production, skip for dev/test to save costs

### 1.4 Azure Front Door (Optional - Global Prod)
**Priority:** Low (Phase 3)
**Cost Impact:** ~$35/month + bandwidth

**Benefits:**
- Global load balancing and failover
- CDN capabilities for static assets
- Advanced WAF rules
- DDoS protection at Microsoft edge
- SSL/TLS termination at edge

**Use Case:** Only if you need multi-region or global CDN

---

## Phase 2: DNS & SSL/TLS Certificate Management

### 2.1 DNS Configuration
**Priority:** Critical
**Cost Impact:** ~$0.50/month per zone

**Requirements:**
- [ ] Register domain or use Azure-provided domain
- [ ] Create Azure DNS Zone
- [ ] Configure DNS records per environment

**DNS Structure:**
```
dev.api.srvthreds.com    → Dev AKS LoadBalancer IP
test.api.srvthreds.com   → Test AKS LoadBalancer IP
api.srvthreds.com        → Prod AKS/AppGateway IP

# Example for dev
dev.api.srvthreds.com    A    20.123.45.67
```

### 2.2 SSL/TLS Certificate Management
**Priority:** Critical
**Cost Impact:** Free (Let's Encrypt) or ~$70/year (commercial cert)

**Option 1: cert-manager + Let's Encrypt (Recommended)**
```bash
# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/cert-issuer.yaml
```

```yaml
# cert-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@srvthreds.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

**Option 2: Azure Key Vault + Commercial Certificate**
- Purchase wildcard cert (*.srvthreds.com)
- Store in Azure Key Vault
- Use CSI driver to mount in AKS

**Recommendation:** Use cert-manager for dev/test, consider commercial cert for production

---

## Phase 3: Persistent Storage for Databases

**Current Issue:** All databases use `emptyDir` - data lost on pod restart
**Priority:** Critical for prod, medium for dev
**Cost Impact:** ~$10-50/month depending on disk size

### 3.1 Storage Classes
```yaml
# Define environment-specific storage classes
---
# Dev - Standard HDD (cheapest)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-standard-dev
provisioner: kubernetes.io/azure-disk
parameters:
  storageaccounttype: Standard_LRS
  kind: Managed
---
# Prod - Premium SSD (better performance)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-premium-prod
provisioner: kubernetes.io/azure-disk
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
```

### 3.2 Persistent Volume Claims
```yaml
# MongoDB PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
  namespace: srvthreds
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: azure-disk-standard-dev  # Override per environment
  resources:
    requests:
      storage: 10Gi  # Dev: 10Gi, Prod: 100Gi
```

### 3.3 Update Deployments
Replace `emptyDir` with PVC mounts in:
- [ ] `mongo-repl-1.yaml` - MongoDB data directory
- [ ] `redis.yaml` - Redis persistence
- [ ] `rabbitmq.yaml` - RabbitMQ data

**Cost Optimization:**
- Dev: Standard_LRS (HDD) - ~$0.05/GB/month → $0.50/month for 10GB
- Test: Standard_LRS (HDD) - ~$0.05/GB/month → $2.50/month for 50GB
- Prod: Premium_LRS (SSD) - ~$0.12/GB/month → $12/month for 100GB

### 3.4 Backup Strategy
- [ ] Azure Backup for Managed Disks (point-in-time recovery)
- [ ] MongoDB backup jobs (mongodump to Azure Blob Storage)
- [ ] Retention policy: Dev (7 days), Test (14 days), Prod (30 days)

---

## Phase 4: Monitoring & Observability

**Priority:** Critical
**Cost Impact:** ~$50-200/month depending on log volume

### 4.1 Azure Monitor + Container Insights
```bash
# Enable Container Insights on AKS cluster
az aks enable-addons \
  --resource-group rg-srvthreds-dev-eastus \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --addons monitoring \
  --workspace-resource-id /subscriptions/.../log-analytics-workspace
```

**Metrics to Track:**
- Pod CPU/Memory usage
- Node resource utilization
- Container restart counts
- Network I/O
- Disk I/O

### 4.2 Application Insights (APM)
```typescript
// Add Application Insights SDK to Node.js services
import * as appInsights from "applicationinsights";

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .start();
```

**Track:**
- Request latency and throughput
- Exception rates
- External dependency calls (MongoDB, Redis, RabbitMQ)
- Custom events (Thred creation, pattern matching, etc.)

### 4.3 Log Aggregation
```yaml
# Configure log forwarding to Azure Log Analytics
apiVersion: v1
kind: ConfigMap
metadata:
  name: container-azm-ms-agentconfig
  namespace: kube-system
data:
  log-collection-settings: |
    [log_collection_settings]
       [log_collection_settings.stdout]
          enabled = true
       [log_collection_settings.stderr]
          enabled = true
```

### 4.4 Alerting Rules
```yaml
# Critical alerts
- MongoDB replica set health
- Pod crash loops (> 3 restarts/hour)
- High memory usage (> 80%)
- High CPU usage (> 80% for 10 min)
- Application errors (> 10 errors/min)
- Certificate expiration (< 30 days)
```

### 4.5 Dashboards
- [ ] Cluster health dashboard
- [ ] Application performance dashboard
- [ ] Business metrics (Threds created, events processed, etc.)
- [ ] Cost monitoring dashboard

---

## Phase 5: Security Hardening

### 5.1 Pod Security Standards
```yaml
# Enforce restricted pod security at namespace level
apiVersion: v1
kind: Namespace
metadata:
  name: srvthreds
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 5.2 Network Policies
```yaml
# Default deny all traffic, explicit allow
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: srvthreds
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow Engine → MongoDB
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-engine-to-mongo
spec:
  podSelector:
    matchLabels:
      app: mongo-repl-1
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: srvthreds-engine
    ports:
    - protocol: TCP
      port: 27017
```

### 5.3 Secrets Management
**Current:** ConfigMap (insecure for secrets)
**Target:** Azure Key Vault with CSI driver

```bash
# Install Azure Key Vault CSI driver
helm install csi-secrets-store-provider-azure \
  csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
  --namespace kube-system
```

```yaml
# Mount secrets from Key Vault
apiVersion: v1
kind: Pod
spec:
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      volumeAttributes:
        secretProviderClass: azure-srvthreds-secrets
  containers:
  - name: app
    volumeMounts:
    - name: secrets-store
      mountPath: "/mnt/secrets"
      readOnly: true
```

### 5.4 Image Scanning
- [ ] Enable Azure Container Registry vulnerability scanning
- [ ] Implement admission controller to block vulnerable images
- [ ] Regularly update base images

### 5.5 RBAC Configuration
```yaml
# Principle of least privilege for service accounts
apiVersion: v1
kind: ServiceAccount
metadata:
  name: srvthreds-app
  namespace: srvthreds
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: srvthreds-app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

---

## Phase 6: High Availability & Scalability

### 6.1 Pod Disruption Budgets
```yaml
# Ensure minimum availability during updates/evictions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: srvthreds-engine-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: srvthreds-engine
```

### 6.2 Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: srvthreds-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: srvthreds-engine
  minReplicas: 2  # Dev: 1, Prod: 2
  maxReplicas: 10  # Dev: 3, Prod: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 6.3 Multi-AZ Deployment
```bash
# Ensure AKS cluster spans multiple availability zones
az aks create \
  --zones 1 2 3 \
  --node-count 3
```

### 6.4 Database Replication
- MongoDB: Already configured as replica set (enhance with 3 replicas in prod)
- Redis: Consider Redis Cluster or Azure Cache for Redis (managed)
- RabbitMQ: Configure clustering for HA

---

## Phase 7: Cost Optimization Strategy

### 7.1 Environment-Specific Resource Sizing

**Development Environment**
```yaml
# Optimized for cost, not performance
Node Pool:
  - VM Size: Standard_B2s (2 vCPU, 4GB RAM)
  - Node Count: 2 (no autoscaling)
  - Cost: ~$60/month

Application Pods:
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "200m"

Infrastructure Pods:
  MongoDB: 256Mi RAM, 100m CPU
  Redis: 128Mi RAM, 50m CPU
  RabbitMQ: 256Mi RAM, 100m CPU

Storage:
  - Standard_LRS (HDD)
  - MongoDB: 10GB
  - Total: ~$1/month
```

**Test Environment**
```yaml
Node Pool:
  - VM Size: Standard_D2s_v3 (2 vCPU, 8GB RAM)
  - Node Count: 2-3 (autoscaling)
  - Cost: ~$150/month

Application Pods:
  resources:
    requests:
      memory: "256Mi"
      cpu: "200m"
    limits:
      memory: "512Mi"
      cpu: "500m"

Infrastructure Pods:
  MongoDB: 512Mi RAM, 250m CPU
  Redis: 256Mi RAM, 150m CPU
  RabbitMQ: 256Mi RAM, 150m CPU

Storage:
  - Standard_LRS (HDD)
  - MongoDB: 50GB
  - Total: ~$5/month
```

**Production Environment**
```yaml
Node Pool:
  - VM Size: Standard_D4s_v3 (4 vCPU, 16GB RAM)
  - Node Count: 3-10 (autoscaling)
  - Multi-AZ deployment
  - Cost: ~$500-1500/month

Application Pods:
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"

Infrastructure Pods:
  MongoDB: 2Gi RAM, 1000m CPU (consider Azure Cosmos DB)
  Redis: 1Gi RAM, 500m CPU (consider Azure Cache for Redis)
  RabbitMQ: 1Gi RAM, 500m CPU

Storage:
  - Premium_LRS (SSD)
  - MongoDB: 100GB
  - Total: ~$30/month
```

### 7.2 Cost Monitoring
```bash
# Install kubecost for cost visibility
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost --create-namespace
```

### 7.3 Auto-Shutdown (Dev Only)
```yaml
# Scale down dev environment outside business hours
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev
spec:
  schedule: "0 19 * * 1-5"  # 7 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl
            command:
            - /bin/sh
            - -c
            - kubectl scale deployment --all --replicas=0 -n srvthreds
```

### 7.4 Reserved Instances
- Purchase 1-year reserved VMs for production (save ~30%)
- Use spot instances for non-critical workloads

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Azure Key Vault for secrets
- [ ] Configure persistent storage classes
- [ ] Update all deployments to use PVCs instead of emptyDir
- [ ] Create backup jobs for databases
- [ ] Implement basic NSG rules

**Deliverable:** Data persists across pod restarts

### Phase 2: Ingress & Public Access (Week 3-4)
- [ ] Install Nginx Ingress Controller
- [ ] Configure Ingress resources for Session Agent and Engine
- [ ] Register domain and configure Azure DNS
- [ ] Install cert-manager and configure Let's Encrypt
- [ ] Update client applications to use domain name
- [ ] Enable HTTPS with automatic certificate renewal

**Deliverable:** Public access via https://dev.api.srvthreds.com

### Phase 3: Monitoring & Observability (Week 5-6)
- [ ] Enable Azure Monitor Container Insights
- [ ] Integrate Application Insights SDK in all services
- [ ] Configure log forwarding to Log Analytics
- [ ] Create alerting rules for critical metrics
- [ ] Build operational dashboards
- [ ] Set up on-call rotation and alert routing

**Deliverable:** Full visibility into system health and performance

### Phase 4: Security Hardening (Week 7-8)
- [ ] Implement Network Policies
- [ ] Configure Pod Security Standards
- [ ] Migrate secrets from ConfigMap to Key Vault
- [ ] Enable ACR vulnerability scanning
- [ ] Implement RBAC for service accounts
- [ ] Conduct security audit

**Deliverable:** Hardened security posture

### Phase 5: High Availability & Scaling (Week 9-10)
- [ ] Configure Pod Disruption Budgets
- [ ] Implement Horizontal Pod Autoscalers
- [ ] Scale MongoDB to 3-replica set
- [ ] Set up multi-AZ node pools
- [ ] Test failover scenarios
- [ ] Load testing and performance tuning

**Deliverable:** Resilient, auto-scaling infrastructure

### Phase 6: Test Environment (Week 11-12)
- [ ] Clone infrastructure for test environment
- [ ] Adjust resource sizing for test
- [ ] Configure CI/CD pipeline to deploy to test
- [ ] Test promotion workflow from dev → test
- [ ] Validate all functionality in test

**Deliverable:** Fully functional test environment

### Phase 7: Production Environment (Week 13-14)
- [ ] Provision production AKS cluster
- [ ] Deploy with production resource sizing
- [ ] Add Application Gateway with WAF
- [ ] Configure production monitoring and alerting
- [ ] Conduct production readiness review
- [ ] Execute production deployment

**Deliverable:** Production environment live

### Phase 8: Optimization & Operations (Ongoing)
- [ ] Monitor costs and optimize
- [ ] Tune autoscaling parameters
- [ ] Implement auto-shutdown for dev
- [ ] Purchase reserved instances for prod
- [ ] Continuous security updates
- [ ] Regular disaster recovery drills

**Deliverable:** Optimized, well-operated infrastructure

---

## Estimated Monthly Costs

### Development Environment
| Component | Cost |
|-----------|------|
| AKS Cluster (2x B2s nodes) | $60 |
| Azure Load Balancer | $20 |
| Storage (20GB Standard) | $1 |
| Azure Monitor (minimal logs) | $10 |
| Azure DNS | $1 |
| **Total** | **~$92/month** |

### Test Environment
| Component | Cost |
|-----------|------|
| AKS Cluster (2-3x D2s_v3 nodes) | $150 |
| Azure Load Balancer | $20 |
| Storage (100GB Standard) | $5 |
| Azure Monitor | $30 |
| Azure DNS | $1 |
| **Total** | **~$206/month** |

### Production Environment (Base)
| Component | Cost |
|-----------|------|
| AKS Cluster (3-5x D4s_v3 nodes) | $800 |
| Azure Application Gateway + WAF | $250 |
| Storage (200GB Premium) | $30 |
| Azure Monitor + App Insights | $150 |
| Azure DNS | $1 |
| Azure Key Vault | $5 |
| Azure Backup | $20 |
| **Total** | **~$1,256/month** |

**Savings Opportunities:**
- Dev auto-shutdown (nights/weekends): Save ~50% on dev → $46/month
- Reserved instances (prod): Save ~30% → $1,016/month
- **Optimized Total: Dev + Test + Prod ≈ $1,268/month**

---

## Success Criteria

### Development
- ✅ All services accessible via public domain with HTTPS
- ✅ Data persists across pod restarts
- ✅ Basic monitoring and logging in place
- ✅ Cost under $100/month

### Test
- ✅ Identical architecture to production
- ✅ Automated deployments from CI/CD
- ✅ Load testing passing
- ✅ Security scanning integrated

### Production
- ✅ 99.9% uptime SLA
- ✅ Auto-scaling handling traffic spikes
- ✅ All security controls implemented
- ✅ Mean time to recovery < 15 minutes
- ✅ Full observability and alerting

---

## Next Steps

1. **Review & Approve**: Stakeholder review of this plan
2. **Prioritize**: Confirm phase priorities based on business needs
3. **Provision Resources**: Set up Azure resources (Key Vault, DNS, etc.)
4. **Start Phase 1**: Begin with persistent storage implementation

**Questions to Answer:**
- Do we already have a domain name? Or should we register one?
- What are the office/VPN IP ranges for dev NSG whitelisting?
- Do we need multi-region failover or is single-region sufficient for v1?
- What's the target launch date for production?
- Who will be on-call for production alerts?
