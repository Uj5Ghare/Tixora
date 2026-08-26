# NodeClass and NodePool resources for EKS Auto Mode.
#
# The kubernetes provider cannot be configured with values known only after
# apply (cluster endpoint/CA), so we use null_resource + kubectl instead —
# the same pattern used by instrumentation.tf in this module.

locals {
  automode_node_role_name = split("/", module.eks.node_iam_role_arn)[1]

  node_class_manifests = {
    for name, cfg in var.automode_node_classes : name => {
      apiVersion = "eks.amazonaws.com/v1"
      kind       = "NodeClass"
      metadata = { name = name }
      spec = {
        role                       = coalesce(cfg.role_arn != null ? split("/", cfg.role_arn)[1] : "", local.automode_node_role_name)
        subnetSelectorTerms        = cfg.subnet_selector_terms
        securityGroupSelectorTerms = coalesce(cfg.security_group_selector_terms, [])
        ephemeralStorage = cfg.ephemeral_storage != null ? {
          size       = cfg.ephemeral_storage.size
          iops       = coalesce(cfg.ephemeral_storage.iops, 3000)
          throughput = coalesce(cfg.ephemeral_storage.throughput, 125)
          kmsKeyID   = (cfg.ephemeral_storage.kms_key_id != null && cfg.ephemeral_storage.kms_key_id != "") ? cfg.ephemeral_storage.kms_key_id : null
        } : null
      }
    }
  }

  node_pool_manifests = {
    for name, cfg in var.automode_node_pools : name => {
      apiVersion = "karpenter.sh/v1"
      kind       = "NodePool"
      metadata = { name = name }
      spec = {
        template = {
          metadata = { labels = cfg.labels }
          spec = {
            nodeClassRef = {
              group = "eks.amazonaws.com"
              kind  = "NodeClass"
              name  = cfg.node_class_name
            }
            taints       = cfg.taints
            requirements = cfg.requirements
          }
        }
        limits = coalesce(cfg.limits, {})
      }
    }
  }
}

resource "null_resource" "automode_node_classes" {
  for_each = var.automode_node_classes

  triggers = {
    manifest     = jsonencode(local.node_class_manifests[each.key])
    cluster_name = var.cluster_name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.region}
      echo ${jsonencode(yamlencode(local.node_class_manifests[each.key]))} | kubectl apply -f -
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      aws eks update-kubeconfig --name ${self.triggers.cluster_name} --region ${self.triggers.region}
      kubectl delete nodeclass ${each.key} --ignore-not-found
    EOT
  }

  depends_on = [module.eks]
}

resource "null_resource" "automode_node_pools" {
  for_each = var.automode_node_pools

  triggers = {
    manifest     = jsonencode(local.node_pool_manifests[each.key])
    cluster_name = var.cluster_name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.region}
      echo ${jsonencode(yamlencode(local.node_pool_manifests[each.key]))} | kubectl apply -f -
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      aws eks update-kubeconfig --name ${self.triggers.cluster_name} --region ${self.triggers.region}
      kubectl delete nodepool ${each.key} --ignore-not-found
    EOT
  }

  depends_on = [null_resource.automode_node_classes]
}
