#!/bin/sh
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
sh "$root/connectors/codex-entity-core/scripts/remove-chatgpt-bridge-autostart.sh"
status=$?
printf '\nPress Return to close...'
read -r _
exit "$status"
