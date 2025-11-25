output "project_id" {
  description = "MongoDB Atlas project ID"
  value       = mongodbatlas_project.main.id
}

output "cluster_id" {
  description = "MongoDB Atlas cluster ID"
  value       = mongodbatlas_cluster.main.cluster_id
}

output "connection_string" {
  description = "MongoDB Atlas connection string"
  value       = "mongodb+srv://${mongodbatlas_database_user.main.username}:${random_password.mongodb_password.result}@${mongodbatlas_cluster.main.connection_strings[0].standard_srv}"
  sensitive   = true
}

output "connection_string_srv" {
  description = "MongoDB Atlas SRV connection string"
  value       = mongodbatlas_cluster.main.connection_strings[0].standard_srv
}

output "database_username" {
  description = "MongoDB database username"
  value       = mongodbatlas_database_user.main.username
}

output "database_password" {
  description = "MongoDB database password"
  value       = random_password.mongodb_password.result
  sensitive   = true
}