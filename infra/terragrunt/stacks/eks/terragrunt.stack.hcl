# Phase1 Apply : terragrunt stack run apply --filter vpc --filter security-groups --filter kms --filter eks
# After run this cmd to export kubeconfig in local (first download kubeconfig from s3 bucket tixora-iaac-tfstate-preprod):
# aws eks update-kubeconfig --region us-east-1 --name tixora-preprod --kubeconfig ~/.kube/tixora-preprod

# Phase2 Apply : terragrunt stack run apply --filter cloudfront --filter s3-assets (optional: --filter waf)
# Phase3 Apply : terragrunt stack run apply --filter aws-load-balancer-controller --filter argocd --filter argo-rollouts --filter external-secrets --filter helm-apps --filter route53
# You may face issue in plan with external-secrets but still apply the chnages it will work smoothly

unit "vpc" {
  source = "../../us-east-1/vpc"
  path   = "vpc"
}

unit "security-groups" {
  source = "../../us-east-1/security-groups"
  path   = "security-groups"
}

unit "kms" {
  source = "../../us-east-1/kms"
  path   = "kms"
}

unit "eks" {
  source = "../../us-east-1/eks"
  path   = "eks"
}

##First apply above Units and after EKS cluster setup on your local machine run below Units
unit "aws-load-balancer-controller" {
  source = "../../us-east-1/aws-load-balancer-controller"
  path   = "aws-load-balancer-controller"
}

unit "argocd" {
  source = "../../us-east-1/argocd"
  path   = "argocd"
}

unit "helm-apps" {
  source = "../../us-east-1/helm-apps"
  path   = "helm-apps"
}

unit "external-secrets" {
  source = "../../us-east-1/external-secrets"
  path   = "external-secrets"
}

unit "argo-rollouts" {
  source = "../../us-east-1/argo-rollouts"
  path   = "argo-rollouts"
}


unit "s3-assets" {
  source = "../../us-east-1/s3-assets"
  path   = "s3-assets"
}

unit "cloudfront" {
  source = "../../us-east-1/cloudfront"
  path   = "cloudfront"
}

unit "route53" {
  source = "../../us-east-1/route53"
  path   = "route53"
}
