# Infrastructure Reorganization Plan

## Current State Analysis

### Current Structure
```
infrastructure/
├── clusters/                    # Mixed K8s and Terraform content
│   ├── k8s/                     # Kubernetes manifests (needs moving)
│   ├── terraform/               # Terraform modules (needs moving)
│   ├── scripts/                 # Mixed scripts (needs organizing)
│   └── *.md, *.yml             # Documentation and config
├── dockerCompose/              # Docker Compose for local dev
│   ├── Dockerfile*             # Multiple Dockerfiles
│   └── docker-compose*.yml     # Compose files
├── configs/                    # Environment configs
│   ├── .env.*.example
│   └── containerDeploymentConfig.json
├── scripts/                    # Local scripts
│   └── setup-repl.sh
├── deployment.ts               # Deployment logic
├── deploymentCli.ts           # CLI entry point
└── *.md                       # Documentation
```

### Issues with Current Structure

1. **`clusters/` is confusing**: Mix of K8s, Terraform, and scripts
2. **Unclear separation**: Hard to tell Docker vs K8s vs Terraform
3. **Duplicate documentation**: Multiple READMEs in different places
4. **Scripts scattered**: Some in `clusters/scripts`, some in `scripts/`
5. **Mixed concerns**: Development, staging, production all mixed together

---

## Proposed New Structure

### Organized by Deployment Method

```
infrastructure/
├── README.md                           # Main infrastructure overview
├── ARCHITECTURE.md                     # Overall architecture documentation
│
├── local/                              # LOCAL DOCKER DEVELOPMENT
│   ├── README.md                       # Local development guide
│   ├── compose/                        # Docker Compose files
│   │   ├── docker-compose-db.yml      # Databases only
│   │   ├── docker-compose-services.yml # Application services
│   │   └── .dockerignore              # Docker ignore patterns
│   ├── dockerfiles/                    # All Dockerfiles
│   │   ├── Dockerfile                 # Main service Dockerfile
│   │   ├── Dockerfile.builder         # Builder image
│   │   ├── Dockerfile.cmdRunner       # Command runner
│   │   └── .dockerignore              # Dockerfile-specific ignores
│   ├── scripts/                        # Local development scripts
│   │   ├── setup-repl.sh              # MongoDB replica set setup
│   │   └── validate.sh                # Validation script
│   └── configs/                        # Local environment configs
│       └── .env.local.example         # Local environment template
│
├── kubernetes/                         # KUBERNETES DEPLOYMENT
│   ├── README.md                       # Kubernetes deployment guide
│   ├── base/                          # Base K8s manifests (Kustomize)
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── srvthreds-bootstrap.yaml
│   │   ├── srvthreds-engine.yaml
│   │   ├── srvthreds-session-agent.yaml
│   │   ├── srvthreds-persistence-agent.yaml
│   │   └── rabbitmq.yaml
│   ├── overlays/                      # Environment-specific overlays
│   │   ├── minikube/                  # Local Minikube
│   │   │   ├── kustomization.yaml
│   │   │   ├── configmap-minikube.yaml
│   │   │   └── ingress.yaml
│   │   ├── dev/                       # Cloud development
│   │   │   ├── kustomization.yaml
│   │   │   └── configmap-dev.yaml
│   │   ├── staging/                   # Cloud staging
│   │   │   ├── kustomization.yaml
│   │   │   └── configmap-staging.yaml
│   │   └── prod/                      # Cloud production
│   │       ├── kustomization.yaml
│   │       └── configmap-prod.yaml
│   ├── scripts/                       # K8s deployment scripts
│   │   ├── setup-minikube.sh         # Setup Minikube environment
│   │   ├── deploy-minikube.sh        # Deploy to Minikube
│   │   ├── deploy-cloud.sh           # Deploy to cloud K8s
│   │   └── debug-k8s.sh              # Debug utilities
│   └── configs/                       # K8s environment configs
│       └── .env.k8s.example          # K8s environment template
│
├── terraform/                          # CLOUD INFRASTRUCTURE (IaC)
│   ├── README.md                       # Terraform guide
│   ├── modules/                        # Reusable Terraform modules
│   │   ├── networking/                # VPC, subnets, NAT
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── eks/                       # EKS cluster
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── mongodb-atlas/             # MongoDB Atlas
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── redis-cloud/               # Redis Cloud (future)
│   │   └── rabbitmq-cloud/            # CloudAMQP (future)
│   └── environments/                   # Environment-specific configs
│       ├── dev/                       # Development environment
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   ├── terraform.tfvars
│       │   └── outputs.tf
│       ├── staging/                   # Staging environment
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   ├── terraform.tfvars
│       │   └── outputs.tf
│       └── prod/                      # Production environment
│           ├── main.tf
│           ├── variables.tf
│           ├── terraform.tfvars
│           └── outputs.tf
│
├── deployment/                         # DEPLOYMENT CLI & AUTOMATION
│   ├── README.md                       # Deployment CLI guide
│   ├── cli.ts                         # Main CLI entry point (was deploymentCli.ts)
│   ├── deployment.ts                  # Deployment logic
│   ├── configs/                       # Deployment configurations
│   │   ├── containerDeploymentConfig.json
│   │   └── k8sDeploymentConfig.json   # Future K8s deployment config
│   └── assets/                        # Build-time assets
│       └── .gitkeep
│
└── docs/                              # CONSOLIDATED DOCUMENTATION
    ├── DEPLOYMENT.md                  # Deployment guide (from clusters/)
    ├── CONFIGURATION.md               # Configuration guide
    └── TROUBLESHOOTING.md            # Troubleshooting guide
```

