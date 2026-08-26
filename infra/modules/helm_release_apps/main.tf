data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

data "aws_caller_identity" "current" {}

locals {
  cluster_endpoint = data.aws_eks_cluster.this.endpoint
  cluster_ca       = data.aws_eks_cluster.this.certificate_authority[0].data
  discovered_chart_dirs = toset([
    for p in fileset(var.charts_root, "*/Chart.yaml") : dirname(p)
  ])
  auto_discovered_charts = var.auto_discover_local_charts ? {
    for chart_dir in local.discovered_chart_dirs : chart_dir => {
      namespace            = var.auto_discover_namespace
      chart_directory      = chart_dir
      release_name         = chart_dir
      create_namespace     = true
      values_files         = []
      helm_set             = {}
      enabled              = !contains(var.auto_discover_exclude, chart_dir)
      helm_wait            = true
      helm_timeout_seconds = 900
      helm_atomic          = true
      helm_cleanup_on_fail = true
      skip_crds            = false
    }
  } : {}
  charts_effective = merge(local.auto_discovered_charts, var.charts)
  charts_enabled   = { for k, v in local.charts_effective : k => v if v.enabled }
  cluster_secret_stores_enabled = {
    for k, v in var.cluster_secret_stores : k => v if v.enabled
  }
}

check "external_secrets_irsa_oidc" {
  assert {
    condition = !var.external_secrets_irsa.enabled || (
      var.external_secrets_irsa.enabled && length(trimspace(var.external_secrets_irsa.oidc_provider_arn)) > 0
    )
    error_message = "When external_secrets_irsa.enabled is true, oidc_provider_arn must be set to the cluster OIDC provider ARN."
  }
}

data "aws_iam_policy_document" "external_secrets_secretsmanager" {
  count = var.external_secrets_irsa.enabled ? 1 : 0

  statement {
    sid     = "SecretsManagerRead"
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = coalesce(
      var.external_secrets_irsa.secrets_manager_arns,
      ["arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:*"]
    )
  }
}

resource "aws_iam_policy" "external_secrets_secretsmanager" {
  count = var.external_secrets_irsa.enabled ? 1 : 0

  name_prefix = "${var.cluster_name}-eso-sm-"
  policy      = data.aws_iam_policy_document.external_secrets_secretsmanager[0].json
}

module "external_secrets_irsa" {
  count = var.external_secrets_irsa.enabled ? 1 : 0

  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.51.0"

  role_name = "${var.cluster_name}-external-secrets"

  role_policy_arns = {
    secrets = aws_iam_policy.external_secrets_secretsmanager[0].arn
  }

  oidc_providers = {
    main = {
      provider_arn = var.external_secrets_irsa.oidc_provider_arn
      namespace_service_accounts = [
        "${var.external_secrets_irsa.service_account_namespace}:${var.external_secrets_irsa.service_account_name}"
      ]
    }
  }
}

check "chart_source_valid" {
  assert {
    condition = alltrue([
      for _, v in local.charts_enabled :
      ((try(v.chart_directory, null) != null && trimspace(try(v.chart_directory, "")) != "") ||
      (try(v.chart_name, null) != null && trimspace(try(v.chart_name, "")) != ""))
    ])
    error_message = "Each enabled chart must set either chart_directory (local chart) or chart_name (remote chart)."
  }
}

provider "helm" {
  kubernetes {
    host                   = local.cluster_endpoint
    cluster_ca_certificate = base64decode(local.cluster_ca)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks", "get-token",
        "--cluster-name", var.cluster_name,
        "--region", var.aws_region,
      ]
    }
  }
}

provider "kubernetes" {
  host                   = local.cluster_endpoint
  cluster_ca_certificate = base64decode(local.cluster_ca)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks", "get-token",
      "--cluster-name", var.cluster_name,
      "--region", var.aws_region,
    ]
  }
}

resource "helm_release" "app" {
  for_each = local.charts_enabled

  name             = coalesce(each.value.release_name, each.key)
  namespace        = each.value.namespace
  create_namespace = each.value.create_namespace

  repository = try(each.value.repository, null)
  chart      = try(each.value.chart_name, null) != null ? each.value.chart_name : "${var.charts_root}/${each.value.chart_directory}"
  version    = try(each.value.chart_version, null)

  wait            = each.value.helm_wait
  timeout         = each.value.helm_timeout_seconds
  atomic          = each.value.helm_atomic
  cleanup_on_fail = each.value.helm_cleanup_on_fail
  skip_crds       = each.value.skip_crds

  values = [for p in each.value.values_files : file(p)]

  dynamic "set" {
    for_each = merge(
      each.value.helm_set,
      each.key == "external-secrets" && var.external_secrets_irsa.enabled ? {
        "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn" = module.external_secrets_irsa[0].iam_role_arn
      } : {}
    )
    content {
      name  = set.key
      value = set.value
    }
  }

  depends_on = [module.external_secrets_irsa]
}

resource "kubernetes_secret" "argocd_repo" {
  for_each = var.argocd_repositories

  metadata {
    name      = "repo-${each.key}"
    namespace = each.value.namespace
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    type          = "git"
    url           = each.value.url
    sshPrivateKey = each.value.ssh_private_key
  }

  depends_on = [helm_release.app]
}

resource "kubernetes_manifest" "cluster_secret_store" {
  for_each = local.cluster_secret_stores_enabled

  manifest = {
    apiVersion = "external-secrets.io/v1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = each.value.name
    }
    spec = {
      provider = {
        aws = {
          service = each.value.service
          region  = each.value.region
          auth = {
            jwt = {
              serviceAccountRef = {
                name      = try(each.value.auth.service_account_name, "external-secrets")
                namespace = try(each.value.auth.service_account_namespace, "external-secrets")
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.app]
}

data "kubernetes_ingress_v1" "argocd_server" {
  count = contains(keys(local.charts_enabled), "argocd") ? 1 : 0

  metadata {
    name      = "${coalesce(try(local.charts_enabled["argocd"].release_name, null), "argocd")}-server"
    namespace = local.charts_enabled["argocd"].namespace
  }

  depends_on = [helm_release.app]
}
