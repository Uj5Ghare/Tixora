data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

locals {
  cluster_endpoint = data.aws_eks_cluster.this.endpoint
  cluster_ca       = data.aws_eks_cluster.this.certificate_authority[0].data

  default_chart_values = {
    clusterName       = var.cluster_name
    region            = var.aws_region
    vpcId             = var.vpc_id
    replicaCount      = var.replica_count
    defaultTargetType = "ip"
    serviceAccount = {
      create = true
      name   = var.service_account_name
      annotations = {
        "eks.amazonaws.com/role-arn" = module.irsa.iam_role_arn
      }
    }
  }

  chart_values = merge(local.default_chart_values, var.extra_chart_values)
}

resource "aws_iam_policy" "aws_load_balancer_controller" {
  name_prefix = "${var.cluster_name}-lbc-"
  description = "AWS Load Balancer Controller IAM policy for cluster ${var.cluster_name} (upstream iam_policy.json for matching controller version)."
  policy      = file("${path.module}/iam_policy.json")
  tags        = var.tags
}

module "irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.51.0"

  role_name = "${var.cluster_name}-aws-lb-controller"

  role_policy_arns = {
    main = aws_iam_policy.aws_load_balancer_controller.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["${var.namespace}:${var.service_account_name}"]
    }
  }

  tags = var.tags
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

# Chart: https://github.com/aws/eks-charts/tree/master/stable/aws-load-balancer-controller
resource "helm_release" "aws_load_balancer_controller" {
  name             = var.release_name
  namespace        = var.namespace
  create_namespace = false

  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  version    = var.chart_version

  wait            = var.helm_wait
  timeout         = var.helm_timeout_seconds
  atomic          = var.helm_atomic
  cleanup_on_fail = var.helm_cleanup_on_fail

  values = [yamlencode(local.chart_values)]

  depends_on = [module.irsa]
}
