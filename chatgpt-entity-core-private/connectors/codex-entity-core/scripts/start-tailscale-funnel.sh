#!/bin/sh

set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
connector_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
. "$script_dir/platform-common.sh"

env_file=${1:-$connector_root/bridge.env}
if [ -f "$env_file" ]; then
  load_bridge_env "$env_file"
fi
port=$(bridge_port)

tailscale_path=$(find_tailscale) || {
  printf '%s\n' "Tailscale CLI was not found." >&2
  exit 1
}

printf 'Starting Tailscale Funnel for local port %s...\n' "$port"
printf 'Keep this terminal open. Press Ctrl+C to stop the foreground tunnel.\n\n'
export TAILSCALE_BE_CLI=1
exec "$tailscale_path" funnel "$port"
