include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}
dependency "eks" {
  config_path = "../eks"

  mock_outputs = {
    cluster_name      = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
    oidc_provider_arn = "arn:aws:iam::111111111111:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/MOCK"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply", "destroy"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

dependency "vpc" {
  config_path = "../vpc"

  mock_outputs = {
    vpc_id = "vpc-00000000000000000"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

terraform {
  source = "${dirname(find_in_parent_folders("root.hcl"))}/modules/aws_load_balancer_controller_helm"
}

inputs = {
  cluster_name        = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : dependency.eks.outputs.cluster_name
  oidc_provider_arn = dependency.eks.outputs.oidc_provider_arn
  vpc_id            = dependency.vpc.outputs.vpc_id
  aws_region        = local.env_vars.locals.aws_region
  tags              = local.env_vars.locals.tags
  extra_chart_values = {
    tolerations = local.env_vars.locals.addon_tolerations
  }
}
