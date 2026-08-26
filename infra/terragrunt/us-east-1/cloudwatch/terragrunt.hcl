include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  # Must match ../sqs/ main queue name. Terragrunt does not support dependency.* inside nested input maps (e.g. dimensions).
  meals_sqs_queue_name = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}-${local.env_vars.locals.sqs_queue_suffixes.main}"

  eks_cluster_name = length(local.env_vars.locals.eks_cluster_name_override) > 0 ? local.env_vars.locals.eks_cluster_name_override : "${local.env_vars.locals.project}-${local.env_vars.locals.environment}"
}

# Ensure SQS exists before this stack; no outputs required here.
dependencies {
  paths = ["../sqs"]
}

terraform {
  source = "tfr:///terraform-aws-modules/cloudwatch/aws//modules/metric-alarm?version=5.5.0"
}

inputs = {
  alarm_name          = "${local.env_vars.locals.project}-${local.env_vars.locals.environment}-sqs-backlog"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 100
  period              = 300
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Average"
  dimensions = {
    QueueName = local.meals_sqs_queue_name
  }
  alarm_description = "SQS backlog alarm for ${local.eks_cluster_name}"
}
