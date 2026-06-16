# Psycheros Entity Core for Codex

Portable Codex plugin wrapper for a local Psycheros entity-core.

This package includes:

- `.codex-plugin/plugin.json`
- `.mcp.json`
- `connectors/codex-entity-core`
- the small `packages/entity-core/src` source tree used by the connector

## Requirements

- Psycheros installed and initialized on the same computer.
- Deno available on `PATH`.

The connector defaults to:

```text
%APPDATA%\Psycheros\data\entity-core
```

If Psycheros stores entity-core somewhere else, edit `.mcp.json` and add:

```json
"ENTITY_CONNECTOR_DATA_DIR": "C:\\path\\to\\Psycheros\\data\\entity-core"
```

inside the `env` object.

## Install

1. Unzip this folder somewhere stable.
2. Install the folder as a local Codex plugin.
3. Start a new Codex thread and enable/use `psycheros-entity-core`.
4. Ask Codex to check Psycheros entity-core status.

## Tools

The MCP server can:

- check connector/entity-core status
- read identity context
- search memories and graph nodes
- fetch selected identity files, memories, or graph nodes
- record daily or significant memories when `ENTITY_CONNECTOR_WRITE_ENABLED` is `true`

Identity/core edits are intentionally not exposed.

Set this in `.mcp.json` to make the plugin read-only:

```json
"ENTITY_CONNECTOR_WRITE_ENABLED": "false"
```

