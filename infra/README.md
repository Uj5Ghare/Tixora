# Prod EKS Terragrunt Stack

## Quick Apply Commands

```bash
cd infra/terragrunt/us-east-1/stacks/eks/
terragrunt stack run apply --filter '! cloudfront | ! eks | ! vpc | ! kms | ! security-groups | ! s3-assets'
```

```bash
cd infra/terragrunt/us-east-1/stacks/eks/
terragrunt stack run apply --filter cloudfront --filter s3
```

This repository deploys AWS infrastructure for **`molt`** using **Terragrunt** and official **Terraform AWS** modules. The primary region layout is **`infra/terragrunt/us-east-1/`**.

## Current Recommended Runbook

Use this prod-only stack apply flow:

```bash
terragrunt stack run --filter 'name=UNIT_NAME' init -- -reconfigure
```

```bash
cd infra/terragrunt/us-east-1/stacks/eks/
terragrunt stack run apply --filter '! cloudfront | ! eks | ! vpc | ! kms | ! security-groups | ! s3-assets'
```

```bash
cd infra/terragrunt/us-east-1/stacks/eks/
terragrunt stack run apply --filter cloudfront --filter s3
```

Important notes:
- `--filter` values here are plain component/path matches (not regex anchors like `^eks$`).
- `--no-stack-generate` is required when running from `us-east-1` so Terragrunt does not auto-generate `stacks/eks/.terragrunt-stack/*` units and double-plan.
- If EKS API calls time out, update `endpoint_public_access_cidrs` in `infra/terragrunt/env.hcl` with your current public IP and apply `eks`.

## Terragrunt Commands Quick Reference

Use this as a short day-to-day cheat sheet for this repo.

### Run Location

Run most commands from:

```bash
cd infra/terragrunt/us-east-1
```

### Formatting and Validation

- `terragrunt hcl format`  
  Formats all Terragrunt HCL files recursively.

- `terragrunt hcl validate`  
  Validates Terragrunt configuration syntax and wiring.

- `terragrunt run --all validate`  
  Runs Terraform/OpenTofu `validate` across all stacks in dependency order.

### Planning and Applying

- `terragrunt run --all --no-stack-generate --filter '!stacks/**' plan`  
  Preferred full-region plan against real unit paths (avoids generated stack duplicates).

- `terragrunt run --all --no-stack-generate --filter '!stacks/**' apply`  
  Preferred full-region apply against real unit paths (use with caution).

- `terragrunt plan`  
  Plans only the current stack directory.

- `terragrunt apply`  
  Applies only the current stack directory.

### Initialize / Backend Changes

- `terragrunt init`  
  Initializes the current stack (providers, backend, modules).

- `terragrunt run --all init -reconfigure`  
  Reconfigures backend settings for all stacks after backend/env changes.

- `terragrunt run --all init -migrate-state`  
  Attempts backend state migration when backend config changed.

### Useful Operations

- `terragrunt output`  
  Prints outputs for the current stack.

- `terragrunt destroy`  
  Destroys resources in the current stack (dangerous; review first).

- `terragrunt run --all destroy`  
  Destroys all stacks in dependency-aware order (very dangerous).

### Safe Workflow (Recommended)

1. `terragrunt hcl format`
2. `terragrunt hcl validate`
3. `terragrunt run --all validate`
4. `terragrunt run --all --no-stack-generate --filter '!stacks/**' plan`
5. Apply stack-by-stack with `terragrunt apply` where possible

---

## What this stack includes

