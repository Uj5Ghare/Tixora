output "iam_role_arn" {
  value       = module.irsa.iam_role_arn
  description = "IRSA role ARN annotated on the controller ServiceAccount."
}

output "helm_release_name" {
  value       = helm_release.aws_load_balancer_controller.name
  description = "Helm release name."
}

output "namespace" {
  value       = var.namespace
  description = "Namespace where the controller runs."
}

output "ingress_class_name" {
  value       = "alb"
  description = "IngressClass created by the chart (default); matches argocd_helm ingress_class_name default."
}

output "verify_pods_command" {
  value       = "kubectl -n ${var.namespace} get pods -l app.kubernetes.io/name=aws-load-balancer-controller"
  description = "Run after apply to confirm the controller is running."
}
