output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_oidc_issuer_url" {
  value = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}

output "cluster_id" {
  value = module.eks.cluster_id
}

output "node_iam_role_arn" {
  value = module.eks.node_iam_role_arn
}

output "node_iam_role_name" {
  value = module.eks.node_iam_role_name
}
