locals {
  env_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))

  project    = local.env_vars.locals.project
  env        = local.env_vars.locals.environment
  aws_region = local.env_vars.locals.aws_region
  aws_azs    = local.env_vars.locals.aws_azs
}

inputs = {
  name                 = "${local.project}-${local.env}-vpc"
  azs                  = local.aws_azs
  cidr                 = local.env_vars.locals.vpc_cidr
  private_subnets      = local.env_vars.locals.private_subnets
  public_subnets       = local.env_vars.locals.public_subnets
  enable_dns_hostnames = true
  enable_dns_support   = true
  one_nat_gateway_per_az = false
  single_nat_gateway     = true
  enable_nat_gateway     = true
  tags                 = local.env_vars.locals.tags

  # Required for AWS Load Balancer Controller subnet discovery (ALB / NLB).
  public_subnet_tags = {
    "kubernetes.io/role/elb"                            = "1"
    "kubernetes.io/cluster/${local.project}-${local.env}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                     = "1"
    "kubernetes.io/cluster/${local.project}-${local.env}" = "shared"
  }
}
