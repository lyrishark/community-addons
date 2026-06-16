# Codex Entity-Core Connector

Local MCP adapter that lets Codex talk to Psycheros `entity-core` without
turning the connector into a second source of truth.

The connector can check status, retrieve identity context, search memories/graph
nodes, fetch an item returned by search, and record new daily or significant
memories. Identity/core mutation is deliberately not exposed yet: ordinary
memory writes are useful immediately, while identity changes need a review
workflow.

## Why This Shape

Current Psycheros guidance says `entity-core` is canonical for identity and
memory. This connector keeps that contract by using the real entity-core data
directory and storage/tool modules directly, while exposing a smaller
read-oriented MCP surface for Codex or another local client.

OpenAI Apps SDK guidance points the same way:

- keep tools narrow and predictable
- separate read tools from write tools
- use a tool-only app when no UI is needed
- use OAuth for hosted apps that expose private user data or write actions
- add tool annotations and explicit confirmation semantics before destructive or
  mutating tools

For this local Codex connector, "write" currently means "create a new memory
file or merge a daily memory for this connector's source instance." It does not
rewrite identity files, delete memories, overwrite significant memories, or edit
the graph directly.

## Tools

- `entity_status` - checks the connector and canonical entity-core data path
- `record_memory` - records a new `daily` or `significant` memory
- `identity_context` - returns selected identity files from entity-core
- `search` - searches memories and knowledge graph nodes
- `fetch` - fetches a memory, graph node, or identity file by connector ID

IDs currently look like:

- `memory:<encoded-memory-key>`
- `graph:node-id`
- `identity:self/my_identity.md`

`record_memory` returns the `memory:<encoded-memory-key>` ID for the written
file. Pass that ID to `fetch` to verify the write.

## How To Use It From Codex

Once the plugin folder is installed and enabled in Codex, use natural requests
like:

- "Check entity status."
- "Load my identity context."
- "Search my entity-core memory for browser addon notes."
- "Record this browser extension milestone as a significant memory."
- "Fetch memory:significant%2F2026-06-11_example-slug."

The first call should usually be `entity_status`, because it confirms which
entity-core data directory the connector is reading.

## Codex Plugin Wrapper

The plugin wrapper exposes this connector as an MCP server named
`psycheros-entity-core`. Its `.mcp.json` uses this included connector folder and
defaults to the installed Psycheros data directory:

```text
%APPDATA%\Psycheros\data\entity-core
```

Current status:

- Plugin scaffold and marketplace entry exist.
- Plugin validation passes.
- MCP smoke test passes, including a write/fetch/search round trip against a
  temporary entity-core data directory.
- The connector can create daily/significant memories. Identity writes are not
  exposed.
- The connector reads entity-core files directly. A future launcher-aware helper
  can start Psycheros automatically if the daemon is not already running.

## Run Locally

```powershell
cd ".\connectors\codex-entity-core"
deno task start
```

Because this connector is intentionally standalone inside the larger Psycheros
workspace, Deno may warn that its config is not a parent-workspace member. That
warning is harmless for local connector runs.

Useful environment variables:

- `ENTITY_CONNECTOR_INSTANCE_ID` - defaults to `codex`
- `ENTITY_CONNECTOR_DATA_DIR` - overrides the entity-core data directory
- `ENTITY_CONNECTOR_WRITE_ENABLED` - defaults to enabled; set to `false` for a
  read-only connector

By default, the connector prefers the installed Psycheros data directory at
`%APPDATA%\Psycheros\data\entity-core`, then falls back to the repo data
directory at `packages/entity-core/data`.

This connector expects the Psycheros launcher or daemon supervisor to own daemon
lifecycle. It reads the daemon-managed files, but it does not start or stop the
daemon itself.

For a local Codex MCP config, point the server command at:

```json
{
  "cwd": "./connectors/codex-entity-core",
  "command": "deno",
  "args": [
    "run",
    "--node-modules-dir=none",
    "-A",
    "src/server.ts"
  ],
  "env": {
    "ENTITY_CONNECTOR_INSTANCE_ID": "codex",
    "ENTITY_CONNECTOR_WRITE_ENABLED": "true"
  }
}
```

## Governance Direction

Use one connector with explicit modes rather than maintaining two separate
plugins. The default local mode can write ordinary memories because that is what
most local Codex users will expect. More sensitive mutation should be separate:

- ordinary memory writes: allowed through `record_memory`
- identity/core edits: future reviewed workflow, not direct write
- sandbox/temp notes: future staging area before becoming canonical memory

A future `request_identity_update` tool can produce a proposed change and let
the user accept, decline, or edit it in a Psycheros/Codex UI surface before it
touches core identity files.

## Hosted ChatGPT App Path

This local stdio connector is not enough for a shared ChatGPT app. The hosted
version should be a separate HTTPS MCP server with OAuth 2.1, bearer-token
verification, no unauthenticated memory access, and write tools gated by a
review/sandbox flow. It can reuse this connector's tool contracts, but it should
not expose a private local `entity-core` directory directly.
