include "root" {
  path = find_in_parent_folders("root.hcl")
}

include "envcommon" {
  path = "${dirname(find_in_parent_folders("root.hcl"))}/_envcommon/vpc.hcl"
}

terraform {
  source = "tfr:///terraform-aws-modules/vpc/aws?version=5.19.0"
}
