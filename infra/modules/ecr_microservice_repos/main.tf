module "ecr" {
  source  = "terraform-aws-modules/ecr/aws"
  version = "2.3.1"

  for_each = toset(var.microservice_namespaces)

  repository_name                 = "${each.key}-${var.environment}"
  repository_image_tag_mutability = var.repository_image_tag_mutability
  repository_force_delete         = var.repository_force_delete
  repository_lifecycle_policy     = var.repository_lifecycle_policy

  tags = merge(
    var.tags,
    {
      Microservice = each.key
      Name         = "${each.key}-${var.environment}"
    }
  )
}
