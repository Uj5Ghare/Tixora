include "root" {
  path = find_in_parent_folders("root.hcl")
}

dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id = "vpc-00000000000000000"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply", "destroy"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "tfr:///terraform-aws-modules/security-group/aws?version=5.2.0"
}

# Merge keeps dependency.* out of the middle of a large inputs map (avoids Terragrunt "unknown variable dependency").
inputs = merge(
  {
    name             = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}-eks-shared"
    use_name_prefix  = false
    description      = "Shared SG for EKS workloads"
    ingress_with_cidr_blocks = [
      {
        rule        = "https-443-tcp"
        cidr_blocks = local.env_vars.locals.vpc_cidr
        description = "Allow in-VPC TLS traffic"
      }
    ]
    egress_rules = ["all-all"]
    tags         = local.env_vars.locals.tags
  },
  {
    vpc_id = dependency.vpc.outputs.vpc_id
  }
)
