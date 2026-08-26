unit "iam" {
  source = "../../us-east-1/iam"
  path   = "iam"
}

unit "waf" {
  source = "../../us-east-1/waf"
  path   = "waf"
}

unit "ecr" {
  source = "../../us-east-1/ecr"
  path   = "ecr"
}

unit "secretsmanager" {
  source = "../../us-east-1/secretsmanager"
  path   = "secretsmanager"
}

unit "sqs" {
  source = "../../us-east-1/sqs"
  path   = "sqs"
}

unit "cloudwatch" {
  source = "../../us-east-1/cloudwatch"
  path   = "cloudwatch"
}

unit "s3-db-backups" {
  source = "../../us-east-1/s3-db-backups"
  path   = "s3-db-backups"
}

unit "s3-apps-builds" {
  source = "../../us-east-1/s3-apps-builds"
  path   = "s3-apps-builds"
}