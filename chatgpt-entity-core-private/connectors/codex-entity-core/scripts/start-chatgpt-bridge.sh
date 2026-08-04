#!/bin/sh

set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
connector_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
. "$script_dir/platform-common.sh"

env_file=${1:-$connector_root/bridge.env}
load_bridge_env "$env_file"
validate_bridge_env

deno_path=$(find_deno) || {
  printf '%s\n' "Deno was not found. Install Deno or set ENTITY_CONNECTOR_DENO_PATH." >&2
  exit 1
}

export ENTITY_CONNECTOR_HTTP_AUTH_MODE=oauth
export ENTITY_CONNECTOR_OAUTH_RESOURCE=${ENTITY_CONNECTOR_OAUTH_RESOURCE:-$ENTITY_CONNECTOR_PUBLIC_BASE_URL}
export ENTITY_CONNECTOR_DATA_DIR=${ENTITY_CONNECTOR_DATA_DIR:-$(psycheros_default_data_dir)}
export ENTITY_CONNECTOR_HTTP_HOST=${ENTITY_CONNECTOR_HTTP_HOST:-127.0.0.1}
export ENTITY_CONNECTOR_HTTP_PORT=${ENTITY_CONNECTOR_HTTP_PORT:-3006}
export ENTITY_CONNECTOR_WRITE_ENABLED=${ENTITY_CONNECTOR_WRITE_ENABLED:-false}
export ENTITY_CONNECTOR_CORS_ORIGINS=${ENTITY_CONNECTOR_CORS_ORIGINS:-https://chatgpt.com,https://chat.openai.com}

printf 'Starting Psycheros ChatGPT MCP bridge...\n'
printf 'Local MCP URL: http://%s:%s/mcp-lite\n' "$ENTITY_CONNECTOR_HTTP_HOST" "$ENTITY_CONNECTOR_HTTP_PORT"
printf 'Public MCP URL: %s/mcp-lite\n' "${ENTITY_CONNECTOR_PUBLIC_BASE_URL%/}"
printf 'Entity-core data: %s\n' "$ENTITY_CONNECTOR_DATA_DIR"
printf 'Writes enabled: %s\n\n' "$ENTITY_CONNECTOR_WRITE_ENABLED"

cd "$connector_root"
exec "$deno_path" run --node-modules-dir=none -A src/http.ts
