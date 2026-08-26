#!/usr/bin/env bash
# Reads stdin JSON from hashicorp/external `query` (expects .key_id), prints { "policy": "<key policy JSON>" }.
# KMS is regional: if the default AWS CLI region differs from the key's region, get-key-policy fails unless --region matches.
set -euo pipefail
QUERY=$(cat)
KEY_ID=$(echo "$QUERY" | jq -r '.key_id')

REGION_ARGS=()
if [[ "$KEY_ID" =~ ^arn:aws[-a-z]*:kms:([a-z0-9-]+):[0-9]+:(key|alias)/ ]]; then
  REGION_ARGS=(--region "${BASH_REMATCH[1]}")
elif [[ -n "${AWS_REGION:-}" ]]; then
  REGION_ARGS=(--region "$AWS_REGION")
fi

POLICY=$(aws kms get-key-policy --key-id "$KEY_ID" --policy-name default --query Policy --output text "${REGION_ARGS[@]}")
jq -n --arg p "$POLICY" '{policy:$p}'
