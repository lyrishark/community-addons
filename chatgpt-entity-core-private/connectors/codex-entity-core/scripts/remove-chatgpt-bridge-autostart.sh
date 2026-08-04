#!/bin/sh

set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$script_dir/platform-common.sh"

if [ "$(psycheros_platform)" = darwin ]; then
  plist=$HOME/Library/LaunchAgents/ai.psycheros.chatgpt-bridge.plist
  if [ -f "$plist" ]; then
    launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
    rm -f "$plist"
  fi
else
  service=${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/psycheros-chatgpt-bridge.service
  systemctl --user disable --now psycheros-chatgpt-bridge.service >/dev/null 2>&1 || true
  rm -f "$service"
  systemctl --user daemon-reload
fi

printf 'Automatic startup removed. Bridge settings, runtime files, data, and logs were kept.\n'
