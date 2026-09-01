include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

dependency "kms" {
  config_path = "../kms"
  mock_outputs = {
    key_arn = "arn:aws:kms:${local.env_vars.locals.aws_region}:111111111111:key/mock"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

terraform {
  source = "tfr:///terraform-aws-modules/s3-bucket/aws?version=4.1.2"
}

inputs = {
  bucket = "${local.env_vars.locals.project}-assets-${local.env_vars.locals.environment}"

  force_destroy       = false
  object_lock_enabled = true

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        kms_master_key_id = dependency.kms.outputs.key_arn
        sse_algorithm     = "aws:kms"
      }
    }
  }

  tags = local.env_vars.locals.tags
}
