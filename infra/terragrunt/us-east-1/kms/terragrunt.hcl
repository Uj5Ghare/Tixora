include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  region   = local.env_vars.locals.aws_region
}

terraform {
  source = "tfr:///terraform-aws-modules/kms/aws?version=3.1.0"
}

inputs = {
  description             = "${local.env_vars.locals.project}-${local.env_vars.locals.environment} cluster encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  aliases                 = ["${local.env_vars.locals.project}-${local.env_vars.locals.environment}-platform"]
  tags                    = local.env_vars.locals.tags
}
