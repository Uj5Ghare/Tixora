# locals block for eks_access_entries remained same
locals {
  eks_access_entries = {
    for index, arn in var.eks_access_user_arns :
    "principal_${index}" => {
      principal_arn = arn
      type          = "STANDARD"
      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  create_kms_key     = false
  name               = var.cluster_name
  kubernetes_version = var.kubernetes_version
  # Public API endpoint is restricted to endpoint_public_access_cidrs (set in infra/terragrunt/env.hcl).
  # Workers stay on private subnets; app traffic uses ALB/Ingress in public subnets, not node public IPs.
  endpoint_public_access       = true
  endpoint_private_access      = true
  endpoint_public_access_cidrs = var.endpoint_public_access_cidrs
  enabled_log_types            = var.cluster_enabled_log_types
  encryption_config = {
    resources        = ["secrets"]
    provider_key_arn = var.cluster_encryption_key_arn
  }
  enable_irsa = true

  # Enables fully managed node autoscaling natively (EKS Auto Mode).
  # In v21.x, storage_config and kubernetes_network_config are derived from
  # compute_config.enabled inside the module and are no longer top-level inputs.
  compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
    # node_role_arn = null
  }

  # Grant the IAM identity that runs Terraform cluster-admin via EKS access entries (API auth).
  # Use the same AWS credentials for kubectl as for terragrunt apply, or add more via access_entries / console.
  enable_cluster_creator_admin_permissions = true
  access_entries                           = local.eks_access_entries

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Ensure control plane can reach node/pod endpoints used by Metrics API.
  # 10251 is metrics-server secure port used by the aggregated Metrics API.
  # Note: ingress rule for 10251 is already included in EKS module's node_security_group_recommended_rules
  # (ingress_cluster_10251_webhook), so we only add the egress rule here.
  security_group_additional_rules = {
    egress_to_nodes_metrics_server_10251 = {
      description                = "Allow EKS control plane to metrics-server endpoint"
      protocol                   = "tcp"
      from_port                  = 10251
      to_port                    = 10251
      type                       = "egress"
      source_node_security_group = true
    }
  }

  # EKS managed node groups are replaced by EKS Auto Mode compute_config above.
  # The cluster now natively manages node scaling and lifecycle.

  # EKS managed add-ons: networking, DNS, IAM pod identity, storage, and metrics.
  # See: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
  addons = {
    vpc-cni = {
      addon_version        = var.eks_addon_versions["vpc_cni"]
      configuration_values = jsonencode({ tolerations = var.addon_tolerations })
    }
    kube-proxy = {
      addon_version = var.eks_addon_versions["kube_proxy"]
    }
    coredns = {
      addon_version        = var.eks_addon_versions["coredns"]
      configuration_values = jsonencode({ tolerations = var.addon_tolerations })
    }

    eks-pod-identity-agent = {
      addon_version        = var.eks_addon_versions["eks_pod_identity_agent"]
      configuration_values = jsonencode({ tolerations = var.addon_tolerations })
    }
    metrics-server = {
      addon_version        = var.eks_addon_versions["metrics_server"]
      configuration_values = jsonencode({ tolerations = var.addon_tolerations })
    }
    # Installs CloudWatch agent + Fluent Bit for Container Insights metrics and logs.
    # IAM permissions are granted via CloudWatchAgentServerPolicy on the node role (see iam_role_additional_policies below).
    # Docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
    amazon-cloudwatch-observability = {
      addon_version = var.eks_addon_versions["amazon_cloudwatch_observability"]
      configuration_values = jsonencode({
        tolerations = var.addon_tolerations
        manager = {
          tolerations = var.addon_tolerations
        }
        agent = {
          config = {
            metrics = {
              metrics_collected = {
                otlp = {}
              }
            }
            logs = {
              metrics_collected = {
                application_signals = {
                  hosted_in = var.cluster_name
                }
              }
            }
            traces = {
              traces_collected = {
                application_signals = {
                  hosted_in = var.cluster_name
                }
                otlp = {}
              }
            }
          }
        }
      })
    }
    # AWS Network Flow Monitor Agent for EKS Container Network Observability
    # Enables service map visualization, flow tables, and network performance metrics
    aws-network-flow-monitoring-agent = {
      addon_version = var.eks_addon_versions["aws_network_flow_monitoring_agent"]
    }
  }

  # IAM permissions for the managed node role used by EKS Auto Mode.
  # These are required by the amazon-cloudwatch-observability addon for metrics and traces.
  node_iam_role_additional_policies = {
    CloudWatchAgentServerPolicy = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
    AWSXRayDaemonWriteAccess    = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
    AmazonSSMManagedInstanceCore  = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" # Recommended for EKS nodes
  }

  tags = var.tags
}

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/containerinsights/${var.cluster_name}/application"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "dataplane" {
  name              = "/aws/containerinsights/${var.cluster_name}/dataplane"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "performance" {
  name              = "/aws/containerinsights/${var.cluster_name}/performance"
  retention_in_days = 14
  tags              = var.tags
}