- **VPC** (public + private subnets), **KMS**, **security groups**, **ECR**, **Secrets Manager**
- **Amazon EKS** (`terraform-aws-modules/eks/aws` ~v20): Kubernetes **1.35**, **Ubuntu 24.04** EKS-optimized worker AMI, **managed node group** on **private subnets** only
- **Managed cluster add-ons** (in the EKS module): `vpc-cni`, `kube-proxy`, `coredns`, `eks-pod-identity-agent`, `metrics-server`
- **IRSA** for workloads, optional **Karpenter** (separate stack), plus **S3**, **SQS**, **WAF**, **CloudFront**, **Route53**, **CloudWatch** as separate units
- **AWS Load Balancer Controller** (stack `aws-load-balancer-controller`): official [Helm chart](https://github.com/aws/eks-charts/tree/master/stable/aws-load-balancer-controller) with **IRSA**, installed after **EKS** so **Ingress → ALB** works (see deploy order below)
- **Argo CD** (optional stack `argocd`): official [`argo-cd` Helm chart](https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd) installed via Terraform `helm_release` after the cluster and (for Ingress UI) the load balancer controller exist (see below)

AWS does not install Argo CD as a managed EKS add-on; this repo installs it with Helm. See also: [Continuous Deployment with Argo CD on EKS](https://docs.aws.amazon.com/eks/latest/userguide/argocd.html).

---

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Terraform](https://www.terraform.io/downloads) `>= 1.6` | Used by Terragrunt |
| [Terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) | Orchestration, remote state, includes |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) v2 | Credentials, `eks update-kubeconfig` |
| `kubectl` | Cluster inspection after EKS is up |
| **S3 bucket** for remote state | Must exist; name matches `tfstate_bucket` in `infra/terragrunt/env.hcl` |

Your IAM principal needs permissions to create the resources above and to read/write the state bucket.

---

## 1. Configure environment (`infra/terragrunt/env.hcl`)

Set environment values directly in `infra/terragrunt/env.hcl`. Terragrunt stacks read shared locals from this file.

**Required / common variables:**

| Variable | Example | Purpose |
|----------|---------|---------|
| `tfstate_bucket` | `molt-iaac-tfstate-prod` | S3 backend for Terraform state |
| `tfstate_region` | `us-east-1` | Region of the state bucket |
| `aws_region` | `us-east-1` | Default AWS provider region |
| `aws_azs` | `["us-east-1a","us-east-1b","us-east-1c"]` | AZs for VPC/EKS |
| `environment` | `prod` | Feeds default tags (`Environment`, `Name`) |
| `endpoint_public_access_cidrs` | `["x.x.x.x/32"]` | **Allowlist for the EKS Kubernetes API public endpoint** (`kubectl`). |

**Important:**

- **`endpoint_public_access_cidrs` is not your app’s HTTP API.** It only restricts who can reach the **Kubernetes control plane** over the internet.
- **AWS rejects documentation / invalid ranges** (for example RFC 5737 addresses like `203.0.113.0/24`). Use a real routable IPv4 CIDR.
- If your home/office **IP changes**, update `endpoint_public_access_cidrs` in `infra/terragrunt/env.hcl` and **`terragrunt apply`** the **`eks`** stack again so the cluster allowlist updates.
- **Remote state S3 keys** use Terragrunt’s relative path (see `key` in `infra/root.hcl`). If you move stack paths, ensure corresponding objects in **`tfstate_bucket`** are moved consistently (or use `terraform state pull` / `push` per stack) so Terraform continues using existing state.

No `source .env` step is required; values are loaded from `infra/terragrunt/env.hcl`.

---

## 2. Step-by-step: first-time deployment

Run commands from **`infra/terragrunt/us-east-1`**.

**Recommended order** (each folder is its own Terragrunt unit):

1. **`kms`** — encryption keys (EKS secrets, etc.)
2. **`vpc`** — VPC, subnets, NAT
3. **`security-groups`** — cluster/worker security groups
4. **`ecr`** — container registries
5. **`secretsmanager`** — secrets (if used)
6. **`eks`** — EKS cluster + managed node group + core add-ons + cluster-creator admin access entry
7. **`eks-addons`** — additional EKS add-ons (e.g. EBS CSI); ensure this does not duplicate conflicting add-on management with the EKS module where you already manage the same add-on
8. **`aws-load-balancer-controller`** — installs **`eks/aws-load-balancer-controller`** (`infra/modules/aws_load_balancer_controller_helm`) with IAM policy + IRSA. Apply after **`eks`** when at least one node can schedule pods. **Before first apply**, ensure **`vpc`** has been applied with **`public_subnet_tags` / `private_subnet_tags`** in **`_envcommon/vpc.hcl`** so subnets are tagged for ELB discovery.
9. **`argocd`** — Argo CD via Helm (`infra/modules/argocd_helm`); Terragrunt depends on **`aws-load-balancer-controller`** when using **Ingress**. Requires **nodes Ready** and DNS (CoreDNS) working. The machine running Terraform/Helm must have **`aws` CLI** available for `aws eks get-token` (used by the Kubernetes and Helm providers).
10. **`karpenter`** — Karpenter (depends on EKS outputs)
11. **`sqs`**, **`s3-assets`**, **`waf`**, **`cloudfront`**, **`route53`**, **`cloudwatch`** — as needed for your app

The **`route53`** stack (`infra/terragrunt/us-east-1/route53/terragrunt.hcl`) can also create a **CNAME** for **`gitops-argo-prod.<zone>`** (e.g. **`gitops-argo-prod.molt.life`**) to the Argo CD Ingress ALB (`ingress_alb_dns_hostname` output), using `route53_zone_name` / `argocd_route53_zone_name` from **`env.hcl`** (the Route53 **`records`** module supports a single hosted zone per apply). Depends on **`cloudfront`** and **`argocd`**.

**Example: apply one stack**

```bash
cd /path/to/terragrunt/infra/terragrunt/us-east-1/kms
terragrunt plan
terragrunt apply
```

Repeat by changing directory to `vpc`, `security-groups`, … in the order above.

**Stack file reference (single file)**

The repo keeps a single stack definition at:

`infra/terragrunt/us-east-1/stacks/eks/terragrunt.stack.hcl`

It lists both EKS prerequisites and post-EKS units for discovery/reference. For day-to-day planning/apply, prefer the filtered `run --all --no-stack-generate` command shown at the top of this README.

**Example: validate and plan from the region folder**

```bash
cd /path/to/terragrunt/infra/terragrunt/us-east-1
terragrunt hcl format
terragrunt run --all validate
terragrunt run --all --no-stack-generate --filter '!stacks/**' plan
```

Use **`terragrunt run --all --no-stack-generate --filter '!stacks/**' apply`** only after you understand cross-stack dependencies and blast radius; applying **per stack** is safer for production-like environments.

---

## 3. Cluster defaults (see `infra/terragrunt/env.hcl`)

| Setting | Typical value | Notes |
|---------|----------------|--------|
| `kubernetes_version` | `1.35` | Align with [EKS supported versions](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html) |
| `node_instance_type` | `t3.medium` | **`t3.micro` is too small** (~4 pods/node): system DaemonSets fill the node and **CoreDNS** may not schedule. Prefer **t3.small** minimum or **t3.medium**. |
| `node_desired_size` / `min` / `max` | `1` / `1` / `2` | Adjust for HA and workload |
| `node_disk_size` | `50` | EBS root disk size (GiB) for managed node groups |
| `primary_workload_instance` | `molt-api` | Workload identity value used in EKS/Karpenter labels and taints |
| `addon_tolerations` | `[{ key, operator, value, effect }]` | Tolerations applied to managed EKS add-ons so they schedule on tainted pools |
| `route53_record_prefixes` | `{ cdn, argocd, apis }` | Prefixes used by Route53 records before `-<environment>` |
| `sqs_queue_suffixes` | `{ main, dlq }` | Suffixes for SQS queue and DLQ names |
| `endpoint_public_access_cidrs` | From `infra/terragrunt/env.hcl` | Restricts **kubectl** / API clients, not browser traffic to your app |

The EKS module sets **`enable_cluster_creator_admin_permissions = true`**: the **IAM identity used when you run `terragrunt apply`** on the EKS stack gets **cluster admin** via **EKS access entries**. For **`kubectl`**, use the **same AWS credentials** (same `aws sts get-caller-identity` as Terraform). If you use a different IAM user or role locally, add an **EKS access entry** for that principal in the AWS console or via Terraform.

---

## 4. Access the cluster with `kubectl`

1. Ensure your **public IP** is in **`endpoint_public_access_cidrs`** and you have **applied** the `eks` stack.
2. Use the **same AWS profile/credentials** as Terragrunt (or an identity that has an access entry).
3. Merge kubeconfig into a **dedicated file** (optional but avoids touching default `~/.kube/config`):

```bash
mkdir -p ~/.kube
aws eks update-kubeconfig \
  --region us-east-1 \
  --name molt-prod \
  --kubeconfig ~/.kube/molt-prod

export KUBECONFIG="$HOME/.kube/molt-prod"
kubectl get nodes
```

**Troubleshooting connectivity**

- If **`dig`** returns only **NAT64** addresses (`64:ff9b::…`) and **`curl -6`** times out, prefer **IPv4** (e.g. test with `curl -4` to the API URL, adjust OS DNS / `gai.conf` so IPv4 is preferred, or use a network without broken IPv6/NAT64).
- **`You must be logged in` / credentials**: fix **IAM access entries** (see §3) and ensure **`aws sts get-caller-identity`** matches an allowed principal.

---

## 5. Argo CD (Helm, after EKS)

The **`argocd`** Terragrunt stack installs the official **`argo-cd`** chart from [argo-helm](https://argoproj.github.io/argo-helm) into namespace **`argocd`**. It runs **after** the cluster and node group exist so pods can schedule.

**Apply**

```bash
cd /path/to/terragrunt/infra/terragrunt/us-east-1/argocd
terragrunt plan
terragrunt apply
```

**Requirements**

- **IAM** used by Terraform can reach the EKS API (same as `kubectl` / cluster creator admin).
- **`aws` CLI** on the host running `terragrunt apply` (Helm and Kubernetes providers use `aws eks get-token`).
- **Nodes** and **CoreDNS** healthy (Helm `wait` is enabled by default). **Timeout** defaults to **3600s** for Argo CD (large chart + Ingress/ALB); raise further if you still see `context deadline exceeded`.

**First-time UI access (typical)**

```bash
export KUBECONFIG="$HOME/.kube/molt-prod"   # or your kubeconfig path
kubectl -n argocd get pods
# Port-forward HTTPS UI (accept browser TLS warning or use argocd CLI)
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Initial **`admin`** password: secret **`argocd-initial-admin-secret`** in namespace **`argocd`** (see module output **`initial_admin_password_hint`**). Change credentials and expose the UI via **Ingress / ALB** for production instead of port-forward.

**Custom Helm values (YAML files)**

Put shared Helm values under **`infra/valuefiles/`** (for example **`infra/valuefiles/argocd-values.yaml`**) and pass the path in **`inputs`** (the `argocd` stack uses **`local.argocd_values_file`**, which points at that file by default):

```hcl
inputs = {
  cluster_name       = dependency.eks.outputs.cluster_name
  aws_region         = local.region_vars.locals.aws_region
  helm_values_files  = [local.argocd_values_file]
}
```

Multiple paths are supported; **later files override earlier ones** (same idea as `helm upgrade -f a.yaml -f b.yaml`). By default the module **merges** its small built-in baseline (`use_builtin_helm_values = true`) with your files. To drive the install **only** from your YAML, set **`use_builtin_helm_values = false`** and list at least one file in **`helm_values_files`**.

Other knobs: **`infra/modules/argocd_helm/variables.tf`** (`argocd_chart_version`, `helm_wait`, `helm_timeout_seconds`, etc.).

**Public UI (Ingress → ALB, default)** — Apply the **`aws-load-balancer-controller`** stack **before** **`argocd`** (Terragrunt dependency is already wired). That installs the **[AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller)** Helm chart with IRSA. The Argo CD module sets **`expose_server_via_ingress = true`**, **`server.ingress.controller: aws`**, **`ingressClassName: alb`**, and **`configs.params.server.insecure`** for typical ALB HTTP backends. Set **`argocd_ingress_hostname`** and **`argocd_ingress_acm_certificate_arn`** in **`infra/terragrunt/env.hcl`**. The ACM certificate must be in the **same region as the ALB** and include that hostname in **SAN**; it is required because the **argo-cd** chart’s AWS Ingress registers a **gRPC** target group, and AWS only allows gRPC forwards on an **HTTPS** listener (HTTP-only listeners fail with `InvalidLoadBalancerAction`). Point DNS (CNAME/ALIAS) at the ALB hostname from **`terragrunt output ingress_alb_hostname_command`**. Confirm the controller with **`terragrunt output verify_pods_command`** in the **`aws-load-balancer-controller`** unit (after apply).

**Alternative: Service LoadBalancer (NLB)** — Set **`expose_server_via_ingress = false`** and **`expose_server_via_internet_facing_nlb = true`** (not both). Use output **`public_ui_hostname_command`**.

**Troubleshooting (Ingress has no ADDRESS / no ALB in AWS)** — The Argo CD chart’s **AWS** Ingress requires a non-empty **host** (`server.ingress.hostname` or **`global.domain`**). If both were empty, the AWS Load Balancer Controller may never create an **Application** Load Balancer. The **`argocd_helm`** module now sets a placeholder **`global.domain`** when **`ingress_hostname`** is unset. After **`terragrunt apply`** on **`argocd`**, check **`kubectl describe ingress -n argocd`**, **`kubectl get events -n argocd --sort-by=.lastTimestamp`**, and controller logs: **`kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`**. In the AWS console, open **EC2 → Load balancers** and filter by type **Application** (ALB is not listed under **Network** load balancers).

---

## 6. Validation commands (single region)

From **`infra/terragrunt/us-east-1`**:

```bash
terragrunt hcl format
terragrunt run --all validate
terragrunt run --all --no-stack-generate --filter '!stacks/**' plan
```

---

## 7. Application traffic vs cluster API

- **Nodes** have **no public IPs**; they live in **private subnets** and egress via **NAT**.
- **End-user / browser traffic** to your APIs should go through **public load balancers**, **API Gateway**, or **CloudFront** — **not** the node private IPs.
- **`endpoint_public_access_cidrs`** only affects the **EKS Kubernetes API endpoint** used by **`kubectl`** and automation — **not** your application’s public URL.

---

## 8. Safety controls (high level)

- **`prevent_destroy`** on selected critical resources where configured (e.g. some add-ons)
- S3 asset bucket currently allows destroy operations (`force_destroy=true`, `object_lock_enabled=false`)
- **KMS** key rotation enabled where the module enables it
- Consistent **tags** and naming: **`molt`**, `Project`, `Environment`, `ManagedBy`

---

## 9. Layout reference

```text
infra/
  root.hcl                # Remote state + generated provider/backend
  terragrunt/
    env.hcl               # Shared locals (state bucket/region, AWS region/AZs, EKS CIDRs, etc.)
    us-east-1/
      region.hcl          # Region + AZs (from env.hcl or path fallback)
      kms/ vpc/ eks/ argocd/ ...  # One terragrunt.hcl per stack
      stacks/eks/terragrunt.stack.hcl  # Unified stack unit list (reference/discovery)
  modules/
    eks_platform/         # Cluster + node groups + core add-ons
    argocd_helm/          # Argo CD Helm release
    ...
```

For questions about a specific resource, open the matching **`infra/terragrunt/us-east-1/<stack>/terragrunt.hcl`** and the **`infra/modules/...`** source it references.
