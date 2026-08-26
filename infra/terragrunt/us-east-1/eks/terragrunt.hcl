include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "envcommon" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/eks.hcl"
}

locals {
  env_vars   = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  aws_region = local.env_vars.locals.aws_region
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id          = "vpc-00000000000000000"
    private_subnets = ["subnet-00000000000000000", "subnet-00000000000000001", "subnet-00000000000000002"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

dependency "security_groups" {
  config_path = "../security-groups"
  mock_outputs = {
    security_group_id = "sg-00000000000000000"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

dependency "kms" {
  config_path = "../kms"
  mock_outputs = {
    key_arn = "arn:aws:kms:${local.aws_region}:111111111111:key/mock"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/modules/eks_platform"
}

inputs = {
  vpc_id                       = dependency.vpc.outputs.vpc_id
  private_subnet_ids           = dependency.vpc.outputs.private_subnets
  worker_security_group_ids    = [dependency.security_groups.outputs.security_group_id]
  cluster_encryption_key_arn   = dependency.kms.outputs.key_arn
}
