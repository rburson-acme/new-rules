# Architectural Decision Records (ADR)

**Last Updated:** 2025-01-13
**Status:** Active
**Purpose:** Document key architectural decisions, influences, and rationale for SrvThreds Azure infrastructure

---

## Overview

This document captures the "why" behind major architectural decisions for the SrvThreds production infrastructure. Each decision is documented with its context, influences, alternatives considered, and trade-offs.

---

## ADR-001: Nginx Ingress Controller over Multiple LoadBalancers

**Date:** 2025-01-13
**Status:** Approved
**Decision Makers:** Architecture Team

### Context
SrvThreds requires public access to multiple services (Session Agent, Engine) in Azure Kubernetes Service. Initial approach used individual LoadBalancer services per component.

### Decision
Use a single Nginx Ingress Controller with path-based routing instead of multiple LoadBalancer-type services.

### Influences

**Cost Optimization:**
- Azure LoadBalancer: ~$20-25/month per IP
- Multiple services would cost $40-50/month just for public IPs
- Nginx Ingress: Single LoadBalancer ($20/month) for all services
- **Savings:** $20-40/month per environment × 3 environments = $60-120/month

**Technical Requirements:**
- Session Agent uses Socket.IO (WebSocket connections)
- Nginx has mature WebSocket proxying with connection upgrade support
- Path-based routing needed: `/socket.io` → Session Agent, `/api` → Engine
- Layer 4 LoadBalancer alone cannot route by HTTP path

**Industry Standards:**
- Nginx Ingress is most popular Kubernetes ingress (used by Netflix, Airbnb, Spotify)
- CNCF graduated project with large community
- Extensive documentation and production battle-testing

**Prior Experience:**
- Previous LoadBalancer attempt blocked by Azure NSG (external access failed)
- Multiple LoadBalancers create management overhead
- No built-in SSL termination or rate limiting

### Alternatives Considered

**Option 1: Direct LoadBalancer per Service**
- **Pros:** Simpler initial setup, no extra components
- **Cons:** Higher cost, no path routing, no SSL termination, costs multiply per service
- **Verdict:** Rejected due to cost and lack of features

**Option 2: Azure Application Gateway**
- **Pros:** Azure-native, WAF included, better Azure integration
- **Cons:** $250/month minimum, overkill for dev/test, vendor lock-in
- **Verdict:** Deferred to production-only (Phase 2)

**Option 3: Istio Service Mesh**
- **Pros:** Advanced traffic management, observability, security
- **Cons:** Massive complexity overhead, steep learning curve, resource intensive
- **Verdict:** Rejected as over-engineering (YAGNI principle)

### Trade-offs

**Advantages:**
- ✅ Single public IP for all services (cost savings)
- ✅ Path-based routing (`/api`, `/socket.io`, `/health`)
- ✅ SSL/TLS termination at ingress layer
- ✅ WebSocket support for Socket.IO
- ✅ Request rate limiting and throttling
- ✅ Centralized access logging
- ✅ Easy to add new services without new IPs

**Disadvantages:**
- ⚠️ Single point of failure (mitigated by pod replicas)
- ⚠️ Additional component to monitor
- ⚠️ Learning curve for Nginx configuration

### Implementation Notes
```yaml
# Single LoadBalancer IP with path routing
Ingress Rules:
  /socket.io/* → srvthreds-session-agent-service:3000
  /api/*       → srvthreds-engine-service:8082
  /health      → health-check endpoint

SSL Termination: At ingress (cert-manager + Let's Encrypt)
WebSocket: Enabled via nginx.ingress.kubernetes.io/websocket-services annotation
```

---

## ADR-002: Azure Managed Disks for Persistent Storage

**Date:** 2025-01-13
**Status:** Approved

### Context
Current deployment uses `emptyDir` volumes for MongoDB, Redis, and RabbitMQ. Data is lost on pod restart, making replica set configuration ephemeral.

### Decision
Replace all `emptyDir` volumes with Azure Managed Disk PersistentVolumeClaims (PVCs).

### Influences

**Data Safety:**
- Observed persistence-agent crashes and restarts in deployment logs
- MongoDB replica set loses configuration on pod restart with `emptyDir`
- No production system can tolerate database data loss on pod restart
- **Critical:** This is a blocking issue for production deployment

**Cost Analysis:**
- Dev: 10GB Standard_LRS (HDD) = $0.50/month
- Test: 50GB Standard_LRS (HDD) = $2.50/month
- Prod: 100GB Premium_LRS (SSD) = $12/month
- **Total:** $15/month across all environments for data persistence

