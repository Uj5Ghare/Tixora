data "aws_iam_policy_document" "s3_cloudfront" {
  statement {
    sid    = "AllowCloudFrontOACRead"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${var.s3_bucket_arn}/*",
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [module.cloudfront.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudfront_assets" {
  bucket = var.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_cloudfront.json
}

# OAC + SSE-KMS: allow CloudFront service principal; scope to this distribution ARN.
# Merge into the existing CMK policy (do not replace policy only in the KMS stack or it will drift).
# data.aws_kms_key does not expose policy in AWS provider v6+; fetch it via AWS CLI (plan/apply need aws in PATH).
data "external" "kms_current_policy" {
  program = ["bash", "${path.module}/get_kms_policy.sh"]

  query = {
    key_id = var.kms_key_arn
  }
}

data "aws_iam_policy_document" "kms_cloudfront" {
  source_policy_documents = [data.external.kms_current_policy.result.policy]

  statement {
    sid    = "AllowCloudFrontServicePrincipalForS3Origin"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [module.cloudfront.cloudfront_distribution_arn]
    }
  }
}

resource "aws_kms_key_policy" "cloudfront_oai" {
  key_id = var.kms_key_arn
  policy = data.aws_iam_policy_document.kms_cloudfront.json
}
