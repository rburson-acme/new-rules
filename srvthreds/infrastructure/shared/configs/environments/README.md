# Environment-Specific Configuration Overrides

This directory is reserved for environment-specific configuration overrides that will be used when deploying to different environments beyond local development and minikube.

## Purpose

While the `deployments/*.json` files contain base configurations and inline `environmentOverrides`, this directory is for **cloud-specific environments** that need more extensive customization:

- **dev.json** - Cloud development environment
- **staging.json** - Cloud staging environment
- **prod.json** - Cloud production environment

## Current Status

Currently, all environment overrides are defined inline within the deployment configs under `target.environmentOverrides`. This works well for:
- `local` - Local Docker Compose development
- `minikube` - Local Kubernetes testing

## When to Use Environment Files

Consider creating environment-specific files here when:

1. **Multiple deployments** share the same environment-specific settings
2. **Complex overrides** make inline definitions too large
3. **Cloud-specific** configurations diverge significantly from local
4. **Terraform integration** requires structured environment configs

## Example Structure (Future)

```json
{
  "name": "production",
  "description": "Production environment on AWS EKS",
  "overrides": {
    "imageRegistry": "123456789.dkr.ecr.us-west-2.amazonaws.com/srvthreds",
    "imageTag": "${VERSION}",
    "resources": {
      "engine": {
        "replicas": 3,
        "memory": {
          "request": "512Mi",
          "limit": "1Gi"
        },
        "cpu": {
          "request": "500m",
          "limit": "1000m"
        }
      }
    },
    "secrets": {
      "provider": "aws-secrets-manager",
      "secretNames": {
        "mongodb": "srvthreds/prod/mongodb",
        "redis": "srvthreds/prod/redis"
      }
    },
    "monitoring": {
      "enabled": true,
      "prometheus": true,
      "grafana": true
    }
  }
}
```

## Integration with Terraform

These environment files can be consumed by Terraform modules to generate:
- Kubernetes manifests with correct resource limits
- Secret references
- Service mesh configurations
- Autoscaling policies

## Migration Path

**Phase 1** (Current): Inline `environmentOverrides` in deployment configs
**Phase 2** (Future): Extract common cloud overrides to this directory
**Phase 3** (Cloud Ready): Terraform reads these files to generate infrastructure

## Best Practices

1. **Keep local simple**: Local/minikube configs should remain inline for quick iteration
2. **Cloud in files**: Move cloud-specific configs here as they grow complex
3. **Version control**: Always commit environment files to track changes
4. **Secrets separately**: Never commit actual secrets; reference secret management systems
5. **Documentation**: Document environment-specific quirks and requirements

## See Also

- [Configuration Strategy](../../../CONFIGURATION-STRATEGY.md) - Overall config approach
- [Infrastructure Roadmap](../../../INFRASTRUCTURE-ROADMAP.md) - Cloud deployment plans
- [Deployment Configs](../deployments/README.md) - Base deployment definitions
