#!/bin/sh
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
env_file=$root/connectors/codex-entity-core/bridge.env
[ -f "$env_file" ] || cp "$root/bridge.env.example" "$env_file"
if [ "$(uname -s)" = Darwin ]; then
  open -a TextEdit "$env_file"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$env_file"
else
  "${EDITOR:-vi}" "$env_file"
fi
