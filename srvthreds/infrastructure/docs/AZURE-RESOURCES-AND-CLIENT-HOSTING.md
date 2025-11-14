# Azure Resources & Client Application Hosting Strategy

**Last Updated:** 2025-01-13
**Environment:** Dev (CAZ-SRVTHREDS-D-E-RG)
**Purpose:** Document Azure resource changes for production readiness and client app hosting strategy

---

## Current Azure Infrastructure

### Resource Group: CAZ-SRVTHREDS-D-E-RG

**Network Resources:**
```
VNet: CAZ-SRVTHREDS-D-E-NET-VNET (10.0.0.0/16)
├── gateway-subnet (10.0.0.0/24)          - Application Gateway
├── aks-subnet (10.0.4.0/22)              - AKS cluster nodes
├── private-endpoint-subnet (10.0.20.0/24) - Private endpoints
├── data-subnet (10.0.21.0/24)            - Data services
└── support-subnet (10.0.22.0/24)         - Support services

Network Security Groups (NSGs):
├── CAZ-SRVTHREDS-D-E-NET-VNET-gateway-nsg
├── CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg
├── CAZ-SRVTHREDS-D-E-NET-VNET-pe-nsg
├── CAZ-SRVTHREDS-D-E-NET-VNET-data-nsg
└── CAZ-SRVTHREDS-D-E-NET-VNET-support-nsg
```

**Compute & Container Resources:**
- **AKS Cluster:** CAZ-SRVTHREDS-D-E-AKS (currently running workloads)
- **Container Registry:** cazsrvthredsdeacr.azurecr.io (Docker images)

**Data Services:**
- **Cosmos DB:** cazsrvthredsdecosmos (MongoDB API) - *Currently unused, AKS runs own MongoDB*
- **Azure Cache for Redis:** caz-srvthreds-d-e-redis - *Currently unused, AKS runs own Redis*
- **Service Bus:** caz-srvthreds-d-e-sbus - *Currently unused, AKS runs RabbitMQ*

**Security & Secrets:**
- **Key Vault:** CAZ-SRVTHREDS-D-E-KEY (with Private Endpoint)
- **Private DNS Zone:** privatelink.vaultcore.azure.net

**Networking & Gateway:**
- **Application Gateway:** CAZ-SRVTHREDS-D-E-AGW - *Currently provisioned but not configured*
- **Public IP:** CAZ-SRVTHREDS-D-E-AGW-PIP

**Monitoring:**
- **Log Analytics Workspace:** CAZ-SRVTHREDS-D-E-LOG
- **Application Insights:** CAZ-SRVTHREDS-D-E-APPI - *Not yet integrated with apps*

---

## Azure Resources That Need Changes

### Phase 1: Persistent Storage (No Azure Resource Changes)

**What Changes:**
- Kubernetes StorageClasses (created in AKS, not Azure portal)
- PersistentVolumeClaims (created in AKS)
- Azure Managed Disks auto-provisioned via AKS CSI driver

**No Manual Azure Changes Required:**
- AKS has Azure Disk CSI driver pre-installed
- Disks automatically created when PVC is applied
- Disks appear in managed cluster resource group: `MC_CAZ-SRVTHREDS-D-E-RG_CAZ-SRVTHREDS-D-E-AKS_eastus`

**Expected New Resources (Auto-Created):**
```
MC_CAZ-SRVTHREDS-D-E-RG_CAZ-SRVTHREDS-D-E-AKS_eastus/
├── pvc-<uuid>-mongo (10GB Standard_LRS disk)
├── pvc-<uuid>-redis (5GB Standard_LRS disk)
└── pvc-<uuid>-rabbitmq (5GB Standard_LRS disk)
```

### Phase 2: Ingress & Public Access

**Option A: Use Existing Application Gateway (Recommended)**

