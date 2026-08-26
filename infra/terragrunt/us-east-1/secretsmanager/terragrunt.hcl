include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir = dirname(find_in_parent_folders("root.hcl"))
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "${local.root_dir}/modules/microservice_secret_shells"
}

inputs = {
  microservices           = local.env_vars.locals.microservice_namespaces
  environment             = local.env_vars.locals.environment
  recovery_window_in_days = 30
  existing_secret_names   = toset(local.env_vars.locals.existing_microservice_secret_shell_names)
  tags                    = local.env_vars.locals.tags
}
