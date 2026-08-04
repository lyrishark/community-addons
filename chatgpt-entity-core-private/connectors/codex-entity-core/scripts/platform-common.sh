#!/bin/sh

set -eu

psycheros_platform() {
  case "$(uname -s)" in
    Darwin) printf '%s\n' darwin ;;
    Linux) printf '%s\n' linux ;;
    *)
      printf '%s\n' "Unsupported operating system: $(uname -s)" >&2
      return 1
      ;;
  esac
}

psycheros_data_home() {
  if [ "$(psycheros_platform)" = darwin ]; then
    printf '%s\n' "$HOME/Library/Application Support"
  else
    printf '%s\n' "${XDG_DATA_HOME:-$HOME/.local/share}"
  fi
}

psycheros_app_root() {
  printf '%s\n' "$(psycheros_data_home)/Psycheros"
}

psycheros_config_root() {
  if [ "$(psycheros_platform)" = darwin ]; then
    printf '%s\n' "$(psycheros_app_root)/config"
  else
    printf '%s\n' "${XDG_CONFIG_HOME:-$HOME/.config}/Psycheros"
  fi
}

psycheros_default_data_dir() {
  printf '%s\n' "$(psycheros_app_root)/data/entity-core"
}

psycheros_runtime_root() {
  printf '%s\n' "$(psycheros_app_root)/addons/chatgpt-entity-core-private"
}

psycheros_log_root() {
  printf '%s\n' "$(psycheros_app_root)/logs"
}

find_deno() {
  if [ -n "${ENTITY_CONNECTOR_DENO_PATH:-}" ] &&
    [ -x "$ENTITY_CONNECTOR_DENO_PATH" ]; then
    printf '%s\n' "$ENTITY_CONNECTOR_DENO_PATH"
    return 0
  fi

  bundled="$(psycheros_app_root)/bin/deno"
  if [ -x "$bundled" ]; then
    printf '%s\n' "$bundled"
    return 0
  fi

  if command -v deno >/dev/null 2>&1; then
    command -v deno
    return 0
  fi

  return 1
}

find_tailscale() {
  if command -v tailscale >/dev/null 2>&1; then
    command -v tailscale
    return 0
  fi

  mac_app_cli=/Applications/Tailscale.app/Contents/MacOS/Tailscale
  if [ "$(psycheros_platform)" = darwin ] && [ -x "$mac_app_cli" ]; then
    printf '%s\n' "$mac_app_cli"
    return 0
  fi

  return 1
}

xml_escape() {
  printf '%s' "$1" | sed \
    -e 's/&/\&amp;/g' \
    -e 's/</\&lt;/g' \
    -e 's/>/\&gt;/g' \
    -e 's/"/\&quot;/g' \
    -e "s/'/\&apos;/g"
}

load_bridge_env() {
  env_file=$1
  [ -f "$env_file" ] || {
    printf '%s\n' "Bridge settings were not found: $env_file" >&2
    return 1
  }

  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line=$(printf '%s' "$raw_line" | tr -d '\r')
    case "$line" in
      ''|'#'*) continue ;;
      *=*) ;;
      *)
        printf '%s\n' "Ignoring malformed bridge.env line: $line" >&2
        continue
        ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    key=$(printf '%s' "$key" | tr -d '[:space:]')
    case "$key" in
      ''|*[!A-Za-z0-9_]*)
        printf '%s\n' "Ignoring unsafe bridge.env key: $key" >&2
        continue
        ;;
    esac

    case "$value" in
      \"*\") value=${value#\"}; value=${value%\"} ;;
      \'*\') value=${value#\'}; value=${value%\'} ;;
    esac
    export "$key=$value"
  done < "$env_file"
}

bridge_port() {
  port=${ENTITY_CONNECTOR_HTTP_PORT:-3006}
  case "$port" in
    ''|*[!0-9]*)
      printf '%s\n' "ENTITY_CONNECTOR_HTTP_PORT must be a number." >&2
      return 1
      ;;
  esac
  if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    printf '%s\n' "ENTITY_CONNECTOR_HTTP_PORT must be between 1 and 65535." >&2
    return 1
  fi
  printf '%s\n' "$port"
}

validate_bridge_env() {
  case "${ENTITY_CONNECTOR_PUBLIC_BASE_URL:-}" in
    https://*) ;;
    *)
      printf '%s\n' "ENTITY_CONNECTOR_PUBLIC_BASE_URL must start with https://" >&2
      return 1
      ;;
  esac
  case "$ENTITY_CONNECTOR_PUBLIC_BASE_URL" in
    */mcp|*/mcp-lite)
      printf '%s\n' "ENTITY_CONNECTOR_PUBLIC_BASE_URL must not end in /mcp or /mcp-lite." >&2
      return 1
      ;;
  esac
  case "${ENTITY_CONNECTOR_OAUTH_ISSUER:-}" in
    https://*) ;;
    *)
      printf '%s\n' "ENTITY_CONNECTOR_OAUTH_ISSUER must start with https://" >&2
      return 1
      ;;
  esac
  bridge_port >/dev/null
}