**Current State:**
- ✅ Application Gateway already provisioned: `CAZ-SRVTHREDS-D-E-AGW`
- ✅ Public IP already exists: `CAZ-SRVTHREDS-D-E-AGW-PIP`
- ✅ Connected to `gateway-subnet` (10.0.0.0/24)
- ❌ Not yet configured with backend pools or routing rules

**Required Changes:**
1. **Configure Application Gateway Backend Pools:**
   ```bash
   # Add AKS Ingress Controller as backend
   az network application-gateway address-pool create \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --gateway-name CAZ-SRVTHREDS-D-E-AGW \
     --name aks-ingress-pool \
     --servers <NGINX_INGRESS_LOADBALANCER_IP>
   ```

2. **Configure HTTP Settings & Health Probes:**
   ```bash
   # HTTP settings for backend
   az network application-gateway http-settings create \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --gateway-name CAZ-SRVTHREDS-D-E-AGW \
     --name aks-http-settings \
     --port 80 \
     --protocol Http \
     --cookie-based-affinity Disabled \
     --timeout 30
   ```

3. **Configure Routing Rules:**
   ```bash
   # Route all traffic to AKS Ingress
   az network application-gateway rule create \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --gateway-name CAZ-SRVTHREDS-D-E-AGW \
     --name aks-routing-rule \
     --http-listener <listener-name> \
     --address-pool aks-ingress-pool \
     --http-settings aks-http-settings
   ```

4. **Enable WAF (Already enabled if using WAF SKU):**
   - Check current SKU: `az network application-gateway show --name CAZ-SRVTHREDS-D-E-AGW`
   - If needed, upgrade to WAF_v2 SKU

**Option B: Use Azure Load Balancer (Simpler, Cheaper)**

**Required Changes:**
1. **Nginx Ingress creates LoadBalancer automatically** when installed
2. **No manual Azure resource changes needed**
3. **NSG rules must allow inbound HTTPS (port 443):**
   ```bash
   az network nsg rule create \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --nsg-name CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg \
     --name allow-https-inbound \
     --priority 100 \
     --source-address-prefixes Internet \
     --destination-port-ranges 443 \
     --access Allow \
     --protocol Tcp
   ```

**Recommendation:** Start with Option B (LoadBalancer), migrate to Option A (Application Gateway) for production.

### Phase 3: Monitoring & Observability

**Application Insights Integration:**

**Current State:**
- ✅ Application Insights already provisioned: `CAZ-SRVTHREDS-D-E-APPI`
- ✅ Log Analytics Workspace exists: `CAZ-SRVTHREDS-D-E-LOG`
- ❌ Not yet integrated with applications

**Required Changes:**
1. **Get Application Insights Connection String:**
   ```bash
   az monitor app-insights component show \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --app CAZ-SRVTHREDS-D-E-APPI \
     --query connectionString -o tsv
   ```

2. **Store in Kubernetes Secret:**
   ```bash
   kubectl create secret generic appinsights-secret \
     --namespace srvthreds \
     --from-literal=connection-string="<CONNECTION_STRING>"
   ```

3. **Update deployments to reference secret** (covered in implementation phase)

**Enable Container Insights on AKS:**
```bash
az aks enable-addons \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --addons monitoring \
  --workspace-resource-id /subscriptions/<SUB_ID>/resourceGroups/CAZ-SRVTHREDS-D-E-RG/providers/Microsoft.OperationalInsights/workspaces/CAZ-SRVTHREDS-D-E-LOG
```

### Phase 4: Security Hardening

**Azure Key Vault Integration:**

**Current State:**
- ✅ Key Vault already provisioned: `CAZ-SRVTHREDS-D-E-KEY`
- ✅ Private Endpoint configured (securely accessible from VNet)
- ❌ Not yet integrated with AKS

