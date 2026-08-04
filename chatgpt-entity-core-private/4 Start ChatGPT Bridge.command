#!/bin/sh
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec sh "$root/connectors/codex-entity-core/scripts/start-chatgpt-bridge.sh"
