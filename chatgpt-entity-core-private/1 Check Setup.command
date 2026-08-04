#!/bin/sh
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
sh "$root/connectors/codex-entity-core/scripts/check-chatgpt-bridge-prereqs.sh" "$root/connectors/codex-entity-core/bridge.env" --deno-check
status=$?
printf '\nPress Return to close...'
read -r _
exit "$status"