**Required Changes:**
1. **Enable AKS Managed Identity access to Key Vault:**
   ```bash
   # Get AKS kubelet identity
   AKS_IDENTITY=$(az aks show -g CAZ-SRVTHREDS-D-E-RG -n CAZ-SRVTHREDS-D-E-AKS \
     --query identityProfile.kubeletidentity.clientId -o tsv)

   # Grant Key Vault access
   az keyvault set-policy \
     --name CAZ-SRVTHREDS-D-E-KEY \
     --object-id $AKS_IDENTITY \
     --secret-permissions get list
   ```

2. **Install Azure Key Vault CSI Driver:**
   ```bash
   helm repo add csi-secrets-store-provider-azure \
     https://azure.github.io/secrets-store-csi-driver-provider-azure/charts

   helm install csi-secrets-store-provider-azure \
     csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
     --namespace kube-system
   ```

3. **Store secrets in Key Vault** (MongoDB connection strings, API keys, etc.)

**NSG Rules for Production:**

**Current NSG Rules:** Need to verify and update
```bash
# Check current AKS NSG rules
az network nsg rule list \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --nsg-name CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg \
  --output table
```

**Required NSG Updates:**
```bash
# Allow HTTPS inbound (if using LoadBalancer)
az network nsg rule create \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --nsg-name CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg \
  --name allow-https-internet \
  --priority 100 \
  --source-address-prefixes Internet \
  --destination-port-ranges 443 \
  --access Allow \
  --protocol Tcp

# Allow HTTP for Let's Encrypt challenges (temporary, for cert issuance)
az network nsg rule create \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --nsg-name CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg \
  --name allow-http-letsencrypt \
  --priority 110 \
  --source-address-prefixes Internet \
  --destination-port-ranges 80 \
  --access Allow \
  --protocol Tcp

# For Dev: Restrict to office IPs (replace Internet with specific CIDR)
# For Prod: Keep Internet source but add WAF in front
```

### Phase 5: DNS Configuration

**Required New Resources:**
1. **Azure DNS Zone** (if using Azure DNS)
   ```bash
   # Create DNS zone
   az network dns zone create \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --name srvthreds.com

   # Add A record for dev
   az network dns record-set a add-record \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --zone-name srvthreds.com \
     --record-set-name dev.api \
     --ipv4-address <LOADBALANCER_PUBLIC_IP>
   ```

**Alternative:** Use external DNS provider (Cloudflare, Route53, etc.)

---

## Decision: Managed Services vs Self-Hosted in AKS

### Current State: **Hybrid (Inefficient)**
You have **both** managed Azure services AND self-hosted services in AKS:

| Service | Managed Azure Resource | AKS Self-Hosted | Currently Used |
|---------|------------------------|-----------------|----------------|
| MongoDB | Cosmos DB (MongoDB API) | mongo-repl-1 pod | **AKS** |
| Redis | Azure Cache for Redis | redis pod | **AKS** |
| Message Queue | Service Bus | rabbitmq pod | **AKS** |

**Cost Impact:**
- Cosmos DB: ~$50-200/month (provisioned but **unused**)
- Azure Cache for Redis: ~$50/month (provisioned but **unused**)
- Service Bus: ~$10/month (provisioned but **unused**)
- **Wasted cost:** ~$110-260/month for idle resources

### Recommendation: **Choose One Approach**

**Option 1: Full Self-Hosted (Current Path) - RECOMMENDED**

**Pros:**
- Lower cost (especially for dev/test)
- More control over configuration
- Portable across clouds
- Already implemented and working

**Cons:**
- Operational burden (backups, monitoring, scaling)
- Single point of failure (mitigated by replica sets)

**Action:**
- ✅ Keep AKS self-hosted MongoDB, Redis, RabbitMQ
- ❌ **Delete unused Cosmos DB, Azure Cache, Service Bus** (saves $110-260/month)
- ✅ Implement proper persistent storage (Phase 1)
- ✅ Set up backups to Azure Blob Storage

**Estimated Cost:**
- Dev: $5/month (storage + small VMs)
- Prod: $50/month (premium storage + larger VMs)
- **Savings:** $110-260/month

**Option 2: Full Managed Services**

