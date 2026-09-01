locals {
  # EKS CLUSTER CONFS
  project     = "tixora"   #Namespace will depend on project name
  environment = "preprod"
  eks_cluster_name_override = "tixora-preprod"
  endpoint_public_access_cidrs = ["49.50.1.0/24"]
  # Add IAM user/role ARNs here to grant EKS cluster admin access automatically.
  eks_access_user_arns = [
    "arn:aws:iam::<account-id>:user/uj5ghare@gmail.com",
  ]
  tfstate_bucket    = "tixora-iaac-tfstate-preprod"
  tfstate_region    = "us-east-1"
  aws_region        = "us-east-1"
  aws_azs           = ["us-east-1a", "us-east-1b", "us-east-1c"]
  route53_create    = true
  route53_zone_name = "tixora.com"
  route53_record_prefixes = {
    cdn        = "cdn"
    argocd     = "gitops-argocd"
    apis       = "apis"
  }
  vpc_cidr        = "10.40.0.0/16"
  private_subnets = ["10.40.1.0/24", "10.40.2.0/24", "10.40.3.0/24"]
  public_subnets  = ["10.40.101.0/24", "10.40.102.0/24", "10.40.103.0/24"]

  # EKS CLUSTER CONFS (Auto Mode)
  kubernetes_version            = "1.35"
  primary_workload_instance     = "tixora-api"
  workload_label_prefix         = "workload.tixora.io"
  eks_addon_versions = {
    vpc_cni                         = "v1.22.1-eksbuild.2"
    kube_proxy                      = "v1.35.3-eksbuild.11"
    coredns                         = "v1.14.3-eksbuild.2"
    eks_pod_identity_agent          = "v1.3.10-eksbuild.3"
    metrics_server                  = "v0.8.1-eksbuild.6"
    amazon_cloudwatch_observability = "v5.4.0-eksbuild.1"
    aws_network_flow_monitoring_agent = "v1.1.4-eksbuild.1"
  }
  addon_tolerations = [
    {
      key      = "eks.k8s.io/instance"
      operator = "Equal"
      value    = "tixora-api"
      effect   = "NoSchedule"
    },
    {
      key      = "node.kubernetes.io/not-ready"
      operator = "Exists"
      value    = ""
      effect   = "NoSchedule"
    },
  ]
  cluster_enabled_log_types     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # EKS AUTO MODE CUSTOM NODE POOLS & NODE CLASSES
  automode_node_classes = {
    "tixora-api" = {
      subnet_selector_terms = [{
        tags = {
          "kubernetes.io/role/internal-elb" = "1"
        }
      }]
      security_group_selector_terms = [{
        tags = {
          Name = "eks-cluster-sg-*"
        }
      }]
      ephemeral_storage = {
        size = "50Gi"
        iops = 3000
      }
    }
  }

  automode_node_pools = {
    "tixora-api" = {
      node_class_name = "tixora-api"
      labels = {
        "workload.tixora.io/instance" = "tixora-api"
      }
      taints = [{
        key    = "eks.k8s.io/instance"
        value  = "tixora-api"
        effect = "NoSchedule"
      }]
      requirements = [
        { key = "karpenter.sh/capacity-type", operator = "In", values = ["on-demand"] },
        { key = "kubernetes.io/arch", operator = "In", values = ["amd64"] },
        { key = "eks.amazonaws.com/instance-category", operator = "In", values = ["t", "m", "c"] }
      ]
      limits = { cpu = "16", memory = "64Gi" }
    }
  }

  # MICROSERVICES CONFS
  microservice_namespaces = [
    "be-api",
    "be-map",
  ]
  # Add names here when a secret already exists in AWS and must be skipped by Terraform create.
  existing_microservice_secret_shell_names = []
  microservice_secret_shell_names = {
    for svc in local.microservice_namespaces : svc => "${svc}-${local.environment}"
  }
  secrets_manager_arns = []
  sqs_queue_suffixes = {
    main = "meals-autoselection"
    dlq  = "meals-autoselection-dlq"
  }
  sqs_purpose_tags = {
    main = "meals-autoselection"
    dlq  = "meals-autoselection-dlq"
  }

  # IAM USERS CONFS
  iam_users = {
    "tixora-preprod-gh-actions" = {
      policy_names = ["ecr-list-read-write"]
    }
  }

  # ARGOCD CONFS
  # Path to the SSH private key used by ArgoCD to clone the gitops repo.
  # Generate a deploy key on GitHub: Settings -> Deploy keys -> Add deploy key (read-only)
  argocd_repo_url = "git@github.com:Uj5Ghare/Tixora.git"
  argocd_repo_ssh_private_key_path = "~/.ssh/tixora"

  # DOMAIN NAMES CONFS
  argocd_ingress_hostname = "preprod-gitops-argocd.tixora.com"
  cloudfront_custom_domain = "${local.environment}-preprod.tixora.com"
  argocd_route53_zone_name = local.route53_zone_name

  # ACM CERTS ARNS CONFS
  argocd_ingress_acm_certificate_arn = ""
  cloudfront_acm_certificate_arn = ""

  # GLOBAL TAGS CONF
  tags = {
    ManagedBy   = "terraform"
    Environment = local.environment
    Name        = "${local.project}-${local.environment}"
    Project     = local.project
  }
}
