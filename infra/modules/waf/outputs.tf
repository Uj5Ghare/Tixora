output "arn" {
  description = "WAF Web ACL ARN (CloudFront scope; resource lives in us-east-1)."
  value       = aws_wafv2_web_acl.this.arn
}
