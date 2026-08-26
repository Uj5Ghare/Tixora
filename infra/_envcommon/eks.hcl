locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  project = local.env_vars.locals.project
  env     = local.env_vars.locals.environment
  region  = local.env_vars.locals.aws_region
}

inputs = {
  project                         = local.project
  environment                     = local.env
  region                          = local.region
  cluster_name                    = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.project}-${local.env}"
  kubernetes_version              = local.env_vars.locals.kubernetes_version
  vpc_cidr                        = local.env_vars.locals.vpc_cidr
  eks_addon_versions              = local.env_vars.locals.eks_addon_versions
  primary_workload_instance       = local.env_vars.locals.primary_workload_instance
  workload_label_prefix           = local.env_vars.locals.workload_label_prefix
  addon_tolerations               = local.env_vars.locals.addon_tolerations
  secrets_manager_arns            = local.env_vars.locals.secrets_manager_arns
  microservice_namespaces         = local.env_vars.locals.microservice_namespaces
  tags                            = local.env_vars.locals.tags
  cluster_enabled_log_types       = local.env_vars.locals.cluster_enabled_log_types
  endpoint_public_access_cidrs    = local.env_vars.locals.endpoint_public_access_cidrs
  eks_access_user_arns            = local.env_vars.locals.eks_access_user_arns
  automode_node_classes           = local.env_vars.locals.automode_node_classes
  automode_node_pools             = local.env_vars.locals.automode_node_pools
}
