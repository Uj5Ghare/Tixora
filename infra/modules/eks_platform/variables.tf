variable "project" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "cluster_name" { type = string }
variable "kubernetes_version" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "worker_security_group_ids" { type = list(string) }
variable "cluster_encryption_key_arn" { type = string }
variable "eks_addon_versions" {
  type        = map(string)
  description = "Map of EKS addon versions."
}
variable "primary_workload_instance" {
  type        = string
  description = "Primary workload identity used in node labels/taints."
}

variable "workload_label_prefix" {
  type        = string
  description = "Domain prefix for the workload Kubernetes node label key (e.g. 'workload.example.io' produces 'workload.example.io/instance')."
}
variable "addon_tolerations" {
  type = list(object({
    key      = string
    operator = string
    value    = string
    effect   = string
  }))
  description = "Tolerations applied to managed EKS add-ons (vpc-cni, coredns, pod-identity, metrics-server)."
}
variable "secrets_manager_arns" {
  type    = list(string)
  default = []
}
variable "microservice_namespaces" {
  type    = list(string)
  default = []
}
variable "karpenter_instance_categories" {
  type    = list(string)
  default = ["t", "m", "c"]
}
variable "karpenter_capacity_types" {
  type    = list(string)
  default = ["on-demand", "spot"]
}
variable "cluster_enabled_log_types" {
  type    = list(string)
  default = ["api", "audit"]
}
variable "endpoint_public_access_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach the EKS Kubernetes API over its public endpoint (e.g. kubectl). Use /32 for a single home/office IP. AWS rejects RFC5737 documentation ranges (e.g. 203.0.113.0/24)."
}
variable "eks_access_user_arns" {
  type        = list(string)
  description = "IAM principal ARNs (users/roles) that should receive EKS cluster admin access via access entries."
  default     = []
}
variable "tags" {
  type = map(string)
}

variable "automode_node_pools" {
  description = "Custom EKS Auto Mode NodePools configuration"
  type = map(object({
    node_class_name = string
    labels          = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    requirements = list(object({
      key        = string
      operator   = string
      values     = list(string)
      min_values = optional(number)
    }))
    limits = optional(map(string))
    disruption = optional(object({
      consolidate_after     = optional(string)
      consolidation_policy  = optional(string)
      budgets               = optional(list(object({ nodes = string })))
    }))
  }))
  default = {}
}

variable "automode_node_classes" {
  description = "Custom EKS Auto Mode NodeClasses configuration"
  type = map(object({
    role_arn                    = optional(string)
    subnet_selector_terms       = list(object({ tags = map(string) }))
    security_group_selector_terms = optional(list(object({ tags = map(string) })))
    ephemeral_storage = optional(object({
      size       = string
      iops       = optional(number)
      throughput = optional(number)
      kms_key_id = optional(string)
    }))
  }))
  default = {}
}
