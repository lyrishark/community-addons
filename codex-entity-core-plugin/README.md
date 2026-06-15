# Psycheros Entity Core for Codex

Community alpha Codex plugin that lets Codex read and record memories in a
local Psycheros entity-core.

This is not an official Psycheros release.

## What It Does

This plugin exposes a local MCP server to Codex.

Codex can:

- check entity-core status
- read identity context
- search memories and graph nodes
- fetch selected memories, identity files, or graph nodes
- record ordinary daily or significant memories when writes are enabled

Codex cannot:

- edit identity files directly
- delete memories
- rewrite graph nodes directly
- send data to a hosted service through this plugin

## Requirements

- Psycheros installed and initialized on the same computer.
- Codex desktop with local plugin support.
- Deno available on `PATH`.

By default, the connector looks for entity-core at:

```text
%APPDATA%\Psycheros\data\entity-core
```

If Psycheros uses a different data directory, edit `.mcp.json` and add
`ENTITY_CONNECTOR_DATA_DIR`.

## Install

Download the latest release:

```text
https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1
```

Then:

1. Unzip the plugin folder somewhere stable.
2. Install or enable the folder as a local Codex plugin.
3. Start a new Codex thread.
4. Ask Codex: "Check Psycheros entity-core status."

If status succeeds, ask Codex to load identity context or search memories.

## Write Mode

The packaged alpha build enables ordinary memory writes by default:

```json
"ENTITY_CONNECTOR_WRITE_ENABLED": "true"
```

This allows Codex to create or merge daily memories and create significant
memories with `sourceInstance` set to `codex`.

To make the plugin read-only, set:

```json
"ENTITY_CONNECTOR_WRITE_ENABLED": "false"
```

Identity/core edits are intentionally not exposed. A future governance flow
should propose identity changes for user review before any core mutation.

## Tools

- `entity_status`
- `identity_context`
- `search`
- `fetch`
- `record_memory`

## Validation

The share package was validated with:

- Deno check
- Codex plugin validation
- connector smoke test, including temporary write/fetch/search

## Source and Issues

Source:

```text
https://github.com/lyrishark/community-addons
```

Issues:

```text
https://github.com/lyrishark/community-addons/issues
```



