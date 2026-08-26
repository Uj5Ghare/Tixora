variable "enabled" {
  type    = bool
  default = true
}

variable "is_ipv6_enabled" {
  type    = bool
  default = true
}

variable "comment" {
  type = string
}

variable "aliases" {
  type    = list(string)
  default = []
}

variable "viewer_certificate" {
  type        = any
  description = "Optional CloudFront viewer_certificate map (e.g. ACM cert in us-east-1 for aliases)."
  default     = null
}

# variable "web_acl_id" {
#   type = string
# }

variable "default_root_object" {
  type    = string
  default = "index.html"
}

variable "wait_for_deployment" {
  type    = bool
  default = false
}

variable "origin" {
  type        = any
  description = "Origin map for terraform-aws-modules/cloudfront (includes S3 regional domain)."
}

variable "default_cache_behavior" {
  type        = any
  description = "Default cache behavior map for terraform-aws-modules/cloudfront."
}

variable "tags" {
  type = map(string)
}

variable "environment" {
  type        = string
  description = "Deployment environment suffix used in naming (for example, preprod or prod)."
}

variable "s3_bucket_id" {
  type        = string
  description = "Assets bucket name (same stack as origin)."
}

variable "s3_bucket_arn" {
  type        = string
  description = "Assets bucket ARN; used in bucket policy resource scope."
}

variable "kms_key_arn" {
  type        = string
  description = "CMK ARN used for SSE-KMS on the assets bucket; OAC + key policy allow CloudFront to decrypt."
}
