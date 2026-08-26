include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir    = dirname(find_in_parent_folders("root.hcl"))
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

dependency "eks" {
  config_path = "../eks"

  mock_outputs = {
    cluster_name = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply", "destroy"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

terraform {
  source = "${local.root_dir}/modules/helm_release_apps"
}

inputs = {
  cluster_name = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : dependency.eks.outputs.cluster_name
  aws_region   = local.env_vars.locals.aws_region
  charts_root  = local.root_dir
  auto_discover_local_charts = false
  auto_discover_namespace    = local.env_vars.locals.project
  auto_discover_exclude      = []
  charts                     = {}
}
