variable "microservices" {
  type        = list(string)
  description = "Microservice identifiers used to create deterministic Secrets Manager secret shells."
}

variable "environment" {
  type        = string
  description = "Deployment environment name (used in the secret name suffix)."
}

variable "recovery_window_in_days" {
  type        = number
  description = "Secrets Manager scheduled deletion window."
  default     = 30
}

variable "existing_secret_names" {
  type        = set(string)
  description = "Secret names that already exist in AWS and should be skipped by creation logic."
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to each created secret."
  default     = {}
}
