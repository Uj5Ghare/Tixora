variable "cluster_name" {
  type        = string
  description = "EKS cluster name (must exist before this module runs)."
}

variable "aws_region" {
  type        = string
  description = "AWS region for the EKS cluster and aws eks get-token."
}

variable "enable_argocd" {
  type        = bool
  description = "Set false to skip installing the Helm release (keeps state clean for toggling)."
  default     = true
}

variable "argocd_chart_version" {
  type        = string
  description = "argo-cd Helm chart version from https://github.com/argoproj/argo-helm (chart argo-cd)."
  default     = "7.7.16"
}

variable "argocd_namespace" {
  type    = string
  default = "argocd"
}

variable "argocd_release_name" {
  type    = string
  default = "argocd"
}

variable "helm_wait" {
  type        = bool
  description = "Wait for Argo CD pods to become ready (needs schedulable nodes)."
  default     = true
}

variable "helm_timeout_seconds" {
  type        = number
  description = "Helm install/upgrade wait timeout. Argo CD + many workloads + Ingress/ALB provisioning often exceeds 15–20 minutes; use 3600+ for first deploy."
  default     = 3600
}

variable "helm_atomic" {
  type        = bool
  description = "If true, failed installs rollback (Helm atomic). If installs time out while pods are still starting, set false temporarily to avoid uninstalling partial releases while debugging."
  default     = true
}

variable "helm_cleanup_on_fail" {
  type        = bool
  description = "Delete new resources on failed install when not using atomic rollback."
  default     = true
}

variable "use_builtin_helm_values" {
  type        = bool
  description = "When true, merge the module baseline (single-replica defaults) with helm_values_files. When false, only helm_values_files are used (must be non-empty)."
  default     = true
}

variable "helm_values_files" {
  type        = list(string)
  description = "Paths to YAML values files for the argo-cd chart. Use absolute paths or paths relative to the Terraform working directory. Later files override earlier ones (Helm merge). In Terragrunt, pass paths built with get_terragrunt_dir() so files next to terragrunt.hcl resolve correctly."
  default     = []
}

variable "expose_server_via_internet_facing_nlb" {
  type        = bool
  description = "Expose argocd-server with a Kubernetes Service type LoadBalancer (AWS NLB, internet-facing). Mutually exclusive with expose_server_via_ingress."
  default     = false
}

variable "server_load_balancer_source_ranges" {
  type        = list(string)
  description = "Optional CIDR allowlist for clients reaching the NLB. Empty = open to the world (0.0.0.0/0) on the service port—tighten for production."
  default     = []
}

variable "server_load_balancer_extra_annotations" {
  type        = map(string)
  description = "Extra annotations merged onto argocd-server Service (e.g. AWS LB attributes)."
  default     = {}
}

variable "expose_server_via_ingress" {
  type        = bool
  description = "Expose Argo CD via a Kubernetes Ingress (use with an ingress controller, e.g. AWS Load Balancer Controller → ALB). Mutually exclusive with expose_server_via_internet_facing_nlb."
  default     = true
}

variable "ingress_controller" {
  type        = string
  description = "argo-cd chart server.ingress.controller: use \"aws\" for AWS ALB (chart AWS ingress template), \"generic\" for nginx/traefik, \"gke\" for GKE."
  default     = "aws"

  validation {
    condition     = contains(["aws", "generic", "gke"], var.ingress_controller)
    error_message = "ingress_controller must be one of: aws, generic, gke."
  }
}

variable "ingress_class_name" {
  type        = string
  description = "IngressClass name (e.g. alb for AWS Load Balancer Controller). Leave empty to omit (use legacy annotation if your cluster requires it)."
  default     = "alb"
}

variable "ingress_hostname" {
  type        = string
  description = "FQDN for the Argo CD UI (e.g. argocd.preprod.example.com). If empty, the module sets global.domain / server.ingress.hostname to \"<release>.<cluster>.local\" so the AWS Ingress has a host rule and the ALB can be created; override with a real DNS name and point it at the ALB."
  default     = ""
}

variable "ingress_argocd_insecure" {
  type        = bool
  description = "Sets configs.params server.insecure — typically true when the load balancer terminates TLS and speaks HTTP to the pod (common with ALB)."
  default     = true
}

variable "ingress_acm_certificate_arn" {
  type        = string
  description = "ACM certificate ARN in the same region as the ALB. Required when ingress_controller=aws: the argo-cd chart adds a gRPC target group, and AWS only allows gRPC forwards on an HTTPS (HTTP/2) listener. Cert must include ingress_hostname (SAN)."
  default     = ""
}

variable "ingress_extra_annotations" {
  type        = map(string)
  description = "Extra Ingress annotations (merged after defaults for AWS). Add ACM cert ARN, custom health checks, etc."
  default     = {}
}
