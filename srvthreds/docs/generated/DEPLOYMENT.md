# SrvThreds: Deployment Architecture Guide

## Overview

This document provides comprehensive deployment strategies for the SrvThreds platform, covering containerization, orchestration, environment configurations, and production best practices.

## Deployment Architecture

### Multi-Environment Strategy

```mermaid
graph TB
    subgraph "Development"
        DEV_SINGLE[Single Process Mode]
        DEV_DOCKER[Docker Compose]
    end
    
    subgraph "Staging"
        STAGE_K8S[Kubernetes Cluster]
        STAGE_MONITOR[Monitoring Stack]
    end
    
    subgraph "Production"
        PROD_K8S[Multi-Zone Kubernetes]
        PROD_LB[Load Balancers]
        PROD_DB[Managed Databases]
        PROD_MONITOR[Full Observability]
    end
    
    DEV_SINGLE --> DEV_DOCKER
    DEV_DOCKER --> STAGE_K8S
    STAGE_K8S --> PROD_K8S
```

## Containerization Strategy

### 1. Multi-Stage Docker Build

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/package.json ./
EXPOSE 3001
CMD ["npm", "start"]
```

### 2. Service-Specific Images

```dockerfile
# Engine Service
FROM srvthreds:base AS engine
CMD ["node", "dist-server/index.js"]

# Session Agent
FROM srvthreds:base AS session-agent
CMD ["npm", "run", "start-session-agent"]

# Persistence Agent
FROM srvthreds:base AS persistence-agent
CMD ["npm", "run", "start-persistence-agent"]
```

## Development Deployment

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Application Services
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - MONGODB_URL=mongodb://mongo:27017/srvthreds
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
    depends_on:
      - redis
      - mongo
      - rabbitmq
    volumes:
      - ./src:/app/src
      - ./run-config:/app/run-config
    command: npm run start-dev

  # Infrastructure Services
  redis:
    image: redis:7-alpine
    command: redis-server --save 20 1 --loglevel warning --notify-keyspace-events KA
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Development Tools
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/docker/config/nginx-session:/etc/nginx
      - ./config/docker/config/ssl:/etc/ssl
    depends_on:
      - app

volumes:
  redis_data:
  rabbitmq_data:
  mongo_data:
```

### Development Scripts

```json
// package.json scripts for development
{
  "scripts": {
    "dev:up": "docker-compose up -d",
    "dev:down": "docker-compose down",
    "dev:logs": "docker-compose logs -f app",
    "dev:shell": "docker-compose exec app sh",
    "dev:reset": "docker-compose down -v && docker-compose up -d"
  }
}
```

## Staging Deployment

### Kubernetes Configuration

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: srvthreds-staging
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds-staging
data:
  NODE_ENV: "staging"
  REDIS_URL: "redis://redis-service:6379"
  MONGODB_URL: "mongodb://mongo-service:27017/srvthreds"
  RABBITMQ_URL: "amqp://guest:guest@rabbitmq-service:5672"
```

```yaml
# k8s/engine-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: engine
  namespace: srvthreds-staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: engine
  template:
    metadata:
      labels:
        app: engine
    spec:
      containers:
      - name: engine
        image: srvthreds:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: srvthreds-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: engine-service
  namespace: srvthreds-staging
spec:
  selector:
    app: engine
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

## Production Deployment

### High Availability Kubernetes Setup

```yaml
# k8s/production/engine-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: engine
  namespace: srvthreds-prod
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: engine
  template:
    metadata:
      labels:
        app: engine
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - engine
              topologyKey: kubernetes.io/hostname
      containers:
      - name: engine
        image: srvthreds:v1.2.3
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: MONGODB_URL
          valueFrom:
            secretKeyRef:
              name: mongo-secret
              key: url
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
```

### Horizontal Pod Autoscaler

```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: engine-hpa
  namespace: srvthreds-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: engine
  minReplicas: 3
  maxReplicas: 20
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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## Infrastructure as Code

### Terraform Configuration

```hcl
# terraform/main.tf
provider "kubernetes" {
  config_path = "~/.kube/config"
}

provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }
}

# Redis Cluster
resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  namespace  = "srvthreds-prod"

  values = [
    file("${path.module}/values/redis.yaml")
  ]
}

# MongoDB
resource "helm_release" "mongodb" {
  name       = "mongodb"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "mongodb"
  namespace  = "srvthreds-prod"

  values = [
    file("${path.module}/values/mongodb.yaml")
  ]
}

