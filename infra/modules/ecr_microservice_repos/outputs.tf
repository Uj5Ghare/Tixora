output "repository_names_by_namespace" {
  description = "Microservice key -> ECR repository name"
  value       = { for ns, m in module.ecr : ns => m.repository_name }
}

output "repository_urls_by_namespace" {
  description = "Microservice key -> repository URL"
  value       = { for ns, m in module.ecr : ns => m.repository_url }
}
