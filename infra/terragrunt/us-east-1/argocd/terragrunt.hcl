include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir    = dirname(find_in_parent_folders("root.hcl"))
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  charts_root = "${local.root_dir}/helm"

  argocd_values_file = "${local.root_dir}/valuefiles/argocd-values.yaml"
  ingress_hostname   = local.env_vars.locals.argocd_ingress_hostname

  argocd_repo_ssh_key = fileexists(pathexpand(local.env_vars.locals.argocd_repo_ssh_private_key_path)) ? file(pathexpand(local.env_vars.locals.argocd_repo_ssh_private_key_path)) : ""

  argocd_helm_set = merge(
    {
      "global.domain"                                = local.ingress_hostname
      "server.service.type"                          = "ClusterIP"
      "server.ingress.enabled"                       = "true"
      "server.ingress.controller"                    = "aws"
      "server.ingress.ingressClassName"              = "alb"
      "server.ingress.hostname"                      = local.ingress_hostname
      "configs.params.server\\.insecure"             = "true"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/scheme"           = "internet-facing"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/group\\.name"     = "shared-lb"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/load-balancer-name" = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/target-type"      = "ip"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/healthcheck-path" = "/healthz"
    },
    trimspace(local.env_vars.locals.argocd_ingress_acm_certificate_arn) != "" ? {
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/ssl-redirect"    = "443"
      "server.ingress.annotations.alb\\.ingress\\.kubernetes\\.io/certificate-arn" = local.env_vars.locals.argocd_ingress_acm_certificate_arn
    } : {},
  )
}

# Apply after EKS: nodes and CoreDNS must be ready so Helm can schedule Argo CD.
dependency "eks" {
  config_path = "../eks"

  mock_outputs = {
    cluster_name = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply", "destroy"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

# Ingress (ALB) for Argo CD requires the controller to exist first.
dependency "aws_load_balancer_controller" {
  config_path = "../aws-load-balancer-controller"

  mock_outputs = {
    iam_role_arn       = "arn:aws:iam::111111111111:role/tixora-aws-lb-controller"
    helm_release_name  = "aws-load-balancer-controller"
    ingress_class_name = "alb"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "apply"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

terraform {
  source = "${local.root_dir}/modules/helm_release_apps"
}

inputs = {
  cluster_name = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : dependency.eks.outputs.cluster_name
  aws_region   = local.env_vars.locals.aws_region
  charts_root  = local.charts_root
  auto_discover_namespace = local.env_vars.locals.project

  charts = {
    argocd = {
      namespace         = "argocd"
      release_name      = "argocd"
      repository        = "https://argoproj.github.io/argo-helm"
      chart_name        = "argo-cd"
      chart_version     = "7.7.16"
      create_namespace  = true
      values_files      = [local.argocd_values_file]
      helm_set          = local.argocd_helm_set
      enabled           = true
      helm_wait         = true
      helm_timeout_seconds = 3600
      helm_atomic       = true
      helm_cleanup_on_fail = true
    }
  }

  argocd_repositories = local.argocd_repo_ssh_key != "" ? {
    gitops = {
      url             = local.env_vars.locals.argocd_repo_url
      ssh_private_key = local.argocd_repo_ssh_key
      namespace       = "argocd"
    }
  } : {}
}
