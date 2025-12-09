output "namespace" {
  description = "Namespace where NGINX Ingress Controller is deployed"
  value       = kubernetes_namespace.ingress_nginx.metadata[0].name
}

output "helm_release_name" {
  description = "Name of the Helm release"
  value       = helm_release.nginx_ingress.name
}

output "helm_release_status" {
  description = "Status of the Helm release"
  value       = helm_release.nginx_ingress.status
}

output "loadbalancer_ip" {
  description = "LoadBalancer IP address for NGINX Ingress Controller"
  value       = try(data.kubernetes_service.nginx_ingress.status[0].load_balancer[0].ingress[0].ip, null)
}

output "loadbalancer_hostname" {
  description = "LoadBalancer hostname for NGINX Ingress Controller"
  value       = try(data.kubernetes_service.nginx_ingress.status[0].load_balancer[0].ingress[0].hostname, null)
}

output "service_name" {
  description = "Name of the NGINX Ingress Controller service"
  value       = data.kubernetes_service.nginx_ingress.metadata[0].name
}

output "ingress_class_name" {
  description = "Ingress class name configured for NGINX"
  value       = "nginx"
}
