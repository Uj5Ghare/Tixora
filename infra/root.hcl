locals {
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  project     = local.env_vars.locals.project
  environment = local.env_vars.locals.environment

  # This file lives under infra/; leaf stacks keep region.hcl under e.g. terragrunt/tixora/, which is
  # not an ancestor of infra/, so find_in_parent_folders("region.hcl") cannot work here.
  aws_region = local.env_vars.locals.aws_region
}

remote_state {
  backend = "s3"
  config = {
    bucket       = local.env_vars.locals.tfstate_bucket
    key          = "${path_relative_to_include()}/terraform.tfstate"
    region       = local.env_vars.locals.tfstate_region
    encrypt      = true
    use_lockfile = true
  }
}

generate "backend" {
  path      = "backend.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  backend "s3" {}
}
EOF
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.aws_region}"

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = "${local.environment}"
      Name        = "${local.project}-${local.environment}"
      Project     = "${local.project}"
    }
  }
}
EOF
}