**Azure Integration:**
- Azure Managed Disks integrate natively via AKS CSI driver
- Automatic provisioning and attachment
- Zone-redundant options available (LRS, ZRS)
- Built-in snapshot and backup capabilities

**Performance Tiers:**
- Standard_LRS (HDD): 500 IOPS, sufficient for dev/test
- Premium_LRS (SSD): Up to 20,000 IOPS, needed for production

### Alternatives Considered

**Option 1: Azure Cosmos DB (MongoDB API)**
- **Pros:** Fully managed, automatic scaling, global distribution
- **Cons:** $50-500/month minimum, vendor lock-in, overkill for current scale
- **Verdict:** Rejected due to cost (33x more expensive than managed disk)

**Option 2: Azure Cache for Redis (Managed)**
- **Pros:** Fully managed, automatic failover, enterprise features
- **Cons:** $50/month minimum, less control, not needed for current scale
- **Verdict:** Deferred until scale requires it

**Option 3: StatefulSets with Local Persistent Volumes**
- **Pros:** Better performance (local disk), no network overhead
- **Cons:** Node affinity issues, no cross-zone portability, complex backup
- **Verdict:** Rejected due to operational complexity

**Option 4: Keep emptyDir (status quo)**
- **Pros:** Zero cost, simple
- **Cons:** Data loss on restart, unusable for production
- **Verdict:** Rejected as production blocker

### Trade-offs

**Advantages:**
- ✅ Data persists across pod restarts
- ✅ MongoDB replica set configuration survives failures
- ✅ Azure-native backup and snapshot support
- ✅ Can upgrade from Standard to Premium without code changes
- ✅ Extremely low cost for dev environment ($0.50/month)

**Disadvantages:**
- ⚠️ ReadWriteOnce limitation (single node attachment)
- ⚠️ Network I/O overhead vs local disk
- ⚠️ Requires StorageClass configuration per environment

### Implementation Notes
```yaml
Storage Classes:
  Dev:  azure-disk-standard-dev  (Standard_LRS HDD)
  Test: azure-disk-standard-test (Standard_LRS HDD)
  Prod: azure-disk-premium-prod  (Premium_LRS SSD)

Volume Sizes:
  Dev:  MongoDB: 10GB, Redis: 5GB, RabbitMQ: 5GB
  Test: MongoDB: 50GB, Redis: 10GB, RabbitMQ: 10GB
  Prod: MongoDB: 100GB, Redis: 20GB, RabbitMQ: 20GB

Backup Strategy:
  - Azure Disk Snapshots (daily)
  - MongoDB mongodump to Azure Blob Storage (daily)
  - Retention: Dev (7d), Test (14d), Prod (30d)
```

---

## ADR-003: cert-manager with Let's Encrypt for SSL/TLS

**Date:** 2025-01-13
**Status:** Approved

