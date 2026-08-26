data "aws_iam_policy_document" "secrets_access" {
  statement {
    sid       = "ReadAppSecrets"
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = var.secrets_manager_arns
  }
}

resource "aws_iam_policy" "secrets_access" {
  count  = length(var.secrets_manager_arns) > 0 ? 1 : 0
  name   = "${var.cluster_name}-secrets-access"
  policy = data.aws_iam_policy_document.secrets_access.json
  tags   = var.tags
}

module "workload_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.51.0"

  for_each = toset(var.microservice_namespaces)

  role_name = "${var.cluster_name}-${each.value}-irsa"

  role_policy_arns = length(var.secrets_manager_arns) > 0 ? {
    secrets = aws_iam_policy.secrets_access[0].arn
  } : {}

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["${each.value}:${each.value}-sa"]
    }
  }

  tags = var.tags
}