**Pros:**
- Zero operational burden
- Automatic backups and HA
- Enterprise SLAs

**Cons:**
- **Much higher cost:** $110-500/month
- Vendor lock-in to Azure
- Less control over configuration

**Action:**
- ❌ Delete AKS MongoDB, Redis, RabbitMQ pods
- ✅ Use existing Cosmos DB, Azure Cache, Service Bus
- ✅ Update application connection strings

**Estimated Cost:**
- Dev: $110/month minimum
- Prod: $500+/month
- **Cost increase:** $110-500/month

**Option 3: Hybrid (Dev Self-Hosted, Prod Managed)**

**Pros:**
- Lower dev costs
- Production managed services

**Cons:**
- **Environment parity violated** (different databases in dev vs prod)
- High risk of environment-specific bugs
- **NOT RECOMMENDED** based on architectural decisions

### **Final Recommendation: Option 1 (Full Self-Hosted)**

**Reasoning:**
1. Already working in AKS
2. Saves $110-260/month (especially important for dev)
3. Maintains environment parity
4. Portable architecture
5. With proper persistent storage and backups, reliability is fine

**Resources to Delete:**
```bash
# Delete unused Cosmos DB (save ~$50-200/month)
az cosmosdb delete \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name cazsrvthredsdecosmos

# Delete unused Azure Cache for Redis (save ~$50/month)
az redis delete \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-redis

# Delete unused Service Bus (save ~$10/month)
az servicebus namespace delete \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name caz-srvthreds-d-e-sbus
```

**⚠️ WARNING:** Verify these resources are truly unused before deleting. Check application connection strings.

---

## Client Application Hosting Strategy

### Question: Can Client Apps Be Hosted in Same Resource Group on Same VNet?

**Answer: YES, Absolutely!** This is actually a best practice for several reasons:

### Architecture: Client Apps in Same VNet

```
Azure VNet: CAZ-SRVTHREDS-D-E-NET-VNET (10.0.0.0/16)
│
├── Gateway Subnet (10.0.0.0/24)
│   └── Application Gateway (public-facing)
│       ├── Frontend: HTTPS (public IP)
│       └── Backend: Routes to Ingress or App Service
│
├── AKS Subnet (10.0.4.0/22)
│   └── SrvThreds Backend Services
│       ├── Session Agent (internal)
│       ├── Engine (internal)
│       ├── Persistence Agent (internal)
│       ├── MongoDB (internal)
│       ├── Redis (internal)
│       └── RabbitMQ (internal)
│
├── Support Subnet (10.0.22.0/24)  ← **CLIENT APPS HERE**
│   ├── Azure App Service (Web App)
│   │   └── React/Vue/Angular client
│   ├── OR: Azure Static Web Apps
│   │   └── Static HTML/JS/CSS
│   ├── OR: Azure Container Instances
│   │   └── Nginx serving client
│   └── Private Link to backend services
│
├── Data Subnet (10.0.21.0/24)
│   └── Reserved for future data services
│
└── Private Endpoint Subnet (10.0.20.0/24)
    └── Private endpoints (Key Vault, etc.)
```

### Benefits of Same VNet Hosting

**1. Private Networking (Massive Security Win)**
```
Public Internet → Application Gateway (WAF) → Client App (support-subnet)
                                                    ↓ (private VNet)
                                              Backend APIs (aks-subnet)
```
- Client app connects to backend via **private IPs** (10.0.x.x)
- No public internet traffic between client and backend
- Reduced attack surface
- Lower latency (no internet hop)

**2. Cost Savings**
- No egress charges for client ↔ backend traffic (same VNet)
- Egress to internet: $0.087/GB
- VNet-internal: **Free**
- For API-heavy client: Save ~$50-200/month

**3. Simplified Network Security**
- NSG rules control client ↔ backend communication
- No need for CORS with public origins (same private network)
- Easy to implement IP whitelisting

