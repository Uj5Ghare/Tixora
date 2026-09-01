include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

terraform {
  source = "tfr:///terraform-aws-modules/s3-bucket/aws?version=4.1.2"
}

inputs = {
  bucket = local.env_vars.locals.db_backups_bucket_name

  force_destroy       = false
  object_lock_enabled = true

  versioning = {
    enabled = true
  }

  lifecycle_rule = [
    {
      id     = "expire-old-backups"
      status = "Enabled"
      expiration = {
        days = 30
      }
    }
  ]

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = local.env_vars.locals.tags
}
