data "aws_eks_cluster" "this" {
  name = var.cluster_name
}

locals {
  cluster_endpoint = data.aws_eks_cluster.this.endpoint
  cluster_ca       = data.aws_eks_cluster.this.certificate_authority[0].data

  builtin_helm_values = var.use_builtin_helm_values ? [yamlencode({
    server = {
      replicas = 1
    }
    controller = {
      replicas = 1
    }
    repoServer = {
      replicas = 1
    }
  })] : []

  server_service_public = merge(
    {
      type = "LoadBalancer"
      annotations = merge(
        {
          "service.beta.kubernetes.io/aws-load-balancer-type"                              = "external"
          "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type"                   = "ip"
          "service.beta.kubernetes.io/aws-load-balancer-scheme"                            = "internet-facing"
          "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
        },
        var.server_load_balancer_extra_annotations,
      )
    },
    length(var.server_load_balancer_source_ranges) > 0 ? { loadBalancerSourceRanges = var.server_load_balancer_source_ranges } : {},
  )

  public_server_helm_values = var.expose_server_via_internet_facing_nlb ? [yamlencode({
    server = {
      service = local.server_service_public
    }
  })] : []

  # Do not set alb.ingress.kubernetes.io/success-codes here: argo-cd's AWS Ingress registers
  # both gRPC and HTTP target groups; "200" is valid for HTTP but invalid for gRPC (must be 0–99).
  # Omitting it lets the AWS LB Controller pick protocol-appropriate matchers (see ELB ValidationError on CreateTargetGroup).
  #
  # gRPC target groups require an HTTPS listener (HTTP/2). HTTP-only listeners fail with:
  # InvalidLoadBalancerAction: Listener protocol 'HTTP' is not supported with a target group with the protocol-version 'GRPC'
  ingress_acm_arn_effective = trimspace(var.ingress_acm_certificate_arn) != "" ? trimspace(var.ingress_acm_certificate_arn) : trimspace(lookup(var.ingress_extra_annotations, "alb.ingress.kubernetes.io/certificate-arn", ""))

  aws_alb_https_annotations = var.ingress_controller == "aws" && local.ingress_acm_arn_effective != "" ? {
    "alb.ingress.kubernetes.io/listen-ports"    = jsonencode([{ HTTP = 80 }, { HTTPS = 443 }])
    "alb.ingress.kubernetes.io/ssl-redirect"    = "443"
    "alb.ingress.kubernetes.io/certificate-arn" = local.ingress_acm_arn_effective
  } : {}

  aws_ingress_annotation_defaults = merge(
    {
      "alb.ingress.kubernetes.io/scheme"           = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"      = "ip"
      "alb.ingress.kubernetes.io/healthcheck-path" = "/healthz"
    },
    local.aws_alb_https_annotations,
  )

  # Chart AWS Ingress template: rules[].host = server.ingress.hostname | default global.domain — both empty leaves host blank
  # and the AWS Load Balancer Controller often never creates an ALB (no ADDRESS on Ingress, nothing under EC2 → Load Balancers).
  ingress_domain = trimspace(var.ingress_hostname) != "" ? trimspace(var.ingress_hostname) : "${var.argocd_release_name}.${replace(var.cluster_name, "_", "-")}.local"

  ingress_annotations = merge(
    var.ingress_controller == "aws" ? local.aws_ingress_annotation_defaults : {},
    var.ingress_controller == "aws" && var.ingress_argocd_insecure ? { "alb.ingress.kubernetes.io/backend-protocol" = "HTTP" } : {},
    var.ingress_extra_annotations,
  )

  ingress_overlay_map = merge(
    {
      global = {
        domain = local.ingress_domain
      }
    },
    {
      configs = {
        params = {
          "server.insecure" = var.ingress_argocd_insecure ? "true" : "false"
        }
      }
      server = {
        service = { type = "ClusterIP" }
        ingress = merge(
          {
            enabled     = true
            controller  = var.ingress_controller
            annotations = local.ingress_annotations
            hostname    = local.ingress_domain
          },
          var.ingress_class_name != "" ? { ingressClassName = var.ingress_class_name } : {},
        )
      }
    },
  )

  ingress_server_helm_values = var.expose_server_via_ingress ? [yamlencode(local.ingress_overlay_map)] : []

  # Baseline → your files → optional NLB **or** Ingress overlay (mutually exclusive).
  helm_values_layers = concat(
    local.builtin_helm_values,
    [for p in var.helm_values_files : file(p)],
    local.public_server_helm_values,
    local.ingress_server_helm_values,
  )
}

check "helm_values_nonempty" {
  assert {
    condition     = length(local.helm_values_layers) > 0
    error_message = "Argo CD Helm values: set use_builtin_helm_values = true and/or provide at least one helm_values_files entry."
  }
}

check "ingress_or_nlb_not_both" {
  assert {
    condition     = !(var.expose_server_via_ingress && var.expose_server_via_internet_facing_nlb)
    error_message = "Choose either expose_server_via_ingress or expose_server_via_internet_facing_nlb, not both."
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

# Official chart: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
resource "helm_release" "argocd" {
  count = var.enable_argocd ? 1 : 0

  name             = var.argocd_release_name
  namespace        = var.argocd_namespace
  create_namespace = true

  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = var.argocd_chart_version

  wait            = var.helm_wait
  timeout         = var.helm_timeout_seconds
  atomic          = var.helm_atomic
  cleanup_on_fail = var.helm_cleanup_on_fail

  values = local.helm_values_layers
}

# Read ALB hostname after the Ingress is reconciled (for Route53 CNAME/alias in a separate stack).
data "kubernetes_ingress_v1" "argocd_server" {
  count = var.enable_argocd && var.expose_server_via_ingress ? 1 : 0

  metadata {
    name      = "${var.argocd_release_name}-server"
    namespace = var.argocd_namespace
  }

  depends_on = [helm_release.argocd]
}
