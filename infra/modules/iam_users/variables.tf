variable "users" {
  description = "Map of IAM users with their policy role"
  type = map(object({
    policy_names = list(string)   # must match JSON filenames in policies/
    tags         = optional(map(string), {})
  }))
}

variable "path" {
  description = "IAM path prefix"
  type        = string
  default     = "/"
}