include "root" {
  path = find_in_parent_folders("root.hcl")
}

locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
}

dependency "cloudfront" {
  config_path = "../cloudfront"
  mock_outputs = {
    cloudfront_distribution_domain_name    = "d111111abcdef8.cloudfront.net"
    cloudfront_distribution_hosted_zone_id = "Z2FDTNDATAQYW2"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

dependency "argocd" {
  config_path = "../argocd"
  mock_outputs = {
    ingress_alb_dns_hostname = "k8s-argocd-argocdserver-0000000000.us-east-1.elb.amazonaws.com"
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate", "destroy"]
}

terraform {
  source = "tfr:///terraform-aws-modules/route53/aws//modules/records?version=3.1.0"
}

inputs = {
  create    = local.env_vars.locals.route53_create
  zone_name = local.env_vars.locals.route53_zone_name

  records = concat(
    [
      {
        name = "${local.env_vars.locals.route53_record_prefixes.cdn}"
        type = "A"
        alias = {
          name                   = dependency.cloudfront.outputs.cloudfront_distribution_domain_name
          zone_id                = dependency.cloudfront.outputs.cloudfront_distribution_hosted_zone_id
          evaluate_target_health = false
        }
      }
    ],
    length(trimspace(try(dependency.argocd.outputs.ingress_alb_dns_hostname, ""))) > 0 ? [
      {
        name    = "${local.env_vars.locals.route53_record_prefixes.argocd}"
        type    = "CNAME"
        ttl     = 300
        records = [trimspace(try(dependency.argocd.outputs.ingress_alb_dns_hostname, ""))]
      },
      {
        name    = "${local.env_vars.locals.route53_record_prefixes.apis}"
        type    = "CNAME"
        ttl     = 300
        records = [trimspace(try(dependency.argocd.outputs.ingress_alb_dns_hostname, ""))]
      },
      {
        name    = "${local.env_vars.locals.route53_record_prefixes.map}"
        type    = "CNAME"
        ttl     = 300
        records = [trimspace(try(dependency.argocd.outputs.ingress_alb_dns_hostname, ""))]
      }
    ] : []
  )
}
