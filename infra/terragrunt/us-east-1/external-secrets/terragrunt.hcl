include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir    = dirname(find_in_parent_folders("root.hcl"))
  env_vars    = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  external_secrets_values_file = "${local.root_dir}/valuefiles/external-secrets.yaml"
  cluster_name                 = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
}

dependency "eks" {
  config_path = "../eks"
  mock_outputs = {
    oidc_provider_arn = "arn:aws:iam::111111111111:oidc-provider/mock"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "apply", "destroy"]
  mock_outputs_merge_strategy_with_state  = "shallow"
}

dependencies {
  paths = ["../aws-load-balancer-controller"]
}

terraform {
  source = "${local.root_dir}/modules/helm_release_apps"

  before_hook "install_external_secrets_crds" {
    commands = ["apply"]
    execute  = [
      "bash", "-c",
      join(" && ", [
        "aws eks update-kubeconfig --name ${local.cluster_name} --region ${local.env_vars.locals.aws_region}",
        "kubectl apply -f https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/crds/bundle.yaml --server-side",
        "kubectl wait --for condition=established --timeout=60s crd/clustersecretstores.external-secrets.io crd/externalsecrets.external-secrets.io",
      ])
    ]
  }
}

inputs = {
  cluster_name = local.cluster_name
  aws_region   = local.env_vars.locals.aws_region
  charts_root  = "${local.root_dir}/helm"
  auto_discover_namespace = local.env_vars.locals.project

  charts = {
    external-secrets = {
      namespace       = "external-secrets"
      release_name    = "external-secrets"
      repository      = "https://charts.external-secrets.io"
      chart_name      = "external-secrets"
      chart_version   = "0.18.2"
      create_namespace = true
      values_files    = [local.external_secrets_values_file]
      helm_set        = {}
      enabled         = true
      skip_crds       = false
    }
  }

  external_secrets_irsa = {
    enabled           = true
    oidc_provider_arn = dependency.eks.outputs.oidc_provider_arn
  }

  cluster_secret_stores = {
    aws-secrets-manager = {
      name   = "aws-secrets-manager"
      region = local.env_vars.locals.aws_region
      auth = {
        service_account_name      = "external-secrets"
        service_account_namespace = "external-secrets"
      }
      enabled = true
    }
  }
}
