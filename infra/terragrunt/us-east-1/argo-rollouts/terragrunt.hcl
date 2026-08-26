include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir    = dirname(find_in_parent_folders("root.hcl"))
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  argo_rollouts_values_file = "${local.root_dir}/valuefiles/argo-rollouts.yaml"
}

dependency "eks" {
  config_path  = "../eks"
  skip_outputs = true
}

terraform {
  source = "${local.root_dir}/modules/helm_release_apps"
}

inputs = {
  cluster_name            = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
  aws_region              = local.env_vars.locals.aws_region
  charts_root             = "${local.root_dir}/helm"
  auto_discover_namespace = local.env_vars.locals.project

  charts = {
    argo-rollouts = {
      namespace        = "argo-rollouts"
      release_name     = "argo-rollouts"
      repository       = "https://argoproj.github.io/argo-helm"
      chart_name       = "argo-rollouts"
      chart_version    = "2.37.2"
      create_namespace = true
      values_files     = [local.argo_rollouts_values_file]
      helm_set         = {}
      enabled          = true
      skip_crds        = false
    }
  }
}
