include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  sqs_name     = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}-${local.env_vars.locals.sqs_queue_suffixes.main}"
  sqs_dlq_name = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}-${local.env_vars.locals.sqs_queue_suffixes.dlq}"
}

terraform {
  source = "tfr:///terraform-aws-modules/sqs/aws?version=4.2.0"
}

inputs = {
  name       = local.sqs_name
  create_dlq = true
  dlq_name   = local.sqs_dlq_name

  kms_master_key_id       = null
  sqs_managed_sse_enabled = true

  visibility_timeout_seconds     = 300
  dlq_visibility_timeout_seconds = 30

  message_retention_seconds = 1209600

  redrive_policy = {}

  create_dlq_redrive_allow_policy = false

  tags = {
    Project     = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
    Environment = local.env_vars.locals.environment
    ManagedBy   = "terraform"
    Purpose     = local.env_vars.locals.sqs_purpose_tags.main
    Name        = local.sqs_name
  }

  dlq_tags = {
    Purpose = local.env_vars.locals.sqs_purpose_tags.dlq
    Name    = local.sqs_dlq_name
  }
}
