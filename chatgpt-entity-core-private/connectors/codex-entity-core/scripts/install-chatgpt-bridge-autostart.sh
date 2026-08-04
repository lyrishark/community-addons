#!/bin/sh

set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
connector_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
addon_root=$(CDPATH= cd -- "$connector_root/../.." && pwd)
. "$script_dir/platform-common.sh"

env_file=${1:-$connector_root/bridge.env}
load_bridge_env "$env_file"
validate_bridge_env
port=$(bridge_port)
deno_path=$(find_deno) || {
  printf '%s\n' "Deno was not found. Install Deno or set ENTITY_CONNECTOR_DENO_PATH." >&2
  exit 1
}

runtime_root=$(psycheros_runtime_root)
runtime_connector=$runtime_root/connectors/codex-entity-core
config_root=$(psycheros_config_root)
stable_env=$config_root/chatgpt-bridge.env
log_root=$(psycheros_log_root)
stage_root=$runtime_root.installing.$$

case "$runtime_root" in
  "$(psycheros_app_root)"/addons/chatgpt-entity-core-private) ;;
  *)
    printf '%s\n' "Refusing unsafe runtime path: $runtime_root" >&2
    exit 1
    ;;
esac

trap 'rm -rf "$stage_root"' EXIT HUP INT TERM
mkdir -p "$stage_root/connectors/codex-entity-core" "$stage_root/packages/entity-core" "$config_root" "$log_root"

for name in deno.json deno.lock src scripts; do
  if [ -e "$connector_root/$name" ]; then
    cp -R "$connector_root/$name" "$stage_root/connectors/codex-entity-core/$name"
  fi
done
for name in deno.json src; do
  if [ -e "$addon_root/packages/entity-core/$name" ]; then
    cp -R "$addon_root/packages/entity-core/$name" "$stage_root/packages/entity-core/$name"
  fi
done
cp "$env_file" "$stable_env"
chmod 600 "$stable_env"

if [ -d "$runtime_root" ]; then
  backup_root=$runtime_root.previous
  rm -rf "$backup_root"
  mv "$runtime_root" "$backup_root"
fi
mv "$stage_root" "$runtime_root"
trap - EXIT HUP INT TERM

runtime_connector=$runtime_root/connectors/codex-entity-core
platform=$(psycheros_platform)
if [ "$platform" = darwin ]; then
  plist=$HOME/Library/LaunchAgents/ai.psycheros.chatgpt-bridge.plist
  mkdir -p "$(dirname "$plist")"
  deno_xml=$(xml_escape "$deno_path")
  env_xml=$(xml_escape "$stable_env")
  connector_xml=$(xml_escape "$runtime_connector")
  log_xml=$(xml_escape "$log_root")
  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ai.psycheros.chatgpt-bridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>$deno_xml</string>
    <string>run</string>
    <string>--node-modules-dir=none</string>
    <string>--env-file=$env_xml</string>
    <string>-A</string>
    <string>src/http.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$connector_xml</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$log_xml/chatgpt-bridge.log</string>
  <key>StandardErrorPath</key><string>$log_xml/chatgpt-bridge.error.log</string>
</dict>
</plist>
EOF
  launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$plist"
  launchctl kickstart -k "gui/$(id -u)/ai.psycheros.chatgpt-bridge"
else
  systemd_root=${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user
  service=$systemd_root/psycheros-chatgpt-bridge.service
  mkdir -p "$systemd_root"
  cat > "$service" <<EOF
[Unit]
Description=Psycheros Entity Core private bridge for ChatGPT
After=network-online.target

[Service]
Type=simple
WorkingDirectory="$runtime_connector"
EnvironmentFile="$stable_env"
ExecStart="$deno_path" run --node-modules-dir=none -A src/http.ts
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now psycheros-chatgpt-bridge.service
fi

if tailscale_path=$(find_tailscale); then
  TAILSCALE_BE_CLI=1 "$tailscale_path" funnel --bg --yes "$port" >/dev/null 2>&1 ||
    printf '%s\n' "[warn] The bridge is installed, but Tailscale Funnel could not be started automatically." >&2
fi

healthy=false
attempt=0
while [ "$attempt" -lt 30 ]; do
  attempt=$((attempt + 1))
  if command -v curl >/dev/null 2>&1 &&
    curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 1
done

printf 'Automatic bridge installed.\n'
printf 'Runtime: %s\nSettings: %s\nLogs: %s\n' "$runtime_root" "$stable_env" "$log_root"
if [ "$healthy" != true ]; then
  printf '%s\n' "[warn] The service was installed but did not answer its local health check yet. Open the error log above." >&2
  exit 1
fi
printf 'Local health check passed.\n'
