variable "cluster_name" {
  type        = string
  description = "EKS cluster name (cluster must exist; nodes should be schedulable before Helm install)."
}

variable "aws_region" {
  type        = string
  description = "AWS region for the cluster and aws eks get-token."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the cluster runs (required for controller AWS API calls)."
}

variable "oidc_provider_arn" {
  type        = string
  description = "EKS OIDC provider ARN for IRSA (same as module.eks.oidc_provider_arn from terraform-aws-modules/eks)."
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace for the controller (typically kube-system)."
  default     = "kube-system"
}

variable "release_name" {
  type        = string
  description = "Helm release name."
  default     = "aws-load-balancer-controller"
}

variable "service_account_name" {
  type        = string
  description = "Service account name; must match IRSA trust (namespace:serviceaccount)."
  default     = "aws-load-balancer-controller"
}

variable "chart_version" {
  type        = string
  description = "eks/aws-load-balancer-controller chart version (app version should match iam_policy.json upstream release)."
  default     = "3.2.1"
}

variable "replica_count" {
  type        = number
  description = "Controller Deployment replicas (1 is enough for small clusters)."
  default     = 1
}

variable "helm_wait" {
  type        = bool
  description = "Wait for workload to become ready."
  default     = true
}

variable "helm_timeout_seconds" {
  type        = number
  description = "Helm install/upgrade timeout."
  default     = 900
}

variable "helm_atomic" {
  type        = bool
  description = "Helm atomic installs (rollback on failure)."
  default     = true
}

variable "helm_cleanup_on_fail" {
  type    = bool
  default = true
}

variable "tags" {
  type        = map(string)
  description = "Tags for IAM policy and IRSA role."
  default     = {}
}

variable "extra_chart_values" {
  type        = map(any)
  description = "Additional top-level Helm values merged into the module defaults (e.g. resources, nodeSelector)."
  default     = {}
}
