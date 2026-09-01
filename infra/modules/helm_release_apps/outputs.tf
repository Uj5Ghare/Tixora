output "releases" {
  value = {
    for k, r in helm_release.app : k => {
      name      = r.name
      namespace = r.namespace
      status    = r.status
    }
  }
  description = "Installed Helm releases (only entries with enabled = true)."
}

output "ingress_alb_dns_hostname" {
  value = length(data.kubernetes_ingress_v1.argocd_server) > 0 ? try(
    data.kubernetes_ingress_v1.argocd_server[0].status[0].load_balancer[0].ingress[0].hostname,
    null
  ) : null
  description = "ALB DNS hostname for Argo CD ingress when chart key 'argocd' is enabled."
}

output "cluster_secret_stores" {
  value = {
    for k, s in kubernetes_manifest.cluster_secret_store : k => s.object.metadata.name
  }
  description = "Created ClusterSecretStore names."
}

output "external_secrets_irsa_role_arn" {
  value       = try(module.external_secrets_irsa[0].iam_role_arn, null)
  description = "IAM role ARN attached to the External Secrets Operator service account when external_secrets_irsa.enabled is true."
}
