locals {
  oac_name = "app_assets_${var.environment}"
}

module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "3.4.1"

  enabled             = var.enabled
  is_ipv6_enabled     = var.is_ipv6_enabled
  comment             = var.comment
  aliases             = var.aliases
  viewer_certificate  = var.viewer_certificate
  # web_acl_id          = var.web_acl_id
  default_root_object = var.default_root_object
  wait_for_deployment = var.wait_for_deployment

  # SSE-KMS + CloudFront: use OAC (sigv4). Legacy OAI often causes KMS.UnrecognizedClientException on origin fetch.
  create_origin_access_identity = false
  origin_access_identities      = {}

  create_origin_access_control = true
  origin_access_control = {
    (local.oac_name) = {
      description      = "OAC for S3 assets (required for SSE-KMS with CloudFront)"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origin = {
    for k, v in var.origin :
    k => merge(v, { origin_access_control = local.oac_name })
  }
  default_cache_behavior        = var.default_cache_behavior
  tags                          = var.tags
}