---

## Key Improvements

### 1. **Clear Separation by Purpose**
- `local/` = Docker-based local development
- `kubernetes/` = K8s deployments (Minikube + Cloud)
- `terraform/` = Cloud infrastructure provisioning
- `deployment/` = CLI and automation tools

### 2. **Logical Grouping**
Each top-level folder is self-contained with:
- README explaining its purpose
- Relevant scripts in `scripts/`
- Relevant configs in `configs/`

### 3. **Environment Progression**
Clear path from local → minikube → dev → staging → prod:
- Local: `infrastructure/local/`
- Minikube: `infrastructure/kubernetes/overlays/minikube/`
- Cloud Dev: `infrastructure/kubernetes/overlays/dev/` + `infrastructure/terraform/environments/dev/`
- Cloud Prod: `infrastructure/kubernetes/overlays/prod/` + `infrastructure/terraform/environments/prod/`

### 4. **Eliminates Confusion**
- No more "clusters" folder mixing multiple concerns
- Clear naming: `local/`, `kubernetes/`, `terraform/`
- Scripts organized by what they deploy

---

## Migration Plan

### Phase 1: Create New Structure

```bash
# Create new directory structure
mkdir -p infrastructure/{local,kubernetes,terraform,deployment,docs}
mkdir -p infrastructure/local/{compose,dockerfiles,scripts,configs}
mkdir -p infrastructure/kubernetes/{base,overlays,scripts,configs}
mkdir -p infrastructure/kubernetes/overlays/{minikube,dev,staging,prod}
mkdir -p infrastructure/terraform/{modules,environments}
mkdir -p infrastructure/deployment/{configs,assets}
```

### Phase 2: Move Docker/Local Files

```bash
# Move Docker Compose files
mv infrastructure/dockerCompose/docker-compose-*.yml infrastructure/local/compose/

# Move Dockerfiles
mv infrastructure/dockerCompose/Dockerfile* infrastructure/local/dockerfiles/

# Move local scripts
mv infrastructure/scripts/setup-repl.sh infrastructure/local/scripts/
mv infrastructure/scripts/validationScript.sh infrastructure/local/scripts/validate.sh

# Move local configs
mv infrastructure/configs/.env.local.example infrastructure/local/configs/
mv infrastructure/configs/.env.docker.example infrastructure/local/configs/
```

### Phase 3: Move Kubernetes Files

