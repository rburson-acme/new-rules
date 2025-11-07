# AKS Stack Outputs

output "aks_id" {
  description = "The ID of the AKS cluster"
  value       = module.aks.aks_id
}

output "aks_name" {
  description = "The name of the AKS cluster"
  value       = module.aks.aks_name
}

output "aks_fqdn" {
  description = "The FQDN of the AKS cluster"
  value       = module.aks.aks_fqdn
}

output "aks_private_fqdn" {
  description = "The private FQDN"
  value       = module.aks.aks_private_fqdn
}

output "kube_config" {
  description = "Kubernetes configuration"
  value       = module.aks.kube_config
  sensitive   = true
}

output "kubelet_identity_object_id" {
  description = "Kubelet identity object ID"
  value       = module.aks.kubelet_identity_object_id
}

output "node_resource_group" {
  description = "Node resource group"
  value       = module.aks.node_resource_group
}
