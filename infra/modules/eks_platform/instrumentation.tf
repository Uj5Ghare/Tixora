locals {
  instrumentation_manifest = {
    apiVersion = "cloudwatch.aws.amazon.com/v1alpha1"
    kind       = "Instrumentation"
    metadata = {
      name      = "cloudwatch-instrumentation"
      namespace = "amazon-cloudwatch"
    }
    spec = {
      exporter = {
        endpoint = "http://cloudwatch-agent.amazon-cloudwatch:4316"
      }
      env = [
        { name = "OTEL_TRACES_EXPORTER", value = "otlp" },
        { name = "OTEL_METRICS_EXPORTER", value = "otlp" },
        { name = "OTEL_LOGS_EXPORTER", value = "otlp" },
        { name = "OTEL_EXPORTER_OTLP_PROTOCOL", value = "http/protobuf" },
        { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = "http://cloudwatch-agent.amazon-cloudwatch:4316" }
      ]
      nodejs = {
        image = "602401143452.dkr.ecr.us-east-1.amazonaws.com/eks/observability/adot-autoinstrumentation-node:v0.11.0"
        resourceRequirements = {
          limits = {
            cpu    = "500m"
            memory = "128Mi"
          }
          requests = {
            cpu    = "50m"
            memory = "128Mi"
          }
        }
      }
      propagators = ["tracecontext", "baggage", "xray"]
      sampler = {
        type     = "xray"
        argument = "endpoint=http://cloudwatch-agent.amazon-cloudwatch:2000"
      }
    }
  }
}

resource "null_resource" "instrumentation" {
  triggers = {
    manifest     = yamlencode(local.instrumentation_manifest)
    cluster_name = var.cluster_name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.region}
      kubectl apply -f - <<'YAML_EOF'
${yamlencode(local.instrumentation_manifest)}
YAML_EOF
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      aws eks update-kubeconfig --name ${self.triggers.cluster_name} --region ${self.triggers.region}
      kubectl delete instrumentation cloudwatch-instrumentation -n amazon-cloudwatch || true
    EOT
  }

  depends_on = [module.eks]
}

locals {
  fluentbit_lua_script = <<-EOT
function add_container_name(tag, timestamp, record)
    if record["kubernetes"] and record["kubernetes"]["container_name"] then
        local ns = record["kubernetes"]["namespace_name"] or ""
        if ns ~= "tixora" then
            return -1, timestamp, record
        end
        local container = record["kubernetes"]["container_name"]
        record["_cn"] = ns .. "." .. container
        return 2, timestamp, record
    end
    return -1, timestamp, record
end
EOT

  fluentbit_application_log_config = <<-EOT
[INPUT]
  Name              tail
  Tag               application.*
  Path              /var/log/containers/*_tixora_*.log
  multiline.parser  docker, cri
  DB                /var/fluent-bit/state/flb_container.db
  Mem_Buf_Limit     50MB
  Skip_Long_Lines   On
  Refresh_Interval  10
  Rotate_Wait       30
  storage.type      filesystem
  Read_from_Head    $${READ_FROM_HEAD}

[FILTER]
  Name                kubernetes
  Match               application.*
  Kube_Tag_Prefix     application.var.log.containers.
  Merge_Log           On
  Merge_Log_Key       log_processed
  K8S-Logging.Parser  On
  K8S-Logging.Exclude On

[FILTER]
  Name                lua
  Match               application.*
  call                add_container_name
  script              /fluent-bit/etc/tag_rewrite.lua

[FILTER]
  Name                rewrite_tag
  Match               application.*
  Rule                $_cn ^(.*)$ $1 false
  Emitter_Name         app_container

[FILTER]
  Name                modify
  Match               *
  Remove              log_processed
  Remove              kubernetes
  Remove              _cn
  Remove              stream
  Remove              _p

[OUTPUT]
  Name                cloudwatch_logs
  Match               tixora.*
  region              $${AWS_REGION}
  log_group_name      /aws/containerinsights/$${CLUSTER_NAME}/application
  log_stream_prefix   application/
  auto_create_group   true
  extra_user_agent    container-insights
EOT
}

resource "null_resource" "fluentbit_config" {
  triggers = {
    config       = local.fluentbit_application_log_config
    lua_script   = local.fluentbit_lua_script
    cluster_name = var.cluster_name
    region       = var.region
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.region}
      kubectl patch configmap fluent-bit-config -n amazon-cloudwatch \
        --patch '{"data":{"application-log.conf": ${jsonencode(local.fluentbit_application_log_config)}, "tag_rewrite.lua": ${jsonencode(local.fluentbit_lua_script)}}}'
      kubectl rollout restart daemonset fluent-bit -n amazon-cloudwatch || \
        kubectl delete pod -n amazon-cloudwatch -l k8s-app=fluent-bit
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Fluent Bit config cleanup skipped - manual revert needed'"
  }

  depends_on = [null_resource.instrumentation]
}
