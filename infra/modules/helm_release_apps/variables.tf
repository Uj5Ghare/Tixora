variable "cluster_name" {
  type        = string
  description = "EKS cluster name."
}

variable "aws_region" {
  type        = string
  description = "AWS region for aws eks get-token."
}

variable "charts_root" {
  type        = string
  description = "Absolute path to the directory that contains local chart folders (each with Chart.yaml), e.g. .../infra/helm."
}

variable "charts" {
  type = map(object({
    namespace            = string
    chart_directory      = optional(string)
    repository           = optional(string)
    chart_name           = optional(string)
    chart_version        = optional(string)
    release_name         = optional(string)
    create_namespace     = optional(bool, true)
    values_files         = optional(list(string), [])
    helm_set             = optional(map(string), {})
    enabled              = optional(bool, true)
    helm_wait            = optional(bool, true)
    helm_timeout_seconds = optional(number, 900)
    helm_atomic          = optional(bool, true)
    helm_cleanup_on_fail = optional(bool, true)
    skip_crds            = optional(bool, false)
  }))
  description = "Map key = logical app id. Use chart_directory for local charts under charts_root, or set repository + chart_name (+ optional chart_version) for remote charts. Set enabled = false to skip a chart."
  default     = {}
}

variable "auto_discover_local_charts" {
  type        = bool
  description = "When true, automatically discover and install every local chart folder under charts_root that contains Chart.yaml."
  default     = false
}

variable "auto_discover_namespace" {
  type        = string
  description = "Default namespace used for auto-discovered local charts."
}

variable "auto_discover_exclude" {
  type        = set(string)
  description = "Set of local chart directory names under charts_root to exclude from auto-discovery."
  default     = []
}

variable "cluster_secret_stores" {
  type = map(object({
    name    = string
    region  = string
    service = optional(string, "SecretsManager")
    auth = optional(object({
      service_account_name      = optional(string, "external-secrets")
      service_account_namespace = optional(string, "external-secrets")
    }), {})
    enabled = optional(bool, true)
  }))
  default     = {}
  description = "ClusterSecretStore resources to create for External Secrets Operator."
}

variable "argocd_repositories" {
  type = map(object({
    url             = string
    ssh_private_key = string
    namespace       = optional(string, "argocd")
  }))
  default     = {}
  description = "SSH repository credentials to register in ArgoCD as Kubernetes secrets. Key = logical name."
}

variable "external_secrets_irsa" {
  type = object({
    enabled                   = bool
    oidc_provider_arn         = string
    secrets_manager_arns      = optional(list(string))
    service_account_namespace = optional(string, "external-secrets")
    service_account_name      = optional(string, "external-secrets")
  })
  default = {
    enabled           = false
    oidc_provider_arn = ""
  }
  description = "When enabled, creates an IAM role for the External Secrets Operator service account (IRSA) and sets the Helm serviceAccount annotation."
}
