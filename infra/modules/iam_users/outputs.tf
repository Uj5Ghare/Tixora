output "user_arns" {
  description = "ARN map of all created IAM users"
  value = {
    for k, v in aws_iam_user.this : k => v.arn
  }
}

output "policy_arns" {
  description = "ARN map of all created IAM policies"
  value = {
    for k, v in aws_iam_policy.this : k => v.arn
  }
}

output "access_key_ids" {
  description = "Access key IDs for the created users"
  value = {
    for k, v in aws_iam_access_key.this : k => v.id
  }
}

output "secret_access_keys" {
  description = "Secret access keys for the created users"
  value = {
    for k, v in aws_iam_access_key.this : k => nonsensitive(v.secret)
  }
  sensitive = false
}
