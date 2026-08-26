locals {
  secret_names = {
    for svc in var.microservices : svc => "${svc}-${var.environment}"
  }

  # Avoid create attempts for secrets that already exist outside this Terraform state.
  secret_names_to_create = {
    for svc, secret_name in local.secret_names : svc => secret_name
    if !contains(var.existing_secret_names, secret_name)
  }
}

resource "aws_secretsmanager_secret" "microservice_shell" {
  for_each = local.secret_names_to_create

  name                    = each.value
  description             = "Secret shell managed by Terraform (${each.key})"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(
    var.tags,
    {
      Microservice = each.key
    },
  )
}

resource "aws_secretsmanager_secret_version" "microservice_shell" {
  for_each = aws_secretsmanager_secret.microservice_shell

  secret_id     = each.value.id
  secret_string = jsonencode({})
}
