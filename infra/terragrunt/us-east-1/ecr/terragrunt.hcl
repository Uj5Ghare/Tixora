include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/modules/ecr_microservice_repos"
}

inputs = {
  microservice_namespaces = local.env_vars.locals.microservice_namespaces
  environment             = local.env_vars.locals.environment

  repository_image_tag_mutability = "MUTABLE"
  repository_force_delete         = false
  repository_lifecycle_policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
  tags = local.env_vars.locals.tags
}
