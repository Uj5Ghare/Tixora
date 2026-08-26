include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  root_dir = dirname(find_in_parent_folders("root.hcl"))
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  app_assets_origin_id = "app_assets_${local.env_vars.locals.environment}"
}

dependency "kms" {
  config_path = "../kms"
  mock_outputs = {
    # Placeholder ARN — real value comes from kms module output at apply time.
    key_arn = "arn:aws:kms:us-east-1:111111111111:key/00000000-0000-0000-0000-000000000000"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

dependency "s3_assets" {
  config_path = "../s3-assets"
  mock_outputs = {
    s3_bucket_id                          = "mock-assets-bucket"
    s3_bucket_arn                         = "arn:aws:s3:::mock-assets-bucket"
    s3_bucket_bucket_regional_domain_name = "mock-assets-bucket.s3.${local.env_vars.locals.aws_region}.amazonaws.com"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

# dependency "waf" {
#   config_path = "../waf"
#   mock_outputs = {
#     arn = "arn:aws:wafv2:us-east-1:111111111111:global/webacl/mock/mock"
#   }
#   mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
# }

terraform {
  source = "${local.root_dir}/modules/cloudfront_assets"
}

inputs = {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront for ${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
  aliases = local.env_vars.locals.cloudfront_acm_certificate_arn != "" ? [local.env_vars.locals.cloudfront_custom_domain] : []
  viewer_certificate = local.env_vars.locals.cloudfront_acm_certificate_arn != "" ? {
    acm_certificate_arn      = local.env_vars.locals.cloudfront_acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  } : null
  # web_acl_id          = dependency.waf.outputs.arn
  default_root_object = "index.html"
  wait_for_deployment = false
  environment         = local.env_vars.locals.environment

  # OAC (not OAI): required for S3 SSE-KMS behind CloudFront — see cloudfront_assets module.
  origin = {
    (local.app_assets_origin_id) = {
      domain_name             = dependency.s3_assets.outputs.s3_bucket_bucket_regional_domain_name
    }
  }

  default_cache_behavior = {
    target_origin_id       = local.app_assets_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    query_string           = false
  }

  tags = local.env_vars.locals.tags

  s3_bucket_id  = dependency.s3_assets.outputs.s3_bucket_id
  s3_bucket_arn = dependency.s3_assets.outputs.s3_bucket_arn
  kms_key_arn   = dependency.kms.outputs.key_arn
}
