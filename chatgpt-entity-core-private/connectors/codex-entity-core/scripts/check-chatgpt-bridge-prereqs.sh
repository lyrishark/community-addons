#!/bin/sh

set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
connector_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
. "$script_dir/platform-common.sh"

failures=0

pass() { printf '[pass] %s\n' "$1"; }
warn() { printf '[warn] %s\n' "$1"; }
fail() { printf '[fail] %s\n' "$1"; failures=$((failures + 1)); }

printf 'Psycheros ChatGPT bridge check (%s)\n\n' "$(psycheros_platform)"

if deno_path=$(find_deno); then
  pass "Deno found at $deno_path"
else
  fail "Deno was not found. Install Deno from https://docs.deno.com/runtime/getting_started/installation/"
fi

if tailscale_path=$(find_tailscale); then
  pass "Tailscale CLI found at $tailscale_path"
else
  warn "Tailscale CLI was not found. The local bridge can run, but ChatGPT needs an HTTPS tunnel."
fi

data_dir=${ENTITY_CONNECTOR_DATA_DIR:-$(psycheros_default_data_dir)}
if [ -d "$data_dir" ]; then
  pass "Psycheros entity-core data found at $data_dir"
else
  warn "Entity-core data does not exist yet at $data_dir"
fi

env_file=${1:-$connector_root/bridge.env}
if [ -f "$env_file" ]; then
  load_bridge_env "$env_file"
  if validate_bridge_env; then
    pass "Bridge settings are structurally valid"
  else
    failures=$((failures + 1))
  fi
else
  warn "bridge.env does not exist yet. Create it from bridge.env.example."
fi

if [ "${2:-}" = "--deno-check" ] && [ "$failures" -eq 0 ]; then
  printf '\nChecking Deno source...\n'
  (cd "$connector_root" && "$deno_path" task check)
fi

printf '\n'
if [ "$failures" -gt 0 ]; then
  printf '%s failure(s) need attention.\n' "$failures"
  exit 1
fi
printf 'Required checks passed. Warnings may still need setup.\n'
