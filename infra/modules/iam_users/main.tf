locals {
  # Load every JSON file from the policies/ folder — key is filename without extension
  policies = {
    for f in fileset("${path.module}/policies", "*.json") :
    trimsuffix(f, ".json") => file("${path.module}/policies/${f}")
  }

  user_policies = flatten([
    for user_name, user_config in var.users : [
      for policy_name in user_config.policy_names : {
        user_name   = user_name
        policy_name = policy_name
      }
    ]
  ])
}

# Create one IAM user per entry in var.users
resource "aws_iam_user" "this" {
  for_each = var.users

  name = each.key
  path = var.path
  tags = each.value.tags
}

# Create custom policies
resource "aws_iam_policy" "this" {
  for_each = {
    for entry in local.user_policies : "${entry.user_name}-${entry.policy_name}" => entry
  }

  name        = "${each.key}-policy"
  description = "Custom policy ${each.value.policy_name} for ${each.value.user_name}"
  policy      = local.policies[each.value.policy_name]
}

# Attach the policy to the corresponding user
resource "aws_iam_user_policy_attachment" "this" {
  for_each = {
    for entry in local.user_policies : "${entry.user_name}-${entry.policy_name}" => entry
  }

  user       = aws_iam_user.this[each.value.user_name].name
  policy_arn = aws_iam_policy.this[each.key].arn
}

# Create access keys for the users
resource "aws_iam_access_key" "this" {
  for_each = var.users

  user = aws_iam_user.this[each.key].name
}