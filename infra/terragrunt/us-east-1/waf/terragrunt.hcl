include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir = dirname(find_in_parent_folders("root.hcl"))
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "${local.root_dir}/modules/waf"
}

inputs = {
  name = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
  tags = local.env_vars.locals.tags
}