**4. Service Discovery**
- Client can use Kubernetes Service DNS (via private DNS zones)
- No hard-coded IPs or public endpoints
- Example: `http://srvthreds-session-agent-service.srvthreds.svc.cluster.local:3000`

**5. Single Deployment Pipeline**
- One resource group for entire stack
- One Terraform/Bicep codebase
- One CI/CD pipeline
- Easier RBAC and cost tracking

### Client Hosting Options in Same VNet

**Option 1: Azure Static Web Apps (Recommended for SPA)**

**Use Case:** React, Vue, Angular single-page applications

**Pros:**
- Cheapest: Free tier available, paid ~$9/month
- Built-in CDN (fast global delivery)
- Automatic HTTPS
- VNet integration available (Premium tier)
- GitHub Actions deployment built-in

**VNet Integration:**
```bash
az staticwebapp update \
  --name srvthreds-client-app \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --vnet CAZ-SRVTHREDS-D-E-NET-VNET \
  --subnet support-subnet
```

**Cost:**
- Free tier: 100GB bandwidth/month (good for dev)
- Standard tier: $9/month + bandwidth (production)

**Option 2: Azure App Service (Web App)**

**Use Case:** Server-side rendering (Next.js, Nuxt.js) or traditional web apps

**Pros:**
- Native VNet integration
- Supports Node.js, Python, .NET
- Easy scaling (1-100+ instances)
- Private networking to backend

**VNet Integration:**
```bash
az webapp vnet-integration add \
  --name srvthreds-client-app \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --vnet CAZ-SRVTHREDS-D-E-NET-VNET \
  --subnet support-subnet
```

**Cost:**
- Basic tier: $13/month (1 instance, good for dev)
- Standard tier: $75/month (autoscaling, production)
- Premium tier: $150+/month (VNet integration, reserved instances)

**Option 3: Azure Container Instances (ACI)**

**Use Case:** Dockerized client app (Nginx serving static files)

**Pros:**
- Use same ACR as backend (consistency)
- VNet integration available
- Pay-per-second billing
- Easy CI/CD (push to ACR, restart ACI)

**VNet Integration:**
```bash
az container create \
  --name srvthreds-client \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --image cazsrvthredsdeacr.azurecr.io/srvthreds-client:latest \
  --vnet CAZ-SRVTHREDS-D-E-NET-VNET \
  --subnet support-subnet \
  --ports 80 443
```

**Cost:**
- ~$30/month (1 vCPU, 1.5GB RAM, always-on)
- Cheaper if app can scale to zero during off-hours

**Option 4: Deploy Client to AKS (Same Cluster)**

**Use Case:** Want everything in Kubernetes (consistency)

**Pros:**
- Same deployment model as backend (Helm, kubectl)
- Same monitoring and logging
- Easy service discovery
- Native VNet integration (already there)

**Cons:**
- Shares AKS resources (need to size appropriately)
- More complex than Static Web Apps

**Implementation:**
```yaml
# infrastructure/cloud/kubernetes/manifests/base/client-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srvthreds-client
  namespace: srvthreds
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: client
        image: cazsrvthredsdeacr.azurecr.io/srvthreds-client:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: srvthreds-client-service
spec:
  selector:
    app: srvthreds-client
  ports:
  - port: 80
    targetPort: 80
```

**Cost:**
- No additional cost (uses existing AKS nodes)
- May need to size AKS nodes larger (+$30-60/month)

### Recommended Client Architecture

**Development:**
```
Azure Static Web Apps (Free Tier)
├── VNet Integration: NO (save cost, use public backend for dev)
└── Backend: Port-forward or public endpoint for dev
```

**Production:**
```
Application Gateway (Public HTTPS)
    ↓
Azure Static Web Apps (Standard Tier, VNet-integrated)
    ↓ (private VNet)
Nginx Ingress (AKS)
    ├── /socket.io → Session Agent
    └── /api → Engine
```

### Network Flow with Client in VNet

