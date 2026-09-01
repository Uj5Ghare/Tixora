output "argocd_namespace" {
  value       = var.argocd_namespace
  description = "Namespace where Argo CD is installed."
}

output "argocd_release_name" {
  value       = var.argocd_release_name
  description = "Helm release name."
}

output "kubectl_port_forward_ui" {
  value       = "kubectl port-forward svc/${var.argocd_release_name}-server -n ${var.argocd_namespace} 8080:443"
  description = "Local UI (HTTPS on 8080): open https://localhost:8080 after running this."
}

output "initial_admin_password_hint" {
  value       = "kubectl -n ${var.argocd_namespace} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
  description = "Decode initial admin password (secret exists until you change admin password or remove it)."
}

output "public_ui_hostname_command" {
  value       = "kubectl get svc ${var.argocd_release_name}-server -n ${var.argocd_namespace} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
  description = "When using an internet-facing NLB (Service LoadBalancer), run after apply to get the DNS name."
}

output "ingress_alb_hostname_command" {
  value       = "kubectl get ingress -n ${var.argocd_namespace} -l app.kubernetes.io/name=argocd-server -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null || kubectl get ingress -n ${var.argocd_namespace} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}'"
  description = "When using Ingress (e.g. AWS ALB), run after apply; point your ingress_hostname DNS (CNAME/ALIAS) to this hostname. UI: https://<your-ingress-hostname> once DNS and TLS (e.g. ACM on ALB) are set."
}

output "ingress_effective_domain" {
  value       = var.expose_server_via_ingress ? local.ingress_domain : null
  description = "Host on the Argo CD Ingress (from ingress_hostname or placeholder <release>.<cluster>.local). Create a DNS record pointing to the ALB hostname from ingress_alb_hostname_command."
}

output "ingress_alb_dns_hostname" {
  value = length(data.kubernetes_ingress_v1.argocd_server) > 0 ? try(
    data.kubernetes_ingress_v1.argocd_server[0].status[0].load_balancer[0].ingress[0].hostname,
    null
  ) : null
  description = "ALB DNS name from Ingress status (non-null once the AWS LB Controller has provisioned the load balancer). Use for Route53 CNAME to this hostname."
}
