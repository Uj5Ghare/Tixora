output "secret_names" {
  value       = { for k, s in aws_secretsmanager_secret.microservice_shell : k => s.name }
  description = "Map of microservice id -> Secrets Manager secret name."
}

output "secret_arns" {
  value       = { for k, s in aws_secretsmanager_secret.microservice_shell : k => s.arn }
  description = "Map of microservice id -> Secrets Manager secret ARN."
}