**Public User Request:**
```
User Browser (Internet)
    ↓ HTTPS (public IP)
Application Gateway (10.0.0.x) - gateway-subnet
    ↓ (VNet internal)
Static Web App (10.0.22.x) - support-subnet
    ↓ WebSocket/API (VNet internal, NO INTERNET HOP)
Session Agent (10.0.4.x) - aks-subnet
    ↓ (pod-to-pod)
Engine / Persistence Agent
    ↓
MongoDB / Redis
```

**Key Point:** After initial HTML load, all API/WebSocket traffic is **private** (never leaves VNet).

### Configuration: Client Connecting to Backend

**Option A: Private Service Discovery (VNet-Integrated Client)**

```javascript
// Client environment variables (.env.production)
VITE_API_URL=http://srvthreds-session-agent-service.srvthreds.svc.cluster.local:3000
VITE_WS_URL=ws://srvthreds-session-agent-service.srvthreds.svc.cluster.local:3000
```

**Option B: Private Ingress Domain (Recommended)**

```javascript
// Use private DNS zone
VITE_API_URL=https://api-internal.srvthreds.local
VITE_WS_URL=wss://api-internal.srvthreds.local
```

**Option C: Public Endpoint (Less Secure)**

```javascript
// Public endpoint (traffic goes to internet and back)
VITE_API_URL=https://api.srvthreds.com
VITE_WS_URL=wss://api.srvthreds.com
```

### Summary: Client Hosting Decision Matrix

| Hosting Option | VNet Integration | Cost (Dev) | Cost (Prod) | Best For |
|----------------|------------------|------------|-------------|----------|
| Static Web Apps | Premium only | Free | $9/month | SPA (React/Vue) |
| App Service | Yes | $13/month | $75/month | SSR (Next.js) |
| Container Instances | Yes | $30/month | $30/month | Dockerized apps |
| AKS (same cluster) | Native | $0 extra | $0 extra | Kubernetes-native |

**Recommendation for SrvThreds:**
1. **Dev:** Azure Static Web Apps (Free tier, no VNet integration needed)
2. **Prod:** Azure Static Web Apps (Standard tier with VNet integration) OR deploy to AKS

---

## Summary: Azure Resource Changes Needed

### Immediate Changes (Phase 1-2):
- ✅ **No resource creation needed** - Use existing infrastructure
- ⚠️ **NSG rule updates** - Allow HTTPS inbound
- ⚠️ **Delete unused managed services** - Save $110-260/month (Cosmos DB, Redis, Service Bus)
- ✅ **Enable Container Insights** - One CLI command

### Optional Enhancements (Phase 3-5):
- 📋 **Azure DNS Zone** - If using Azure for DNS (~$0.50/month)
- 📋 **Configure Application Gateway** - Use existing resource, just add rules
- 📋 **Key Vault CSI driver** - Install via Helm (no new Azure resources)

### Client App Hosting (New Resource):
- ➕ **Azure Static Web Apps** OR **App Service** in support-subnet (~$9-75/month)
- ✅ **VNet integration** - Use existing VNet (no new network resources)

### Total New Monthly Cost:
- **Minimum:** $0 (use existing resources, delete unused ones, deploy client to AKS)
- **Recommended:** $9/month (Static Web Apps for client)
- **Net Savings:** -$101 to -$251/month (after deleting unused services)

---

## Next Steps

1. **Verify unused resources** - Confirm Cosmos DB, Redis, Service Bus are not used
2. **Delete unused resources** - Save ~$110-260/month
3. **Decide on client hosting** - Static Web Apps vs AKS deployment
4. **Begin Phase 1 implementation** - Persistent storage (no Azure changes needed)

**Question for You:**
1. Are you using Cosmos DB, Azure Cache for Redis, or Service Bus anywhere? (If not, we should delete them)
2. What type of client application do you have? (React SPA, Next.js SSR, static HTML, etc.)
3. Do you already own a domain name or need to register one?
