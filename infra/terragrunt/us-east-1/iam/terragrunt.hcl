include "root" {
  path   = find_in_parent_folders("root.hcl")
  expose = true
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region   = local.env_vars.locals.aws_region
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/modules/iam_users"
}

inputs = {
  users = {
    for name, config in local.env_vars.locals.iam_users : name => {
      policy_names = config.policy_names
      tags         = local.env_vars.locals.tags
    }
  }
}