# RabbitMQ Cluster
resource "helm_release" "rabbitmq" {
  name       = "rabbitmq"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "rabbitmq"
  namespace  = "srvthreds-prod"

  values = [
    file("${path.module}/values/rabbitmq.yaml")
  ]
}
```

### Helm Values

```yaml
# terraform/values/redis.yaml
architecture: replication
auth:
  enabled: true
  password: ${REDIS_PASSWORD}
master:
  persistence:
    enabled: true
    size: 20Gi
  resources:
    requests:
      memory: 2Gi
      cpu: 1000m
    limits:
      memory: 4Gi
      cpu: 2000m
replica:
  replicaCount: 2
  persistence:
    enabled: true
    size: 20Gi
metrics:
  enabled: true
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run test
    - run: npm run build

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ secrets.REGISTRY }}/srvthreds:latest
          ${{ secrets.REGISTRY }}/srvthreds:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to staging
      run: |
        kubectl set image deployment/engine engine=${{ secrets.REGISTRY }}/srvthreds:${{ github.sha }} -n srvthreds-staging
        kubectl rollout status deployment/engine -n srvthreds-staging

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        kubectl set image deployment/engine engine=${{ secrets.REGISTRY }}/srvthreds:${{ github.sha }} -n srvthreds-prod
        kubectl rollout status deployment/engine -n srvthreds-prod
```

## Environment Configuration

### Configuration Management

```typescript
// src/config/environment.ts
export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  redis: {
    url: string;
    cluster?: boolean;
  };
  mongodb: {
    url: string;
    options?: any;
  };
  rabbitmq: {
    url: string;
    options?: any;
  };
  logging: {
    level: string;
    format: string;
  };
}

export const getConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig: EnvironmentConfig = {
    nodeEnv: env,
    port: parseInt(process.env.PORT || '3001'),
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      cluster: process.env.REDIS_CLUSTER === 'true'
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/srvthreds'
    },
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    },
    logging: {
      level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
      format: process.env.LOG_FORMAT || 'json'
    }
  };

  return baseConfig;
};
```

## Monitoring & Observability

### Prometheus Metrics

```yaml
# k8s/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'srvthreds'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "SrvThreds Performance",
    "panels": [
      {
        "title": "Event Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(srvthreds_events_processed_total[5m])"
          }
        ]
      },
      {
        "title": "Active Threds",
        "type": "stat",
        "targets": [
          {
            "expr": "srvthreds_active_threds"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "srvthreds_queue_depth"
          }
        ]
      }
    ]
  }
}
```

## Security Configuration

### Network Policies

```yaml
# k8s/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: srvthreds-network-policy
  namespace: srvthreds-prod
spec:
  podSelector:
    matchLabels:
      app: engine
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app: mongodb
    ports:
    - protocol: TCP
      port: 27017
```

## Backup & Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

# MongoDB backup
mongodump --uri="$MONGODB_URL" --out="/backups/mongodb/$(date +%Y%m%d_%H%M%S)"

# Redis backup
redis-cli --rdb /backups/redis/dump_$(date +%Y%m%d_%H%M%S).rdb

# Upload to cloud storage
aws s3 sync /backups/ s3://srvthreds-backups/$(date +%Y%m%d)/
```

### Disaster Recovery Plan

```yaml
# k8s/backup/cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: srvthreds-backup:latest
            command: ["/scripts/backup.sh"]
            env:
            - name: MONGODB_URL
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: url
          restartPolicy: OnFailure
```

## Best Practices

### 1. Deployment Guidelines

- **Blue-Green Deployments**: Use blue-green strategy for zero-downtime deployments
- **Canary Releases**: Gradually roll out changes to minimize risk
- **Health Checks**: Implement comprehensive health and readiness checks
- **Resource Limits**: Set appropriate resource requests and limits

### 2. Configuration Management

- **Environment Separation**: Maintain strict separation between environments
- **Secret Management**: Use Kubernetes secrets or external secret managers
- **Configuration Validation**: Validate configuration at startup
- **Hot Reloading**: Support configuration updates without restart where possible

### 3. Monitoring & Alerting

- **SLA Monitoring**: Monitor key SLAs and business metrics
- **Error Tracking**: Implement comprehensive error tracking and alerting
- **Performance Monitoring**: Track performance metrics and trends
- **Capacity Planning**: Monitor resource usage for capacity planning

---

*This deployment guide provides comprehensive strategies for deploying SrvThreds across different environments. For specific scaling configurations, refer to the [Scalability Guide](./SCALABILITY.md).*