### Context
Public HTTPS access requires SSL/TLS certificates. Manual certificate management is error-prone and requires renewal every 90 days (Let's Encrypt) or annually (commercial).

### Decision
Use cert-manager (CNCF project) with Let's Encrypt for automated certificate provisioning and renewal.

### Influences

**Automation:**
- Manual certificate renewal is error-prone
- Famous outages: Netflix (2017), LinkedIn (2021) from expired certificates
- Let's Encrypt certificates expire every 90 days → manual process unsustainable
- cert-manager automates entire lifecycle (issue, renew, rotate)

**Cost:**
- Let's Encrypt: **Free**
- Commercial wildcard cert: $70-300/year
- Azure Key Vault certificates: $5/month + cert cost
- **Savings:** $70-300/year per environment

**Industry Standard:**
- cert-manager is CNCF project (same foundation as Kubernetes)
- Used by 100,000+ clusters worldwide
- Integrates with all major certificate authorities
- Kubernetes-native CRDs (Certificate, Issuer, ClusterIssuer)

**Developer Experience:**
- Certificates automatically created when Ingress deployed
- No manual CSR generation or DNS validation steps
- Automatic renewal 30 days before expiration
- Prometheus metrics for certificate expiry monitoring

### Alternatives Considered

**Option 1: Manual Let's Encrypt Certificates**
- **Pros:** Simple initial setup, no extra components
- **Cons:** Manual renewal every 90 days, high risk of expiration, no automation
- **Verdict:** Rejected due to operational burden

**Option 2: Azure Key Vault Certificates**
- **Pros:** Centralized secret management, Azure-native
- **Cons:** Manual renewal process, additional cost, more complex setup
- **Verdict:** Rejected in favor of automation

**Option 3: Commercial Wildcard Certificate**
- **Pros:** Single cert for *.srvthreds.com, annual renewal
- **Cons:** $70-300/year cost, still requires manual renewal, vendor dependency
- **Verdict:** Deferred to production if Let's Encrypt rate limits hit

**Option 4: Self-Signed Certificates**
- **Pros:** Free, no external dependency
- **Cons:** Browser warnings, not trusted by clients, unusable for production
- **Verdict:** Rejected for any public-facing environment

### Trade-offs

**Advantages:**
- ✅ Fully automated certificate lifecycle
- ✅ Zero cost
- ✅ Kubernetes-native (CRD-based)
- ✅ Supports multiple issuers (Let's Encrypt, Vault, Venafi)
- ✅ Prometheus metrics for observability
- ✅ Automatic rotation before expiry

**Disadvantages:**
- ⚠️ Let's Encrypt rate limits (50 certs/week per domain)
- ⚠️ Requires DNS or HTTP challenge (HTTP chosen for simplicity)
- ⚠️ Additional component to monitor
- ⚠️ Certificate authority dependency (mitigated by multiple issuer support)

### Implementation Notes
```yaml
ClusterIssuer: letsencrypt-prod
Challenge Type: HTTP-01 (via Ingress)
Certificate Renewal: Automatic 30 days before expiry
Monitoring: Prometheus exporter enabled

Ingress Annotation:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"

DNS Records Required:
  dev.api.srvthreds.com  → Dev LoadBalancer IP
  test.api.srvthreds.com → Test LoadBalancer IP
  api.srvthreds.com      → Prod LoadBalancer IP
```

---

## ADR-004: Environment Parity (Dev/Test/Prod Same Architecture)

**Date:** 2025-01-13
**Status:** Approved

### Context
Need to deploy across dev, test, and production environments while minimizing deployment surprises and environment-specific bugs.

### Decision
Maintain identical architecture across all environments, varying only resource sizing (CPU, memory, disk, node count).

### Influences

**Twelve-Factor App Methodology:**
- Factor X: "Keep development, staging, and production as similar as possible"
- Dev/prod parity reduces bugs from environment differences
- Same backing services (MongoDB, Redis, RabbitMQ) in all environments

**Project Requirement:**
- Quote: "I want to get this as solid as possible so the push for test and prod don't introduce more resources or needs"
- Goal: Zero architectural surprises during environment promotion
- Dev environment becomes production preview

**Industry Experience:**
- Most production bugs stem from environment differences
- "Works on my machine" → "Works in dev" → should mean "Works in prod"
- Different databases, networking, or resource limits cause drift
- Docker/Kubernetes philosophy: Consistent container behavior

**Risk Mitigation:**
- Test deployments validate production architecture
- Resource sizing is only variable (easy to adjust)
- Network policies, security, monitoring consistent across envs
- CI/CD pipeline promotes identical manifests with Kustomize overlays

### What Varies Across Environments

**Resource Sizing Only:**
```yaml
Development:
  Node Pool: 2x Standard_B2s (2 vCPU, 4GB RAM)
  Application Pods: 128-256Mi memory, 100-200m CPU
  Infrastructure Pods: 128-512Mi memory, 50-250m CPU
  Storage: 10-20GB Standard_LRS (HDD)

Test:
  Node Pool: 2-3x Standard_D2s_v3 (2 vCPU, 8GB RAM)
  Application Pods: 256-512Mi memory, 200-500m CPU
  Infrastructure Pods: 256-512Mi memory, 150-250m CPU
  Storage: 50-100GB Standard_LRS (HDD)

Production:
  Node Pool: 3-10x Standard_D4s_v3 (4 vCPU, 16GB RAM)
  Application Pods: 512Mi-2Gi memory, 500-2000m CPU
  Infrastructure Pods: 1-2Gi memory, 500-1000m CPU
  Storage: 100-200GB Premium_LRS (SSD)
  Multi-AZ: Enabled (3 availability zones)
```

**What's Identical:**
- Nginx Ingress Controller
- cert-manager with Let's Encrypt
- Azure Managed Disk persistent volumes
- Network Policies
- Pod Security Standards
- RBAC configuration
- Azure Monitor + Application Insights
- Backup strategies
- Service mesh topology

### Alternatives Considered

**Option 1: Different Architectures per Environment**
Example: Dev uses Docker Compose, Test uses Kubernetes, Prod uses managed services
- **Pros:** Optimize each environment independently, lower dev costs
- **Cons:** Environment drift, "works in dev" doesn't mean "works in prod", hard to debug
- **Verdict:** Rejected due to high risk of production surprises

**Option 2: Managed Services in Prod, Self-Hosted in Dev**
Example: Cosmos DB in prod, MongoDB in dev
- **Pros:** Lower operational burden in production
- **Cons:** Completely different APIs, no way to test prod setup, expensive migration
- **Verdict:** Rejected due to inability to validate production behavior

**Option 3: Single Environment (Prod Only)**
- **Pros:** Zero environment drift, simplest
- **Cons:** Testing changes requires production deployment, extremely high risk
- **Verdict:** Rejected as reckless

### Trade-offs

**Advantages:**
- ✅ Zero architectural surprises during promotion
- ✅ Test environment validates production configuration
- ✅ Same monitoring, security, networking everywhere
- ✅ Single set of deployment manifests (Kustomize overlays for sizing)
- ✅ Easier troubleshooting (dev replicates prod behavior)

**Disadvantages:**
- ⚠️ Dev environment slightly more complex than bare Docker Compose
- ⚠️ Higher dev costs than minimal setup (mitigated by auto-shutdown)
- ⚠️ Some production features wasted in dev (e.g., multi-AZ)

### Implementation Notes
```yaml
# Kustomize Structure
infrastructure/cloud/kubernetes/manifests/
├── base/              # Shared architecture
│   ├── ingress.yaml
│   ├── cert-issuer.yaml
│   ├── network-policies.yaml
│   └── deployments/
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── resource-limits.yaml  # Small sizes
    ├── test/
    │   ├── kustomization.yaml
    │   └── resource-limits.yaml  # Medium sizes
    └── prod/
        ├── kustomization.yaml
        ├── resource-limits.yaml  # Large sizes
        └── multi-az.yaml         # Availability zones
```

---

## ADR-005: Azure Monitor + Application Insights over Third-Party APM

**Date:** 2025-01-13
**Status:** Approved

### Context
Microservices architecture requires observability across Engine, Session Agent, and Persistence Agent. Need to monitor infrastructure, application performance, and business metrics.

### Decision
Use Azure Monitor (Container Insights) for infrastructure and Application Insights for application performance monitoring (APM).

### Influences

**Native Integration:**
- Already deployed on Azure (AKS, ACR, managed disks)
- Azure Monitor integrates with AKS without extra configuration
- Application Insights SDK for Node.js is first-class
- No additional authentication or networking setup required

**Cost Efficiency:**
- Included in Azure subscription (pay-per-use model)
- No per-host or per-agent licensing fees
- 5GB/month log ingestion free tier
- Estimated: $50-200/month vs $300-1000/month for third-party APM

**Distributed Tracing:**
- Microservices architecture needs request correlation across services
- Application Insights automatically traces HTTP calls between services
- Correlation IDs propagated through RabbitMQ message queues
- Dependency mapping shows Engine → Persistence Agent → MongoDB flows

**Technology Stack Fit:**
- Node.js/TypeScript backend → Application Insights SDK mature
- Express.js framework → automatic instrumentation
- Socket.IO → custom telemetry for WebSocket connections
- MongoDB/Redis/RabbitMQ → automatic dependency tracking

**Operational Simplicity:**
- Single pane of glass (Azure Portal) for all monitoring
- Unified alerting (AKS + application metrics)
- Integration with Azure DevOps for CI/CD insights
- No additional vendor management

### Alternatives Considered

**Option 1: DataDog**
- **Pros:** Beautiful UI, extensive integrations, cross-cloud support
- **Cons:** $15-31/host/month ($540-1116/year for 3 envs), vendor lock-in to pricing
- **Verdict:** Rejected due to cost (5-10x more expensive)

**Option 2: New Relic**
- **Pros:** Excellent APM features, real user monitoring, AI insights
- **Cons:** $25-99/host/month, complex pricing model, overkill for current scale
- **Verdict:** Rejected due to cost and complexity

**Option 3: Grafana + Prometheus + Loki Stack**
- **Pros:** Open source, full control, cross-cloud portability
- **Cons:** Self-hosted maintenance burden, no managed option, distributed tracing requires Tempo
- **Verdict:** Rejected due to operational overhead (managing monitoring infrastructure)

**Option 4: Elastic Stack (ELK)**
- **Pros:** Powerful log search, open source, familiar to many teams
- **Cons:** Resource intensive (needs 8GB+ RAM), complex setup, no APM in free tier
- **Verdict:** Rejected due to resource cost and complexity

### Trade-offs

**Advantages:**
- ✅ Azure-native integration (zero setup friction)
- ✅ 5-10x cheaper than commercial APM solutions
- ✅ Distributed tracing for microservices
- ✅ Automatic dependency mapping
- ✅ Unified alerting and dashboards
- ✅ Application Insights SDK auto-instruments Express.js
- ✅ Log Analytics for centralized logging
- ✅ Integration with Azure DevOps

**Disadvantages:**
- ⚠️ Azure vendor lock-in (can't easily migrate to AWS/GCP)
- ⚠️ UI less polished than DataDog/New Relic
- ⚠️ Query language (KQL) has learning curve
- ⚠️ Limited cross-cloud support (Azure only)

### Implementation Notes

**Container Insights:**
```bash
az aks enable-addons \
  --resource-group rg-srvthreds-dev-eastus \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --addons monitoring \
  --workspace-resource-id /subscriptions/.../log-analytics-workspace
```

**Application Insights SDK:**
```typescript
import * as appInsights from "applicationinsights";

appInsights
  .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoDependencyCorrelation(true)  // Trace across services
  .setAutoCollectRequests(true)        // HTTP requests
  .setAutoCollectPerformance(true)     // CPU/memory
  .setAutoCollectExceptions(true)      // Unhandled exceptions
  .setAutoCollectDependencies(true)    // MongoDB, Redis, RabbitMQ
  .start();
```

**Metrics Tracked:**
- Infrastructure: Pod CPU/memory, node utilization, disk I/O
- Application: Request latency, throughput, error rate
- Dependencies: MongoDB queries, Redis operations, RabbitMQ messages
- Custom: Thred creation rate, pattern matching performance, event processing time

---

## ADR-006: Network Policies for Zero-Trust Networking

**Date:** 2025-01-13
**Status:** Approved

### Context
Kubernetes clusters have flat networking by default - any pod can talk to any other pod. Need to implement defense-in-depth security.

### Decision
Implement Kubernetes Network Policies to enforce zero-trust networking between services.

### Influences

**Security Best Practice:**
- Assume breach: If attacker compromises one pod, limit lateral movement
- Defense-in-depth: Network segmentation is additional security layer
- Principle of least privilege: Services only access what they need

**Compliance Requirements:**
- SOC2 requires network segmentation
- HIPAA requires PHI data isolation
- PCI-DSS requires cardholder data environment isolation
- Even without compliance, good security hygiene

**Architecture Fit:**
- Session Agent doesn't need direct MongoDB access (goes through Persistence Agent)
- Engine doesn't need Redis access (Session Agent owns session state)
- RabbitMQ only accessed by agents, not exposed to internet

**Kubernetes Native:**
- Network Policies are standard Kubernetes resource
- No additional cost or components required
- Declarative configuration (GitOps compatible)
- Enforced at CNI level (Azure CNI in AKS)

### Alternatives Considered

**Option 1: No Network Policies (Default)**
- **Pros:** Zero configuration, simplest
- **Cons:** Any compromised pod can access entire cluster, fails compliance audits
- **Verdict:** Rejected as security risk

**Option 2: Service Mesh (Istio/Linkerd)**
- **Pros:** Advanced traffic management, mTLS between pods, observability
- **Cons:** Massive complexity, resource overhead (sidecar per pod), steep learning curve
- **Verdict:** Rejected as over-engineering (YAGNI)

**Option 3: Azure Firewall Rules**
- **Pros:** Azure-native, centralized management
- **Cons:** Works at subnet level (too coarse), higher cost, doesn't control pod-to-pod
- **Verdict:** Rejected as insufficient granularity

### Trade-offs

**Advantages:**
- ✅ Limits blast radius of compromised pod
- ✅ Explicit allow-listing of traffic (default deny)
- ✅ Kubernetes-native (no extra components)
- ✅ Zero additional cost
- ✅ Compliance requirement satisfied
- ✅ Declarative and GitOps-friendly

**Disadvantages:**
- ⚠️ Requires careful planning of service dependencies
- ⚠️ Can break connectivity if misconfigured (testing required)
- ⚠️ Debugging network issues becomes harder
- ⚠️ CNI plugin must support Network Policies (Azure CNI does)

### Implementation Notes

**Default Deny Policy:**
```yaml
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
```

**Explicit Allow Policies:**
```yaml
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

# Allow Persistence Agent → MongoDB
# Allow Session Agent → Redis
# Allow all agents → RabbitMQ
# Allow Ingress → Session Agent
# Allow Ingress → Engine
```

**Service Communication Matrix:**
```
                  MongoDB  Redis  RabbitMQ  Internet
Session Agent       ✗       ✓       ✓         ✓ (ingress)
Engine              ✓       ✗       ✓         ✓ (ingress)
Persistence Agent   ✓       ✗       ✓         ✗
```

---

## ADR-007: Phased 14-Week Rollout Strategy

**Date:** 2025-01-13
**Status:** Approved

### Context
Need to migrate from port-forward dev environment to production-ready infrastructure across dev/test/prod without extended downtime or "big bang" risk.

### Decision
Implement production infrastructure in 8 iterative phases over 14 weeks, each delivering independent value.

### Influences

**Agile/Iterative Delivery:**
- Each phase delivers standalone value (storage, ingress, monitoring)
- Can stop after any phase and have working system
- Reduces risk of multi-week "all or nothing" migration

**Risk Management:**
- Don't change everything simultaneously
- If storage migration fails, ingress is unaffected (isolated failures)
- Each phase tested in dev before test/prod rollout
- Rollback plan exists for each phase

**Current State:**
- System running in dev today with port-forward access
- Can't afford multi-week downtime for rewrite
- Team needs time to learn Azure/Kubernetes incrementally

**Learning Curve:**
- Each phase teaches concepts before tackling harder phases
- Storage (Phase 1) teaches PVCs and StorageClasses
- Ingress (Phase 2) builds on storage knowledge
- Security (Phase 4) requires understanding from Phases 1-3

**Business Priority:**
- Phase 1 (Storage): Prevents data loss → highest risk mitigation
- Phase 2 (Ingress): Enables real user testing → highest user value
- Phase 3 (Monitoring): Visibility before complexity → operational requirement
- Phase 4 (Security): Harden before production → compliance requirement

### Phase Breakdown

**Phase 1: Persistent Storage (Week 1-2)**
- StorageClasses for dev/test/prod
- PVCs for MongoDB, Redis, RabbitMQ
- Update deployments to use PVCs
- Backup job implementation
- **Value:** Data survives pod restarts
- **Risk:** Low (can rollback to emptyDir)

**Phase 2: Ingress & Public Access (Week 3-4)**
- Nginx Ingress Controller installation
- Ingress resources for Session Agent and Engine
- DNS configuration (dev.api.srvthreds.com)
- cert-manager + Let's Encrypt setup
- **Value:** Public HTTPS access (no port-forwarding)
- **Risk:** Medium (networking changes)

**Phase 3: Monitoring & Observability (Week 5-6)**
- Azure Monitor Container Insights
- Application Insights SDK integration
- Log Analytics configuration
- Alert rules and dashboards
- **Value:** Full system visibility
- **Risk:** Low (additive, doesn't change app behavior)

**Phase 4: Security Hardening (Week 7-8)**
- Network Policies implementation
- Pod Security Standards
- Azure Key Vault integration
- ACR vulnerability scanning
- **Value:** Production-grade security
- **Risk:** Medium (network policies can break connectivity)

**Phase 5: High Availability & Scaling (Week 9-10)**
- Pod Disruption Budgets
- Horizontal Pod Autoscalers
- Multi-AZ node pools
- MongoDB 3-replica set
- **Value:** Resilience and auto-scaling
- **Risk:** Medium (cluster changes)

**Phase 6: Test Environment (Week 11-12)**
- Clone infrastructure for test
- CI/CD pipeline to test environment
- Validate dev → test promotion
- **Value:** Safe pre-production testing
- **Risk:** Low (new environment, doesn't affect dev)

**Phase 7: Production Environment (Week 13-14)**
- Production cluster provisioning
- Application Gateway + WAF
- Production deployment
- Go-live readiness review
- **Value:** Production launch
- **Risk:** High (mitigated by Phases 1-6 validation)

**Phase 8: Optimization (Ongoing)**
- Cost monitoring and tuning
- Autoscaling parameter optimization
- Dev auto-shutdown implementation
- Reserved instance purchases
- **Value:** Cost reduction
- **Risk:** Low (observational and tuning)

### Alternatives Considered

**Option 1: Big Bang Rewrite**
- Deploy all changes at once (storage + ingress + monitoring + security)
- **Pros:** Faster time to "done"
- **Cons:** High risk, hard to debug failures, no rollback plan
- **Verdict:** Rejected as too risky

**Option 2: Production First, Then Dev**
- Build production, then backport to dev
- **Pros:** Focuses on business value
- **Cons:** Can't test production setup, high risk of failure
- **Verdict:** Rejected as reckless

**Option 3: Outsource to Managed Services**
- Use Azure App Service, Cosmos DB, Azure Cache
- **Pros:** Minimal infrastructure work
- **Cons:** Expensive, vendor lock-in, doesn't match current architecture
- **Verdict:** Rejected due to cost and existing investment

### Trade-offs

**Advantages:**
- ✅ Each phase delivers independent value
- ✅ Can pause between phases for business needs
- ✅ Failures isolated to single phase
- ✅ Team learns incrementally
- ✅ Rollback plan exists for each phase
- ✅ Dev validates before test/prod rollout

**Disadvantages:**
- ⚠️ Takes 14 weeks vs "big bang" 4 weeks
- ⚠️ Some overhead from phase transitions
- ⚠️ Requires discipline to not skip phases

### Success Criteria Per Phase

**Phase 1:** MongoDB data survives `kubectl delete pod`
**Phase 2:** Client connects to https://dev.api.srvthreds.com (no port-forward)
**Phase 3:** Dashboards show pod metrics, alerts fire on test failure
**Phase 4:** Network Policies block unauthorized pod communication
**Phase 5:** HPA scales pods during load test
**Phase 6:** Test environment mirrors dev
**Phase 7:** Production passes go-live checklist
**Phase 8:** Dev cost under $100/month

---

## ADR-008: Cost Optimization Strategy

**Date:** 2025-01-13
**Status:** Approved

### Context
Running three environments (dev/test/prod) on Azure with requirement to balance production readiness with cost efficiency, especially for dev environment.

### Decision
Implement environment-specific resource sizing with dev auto-shutdown and reserved instances for production.

### Influences

**Project Requirement:**
- Quote: "keeping cost in mind when sizing the resources"
- Need production-ready architecture without overpaying for dev

**Current Resource Utilization:**
- `kubectl top nodes` shows 11% CPU usage (over-provisioned)
- Dev environment runs 24/7 but only used ~40 hours/week
- Wasting ~128 hours/week (76% of time) on idle dev resources

**Azure Pricing Model:**
- B-series (burstable): $30/month per node, 50% cheaper for low utilization
- D-series (general purpose): $60-120/month per node, better for steady workloads
- Reserved instances: 30% discount for 1-year commitment
- Standard storage: $0.05/GB/month vs Premium: $0.12/GB/month

**Industry Best Practices:**
- Right-size based on actual metrics, not guesses
- Auto-shutdown non-production during off-hours
- Use cheaper VM types for dev (B-series burstable)
- Reserved instances for predictable production workloads

### Cost Targets

**Development: $92/month → Optimized to $46/month**
- 2x Standard_B2s nodes (2 vCPU, 4GB RAM): $60/month
- Auto-shutdown nights/weekends: -$30/month savings
- Azure Load Balancer: $20/month
- Storage (20GB Standard): $1/month
- Azure Monitor (minimal logs): $10/month
- Azure DNS: $1/month
- **Optimized Total:** $46/month (50% savings)

**Test: $206/month**
- 2-3x Standard_D2s_v3 nodes (autoscaling): $150/month
- Azure Load Balancer: $20/month
- Storage (100GB Standard): $5/month
- Azure Monitor: $30/month
- Azure DNS: $1/month
- **Total:** $206/month

**Production: $1,256/month → Optimized to $1,016/month**
- 3-5x Standard_D4s_v3 nodes: $800/month
- Reserved instances (1-year): -$240/month savings
- Azure Application Gateway + WAF: $250/month
- Storage (200GB Premium): $30/month
- Azure Monitor + Application Insights: $150/month
- Azure Key Vault: $5/month
- Azure Backup: $20/month
- Azure DNS: $1/month
- **Optimized Total:** $1,016/month (19% savings)

**Grand Total: $1,554/month → Optimized to $1,268/month**
**Annual Savings: $3,432/year (18% reduction)**

### Optimization Strategies

**1. Dev Auto-Shutdown**
```yaml
# CronJob to scale down at 7 PM weekdays
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-dev
spec:
  schedule: "0 19 * * 1-5"  # 7 PM Monday-Friday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: autoscaler
          containers:
          - name: kubectl
            image: bitnami/kubectl
            command:
            - kubectl scale deployment --all --replicas=0 -n srvthreds

# CronJob to scale up at 7 AM weekdays
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-dev
spec:
  schedule: "0 7 * * 1-5"  # 7 AM Monday-Friday
  # Scale back to normal replica counts
```

**2. Right-Sizing Based on Metrics**
```yaml
# Development (low traffic, burstable OK)
nodePool:
  vmSize: Standard_B2s  # Burstable, 50% cheaper

# Production (steady traffic, need consistent performance)
nodePool:
  vmSize: Standard_D4s_v3  # General purpose, consistent CPU
```

**3. Storage Tiering**
```yaml
# Dev: Standard HDD (500 IOPS, $0.05/GB/month)
storageClass: azure-disk-standard-dev

# Prod: Premium SSD (20,000 IOPS, $0.12/GB/month)
storageClass: azure-disk-premium-prod
```

**4. Reserved Instances**
```bash
# Purchase 1-year reserved instances for production nodes
az vm reserved-capacity create \
  --vm-size Standard_D4s_v3 \
  --instance-count 3 \
  --term P1Y  # 1 year
  # Saves ~30% vs pay-as-you-go
```

**5. Cost Monitoring**
```bash
# Install kubecost for per-namespace cost visibility
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost --create-namespace

# Set up Azure Cost Management alerts
# Alert if monthly cost > $1,500
```

### Alternatives Considered

**Option 1: All Environments Same Size**
- **Pros:** Simplest, truly identical
- **Cons:** Wasteful (dev would cost $800/month like prod)
- **Verdict:** Rejected as unnecessarily expensive

**Option 2: Spot Instances for Dev**
- **Pros:** 70-90% cheaper than regular VMs
- **Cons:** Can be evicted with 30-second notice, unstable for dev work
- **Verdict:** Rejected due to interruption risk

**Option 3: Single Shared Environment**
- **Pros:** Only pay for one environment
- **Cons:** No isolation, testing risks production, unacceptable for prod
- **Verdict:** Rejected as unsafe

**Option 4: Managed Services (App Service, Cosmos DB)**
- **Pros:** No infrastructure management
- **Cons:** 5-10x more expensive, vendor lock-in
- **Verdict:** Rejected due to cost

### Trade-offs

**Advantages:**
- ✅ Dev cost reduced by 50% via auto-shutdown
- ✅ Prod cost reduced by 19% via reserved instances
- ✅ Right-sized VMs (B-series for burstable dev, D-series for prod)
- ✅ Storage tiering (HDD dev, SSD prod)
- ✅ Visibility via kubecost and Azure Cost Management

**Disadvantages:**
- ⚠️ Dev auto-shutdown requires manual scale-up if working off-hours
- ⚠️ Reserved instances require 1-year commitment
- ⚠️ Different VM types mean slightly different performance characteristics

### Cost Monitoring & Alerts

**Azure Cost Management:**
- Budget: $1,500/month across all environments
- Alert at 80% ($1,200/month)
- Alert at 100% ($1,500/month)

**Kubecost Dashboards:**
- Cost per namespace (srvthreds, ingress-nginx, cert-manager)
- Cost per pod (identify most expensive services)
- Cost efficiency (request vs usage)

**Monthly Review:**
- Review top 5 most expensive resources
- Check for orphaned disks or IPs
- Validate autoscaling is working
- Adjust resource requests/limits based on actual usage

---

## Summary Table

| Decision | Primary Influence | Monthly Cost Impact | Risk Level |
|----------|-------------------|---------------------|------------|
| Nginx Ingress | Cost savings + WebSocket support | -$30/env ($90 total) | Low |
| Managed Disks | Data persistence requirement | +$15 total | Low |
| cert-manager | Automation + zero cost | $0 (saves $210/year) | Low |
| Environment Parity | Minimize deployment surprises | $0 (architectural) | Low |
| Azure Monitor | Native integration + cost | +$190 total | Low |
| Network Policies | Security compliance | $0 | Medium |
| Phased Rollout | Risk mitigation | $0 (timing) | Low |
| Cost Optimization | Budget requirement | -$286/month | Low |

**Total Monthly Cost (Optimized): $1,268/month**
**Annual Cost: $15,216/year**

---

## Principles Applied Across Decisions

1. **KISS (Keep It Simple):** Use standard tools (Nginx, cert-manager) not exotic ones
2. **Cost-Aware Architecture:** Every decision evaluated for cost impact across environments
3. **Production Parity:** Same architecture, only sizing differs
4. **Observability First:** Can't debug what you can't see
5. **Security by Default:** Network Policies, Key Vault, NSG from day one
6. **Iterative Delivery:** 8 phases, each adds value independently
7. **YAGNI (You Aren't Gonna Need It):** No service mesh, no multi-region, no over-engineering

**Inspired By:**
- Google SRE Book (monitoring, SLOs, risk management)
- Twelve-Factor App (environment parity, config management)
- AWS Well-Architected Framework (security, cost optimization, reliability)
- Kubernetes Best Practices (Network Policies, resource limits)
- Azure Well-Architected Framework (cloud-specific patterns)

---

## Questions for Implementation

1. **Domain Name:** Do you own `srvthreds.com` or should we register one?
2. **IP Whitelisting:** Office/VPN IP ranges for dev NSG rules?
3. **Multi-Region:** Single region sufficient or need geo-distribution?
4. **Launch Date:** Target production go-live date?
5. **On-Call:** Who will handle production alerts?

**Next Step:** Answer questions above, then begin Phase 1 (Persistent Storage) implementation.
