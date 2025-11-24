# NGINX Ingress Controller Stack

This Terraform stack deploys the NGINX Ingress Controller to the AKS cluster using Helm.

## Purpose

The NGINX Ingress Controller provides external access to services running in the AKS cluster, specifically:
- Routes HTTP traffic to port 3000 (REST API)
- Routes WebSocket connections to port 3001
- Handles connection upgrades for WebSocket
- Provides session affinity for WebSocket connections

## Architecture

```
Internet → Application Gateway → NGINX Ingress Controller (LoadBalancer)
                                         ↓
                                   Ingress Resources
                                         ↓
                              srvthreds-session-agent-service
                                    (ports 3000, 3001)
```

## Dependencies

This stack depends on:
- **AKS Stack**: Provides the Kubernetes cluster
- **Networking Stack**: Provides the VNet and subnets

## Configuration

### Development (dev.tfvars)
- Public LoadBalancer (accessible from internet via Application Gateway)
- 2 replicas for high availability
- WebSocket timeout: 3600 seconds (1 hour)
- Metrics enabled

### Production Considerations
- Use internal LoadBalancer for private cluster
- Enable autoscaling (min: 2, max: 10)
- Increase resource limits
- Consider WAF integration at Application Gateway level

## Deployment

### Deploy
```bash
npm run terraformCli -- deploy dev nginx-ingress
```

### Get LoadBalancer IP
```bash
npm run terraformCli -- output dev nginx-ingress
```

The LoadBalancer IP is needed to configure the Application Gateway backend pool.

### Verify Deployment
```bash
# Check Helm release
helm list -n ingress-nginx

# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check LoadBalancer service
kubectl get svc -n ingress-nginx

# Test health endpoint
curl http://<LOADBALANCER_IP>/healthz
```

## Integration with Application Gateway

After deployment, update the Application Gateway backend pool:

1. Get the LoadBalancer IP:
   ```bash
   npm run terraformCli -- output dev nginx-ingress
   ```

2. Update `appgateway/dev.tfvars`:
   ```hcl
   backend_fqdns = ["<NGINX_LOADBALANCER_IP>"]
   ```

3. Redeploy Application Gateway:
   ```bash
   npm run terraformCli -- deploy dev appgateway
   ```

## WebSocket Configuration

The NGINX Ingress Controller is configured with:
- `proxy-read-timeout: 3600` - Keeps WebSocket connections alive
- `proxy-send-timeout: 3600` - Allows long-running operations

These settings work with the Ingress resource annotations in `srvthreds-ingress.yaml`:
- Session affinity (cookie-based)
- Connection upgrade headers
- WebSocket service routing

## Metrics and Monitoring

Prometheus metrics are enabled on the controller. You can access them at:
```bash
kubectl port-forward -n ingress-nginx svc/nginx-ingress-ingress-nginx-controller-metrics 10254:10254
curl http://localhost:10254/metrics
```

## Troubleshooting

### LoadBalancer Stuck in Pending
```bash
# Check events
kubectl get events -n ingress-nginx --sort-by='.lastTimestamp'

# Check service
kubectl describe svc nginx-ingress-ingress-nginx-controller -n ingress-nginx
```

Common causes:
- Azure subscription quota limits
- VNet/subnet configuration issues
- NSG blocking traffic

### Ingress Not Working
```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Check ingress resources
kubectl get ingress -A

# Test direct connection to controller
kubectl port-forward -n ingress-nginx svc/nginx-ingress-ingress-nginx-controller 8080:80
curl http://localhost:8080
```

### WebSocket Connections Failing
- Verify timeout settings in controller config
- Check Ingress resource annotations
- Ensure Application Gateway has WebSocket support enabled
- Test direct connection bypassing Application Gateway

## Cleanup

To remove the NGINX Ingress Controller:
```bash
npm run terraformCli -- destroy dev nginx-ingress
```

**Warning**: This will break external access to your applications.

## Resources

- [NGINX Ingress Controller Documentation](https://kubernetes.github.io/ingress-nginx/)
- [Azure LoadBalancer Service Annotations](https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard)
- [Helm Chart Values](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)
