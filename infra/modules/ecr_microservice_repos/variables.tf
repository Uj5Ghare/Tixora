variable "microservice_namespaces" {
  type        = list(string)
  description = "Microservice / namespace identifiers; each becomes an ECR repo named <name>-<environment>."
}

variable "environment" {
  type        = string
  description = "Environment segment in repository names (e.g. preprod)."
}

variable "repository_image_tag_mutability" {
  type        = string
  description = "MUTABLE or IMMUTABLE."
  default     = "MUTABLE"
}

variable "repository_force_delete" {
  type        = bool
  description = "Allow delete even when images exist."
  default     = false
}

variable "repository_lifecycle_policy" {
  type        = string
  description = "JSON lifecycle policy string."
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Base tags for all repositories."
  default     = {}
}