```bash
# Move base manifests
mv infrastructure/clusters/k8s/base/* infrastructure/kubernetes/base/

# Move dev overlay (becomes minikube + dev)
# We'll split this into minikube (with DBs) and dev (without DBs)
cp -r infrastructure/clusters/k8s/dev infrastructure/kubernetes/overlays/minikube
mv infrastructure/clusters/k8s/dev infrastructure/kubernetes/overlays/dev

# Move prod overlay
mv infrastructure/clusters/k8s/prod infrastructure/kubernetes/overlays/prod

# Move K8s scripts
mv infrastructure/clusters/scripts/deploy-dev.sh infrastructure/kubernetes/scripts/
mv infrastructure/clusters/scripts/deploy-prod.sh infrastructure/kubernetes/scripts/
mv infrastructure/clusters/scripts/debug-mongodb.sh infrastructure/kubernetes/scripts/

# Move K8s configs
mv infrastructure/configs/.env.k8s.example infrastructure/kubernetes/configs/
```

### Phase 4: Move Terraform Files

```bash
# Move Terraform modules
mv infrastructure/clusters/terraform/modules/* infrastructure/terraform/modules/

# Move Terraform environments
mv infrastructure/clusters/terraform/environments/* infrastructure/terraform/environments/
```

### Phase 5: Move Deployment CLI Files

```bash
# Move deployment files
mv infrastructure/deploymentCli.ts infrastructure/deployment/cli.ts
mv infrastructure/deployment.ts infrastructure/deployment/deployment.ts

# Move deployment configs
mv infrastructure/configs/containerDeploymentConfig.json infrastructure/deployment/configs/

# Move deployment assets
mv infrastructure/deploymentAssets infrastructure/deployment/assets
```

### Phase 6: Consolidate Documentation

```bash
# Move documentation
mv infrastructure/clusters/DEPLOYMENT.md infrastructure/docs/
mv infrastructure/CONFIGURATION.md infrastructure/docs/
mv infrastructure/clusters/ARCHITECTURE.md infrastructure/ARCHITECTURE.md

# Create new READMEs for each section
# (Will be created in next step)
```

### Phase 7: Update References

Update file paths in:
1. `infrastructure/deployment/cli.ts` - Update config paths
2. `infrastructure/deployment/configs/containerDeploymentConfig.json` - Update compose file paths
3. `infrastructure/kubernetes/overlays/*/kustomization.yaml` - Update base paths
4. `infrastructure/terraform/environments/*/main.tf` - Update module paths
5. Any npm scripts in `package.json` that reference old paths

### Phase 8: Cleanup

```bash
# Remove old directories
rm -rf infrastructure/dockerCompose
rm -rf infrastructure/clusters
rm -rf infrastructure/configs
rm -rf infrastructure/scripts

# Remove duplicated documentation
# (Keep only consolidated versions)
```

---

## Updated .gitignore

Add to `.gitignore`:
```
# Infrastructure runtime files
infrastructure/deployment/assets/*
!infrastructure/deployment/assets/.gitkeep

# Local environment files
infrastructure/local/configs/.env
infrastructure/kubernetes/configs/.env

# Terraform state
infrastructure/terraform/**/*.tfstate
infrastructure/terraform/**/*.tfstate.backup
infrastructure/terraform/**/.terraform/
infrastructure/terraform/**/.terraform.lock.hcl
```

---

## Benefits Summary

### For Developers
✅ **Clear onboarding**: New developers immediately understand the structure
✅ **Quick navigation**: Easy to find Docker vs K8s vs Terraform files
✅ **Self-documenting**: Folder names clearly indicate purpose

### For Operations
✅ **Environment separation**: Clear distinction between local/minikube/cloud
✅ **Script organization**: Easy to find deployment scripts
✅ **Configuration management**: Configs grouped by deployment method

### For Maintenance
✅ **Logical grouping**: Related files together
✅ **Scalability**: Easy to add new environments or modules
✅ **Reduced confusion**: No more "what does clusters/ mean?"

---

## Next Steps

1. **Review this plan** - Ensure it meets your needs
2. **Execute migration** - Run the migration commands
3. **Update references** - Fix all file path references
4. **Create READMEs** - Add documentation for each section
5. **Test deployments** - Verify everything still works
6. **Update team docs** - Inform team of new structure

Would you like me to proceed with the migration?