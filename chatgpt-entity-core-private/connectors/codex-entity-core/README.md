# Entity Core MCP Connector

Local and HTTPS-capable MCP adapter for a Psycheros Entity Core data directory.
It exposes a deliberately bounded continuity surface rather than creating a
second source of truth.

## Tools

- status and situational context
- selected identity context
- recent-memory and semantic search
- fetch by connector id
- daily or significant memory recording when writes are enabled

Identity-file mutation, memory deletion, and graph rewriting are not exposed.

## Data directory

The connector defaults to the installed Psycheros Entity Core location:

```text
%APPDATA%\Psycheros\data\entity-core
```

Set `ENTITY_CONNECTOR_DATA_DIR` when the data directory lives elsewhere. The
connector reads and writes that canonical directory directly; it does not copy
identity or memory into a connector-owned store.

## Local development

From this directory:

```powershell
deno task check
deno task smoke
```

Useful environment variables:

- `ENTITY_CONNECTOR_INSTANCE_ID` — source instance name, default `codex`
- `ENTITY_CONNECTOR_DATA_DIR` — Entity Core data directory override
- `ENTITY_CONNECTOR_WRITE_ENABLED` — set `false` for read-only operation

For the HTTPS bridge, use the repository's OAuth setup guide and smoke scripts.
Do not expose a private Entity Core directory through an unauthenticated public
endpoint.

## Trust boundary

The connector can read private identity and memory data. Memory writes are
limited to ordinary daily/significant records and can be disabled. Hosted use
requires HTTPS, bearer-token verification, and explicit OAuth configuration.
