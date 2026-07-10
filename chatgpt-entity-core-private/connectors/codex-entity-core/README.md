# Codex Entity-Core Connector

Local MCP adapter that lets Codex talk to Psycheros `entity-core` without
turning the connector into a second source of truth.

The connector can check status, retrieve identity context, read the most recent
memories, search memories/graph nodes, fetch an item returned by search, and
record new daily or significant memories. Identity/core mutation is deliberately
not exposed yet: ordinary memory writes are useful immediately, while identity
changes need a review workflow.

It has two entrypoints:

- `src/server.ts` - stdio MCP for the local Codex plugin
- `src/http.ts` - Streamable HTTP MCP for private ChatGPT Developer Mode testing

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
- `recent_memories` - returns recent memories across surfaces, ordered by the
  memory's own date by default
- `search` - searches memories and knowledge graph nodes
- `fetch` - fetches a memory, graph node, or identity file by connector ID

The `search` and `fetch` tools use the standard connector-friendly input and
output shapes:

- `search(query)` returns `{ results: [{ id, title, url, ... }] }`
- `fetch(id)` returns `{ id, title, text, url, metadata, ... }`

`recent_memories({ limit, hours, granularities })` is a complementary read-only
tool for current continuity. Memory results from `recent_memories`, `search`,
and `fetch` include `chatIds`, `sourceMemoryIds`, participating instances, and
compact source-memory context when available. Keyword search uses the shared
SQLite FTS5 index after a one-time backfill, with a filesystem fallback.

Tool responses include the same object as `structuredContent` and as
JSON-encoded text content for MCP compatibility, while preserving the richer
Psycheros payloads that Codex already uses.

IDs currently look like:

- `memory:<encoded-memory-key>`
- `graph:node-id`
- `identity:self/my_identity.md`

`record_memory` returns the `memory:<encoded-memory-key>` ID for the written
file. Pass that ID to `fetch` to verify the write.

## How To Use It From Codex

The local Codex plugin wrapper lives at:

```text
C:\Users\rache\plugins\psycheros-entity-core
```

It is listed in the personal marketplace file:

```text
C:\Users\rache\.agents\plugins\marketplace.json
```

Once that plugin is enabled in Codex, use natural requests like:

- "Check entity status."
- "Load my identity context."
- "Search my entity-core memory for browser addon notes."
- "Record this browser extension milestone as a significant memory."
- "Fetch memory:significant%2F2026-06-11_example-slug."

The first call should usually be `entity_status`, because it confirms which
entity-core data directory the connector is reading.

## Codex Plugin Wrapper

The personal plugin wrapper exposes this connector as an MCP server named
`psycheros-entity-core`. Its `.mcp.json` points at this repo connector and uses
the installed Psycheros data directory:

```text
C:\Users\rache\AppData\Roaming\Psycheros\data\entity-core
```

Validation checklist:

```powershell
cd "H:\Cathedral Revamp - Psycheros\connectors\codex-entity-core"
deno task check
deno task smoke
deno task smoke:http
deno task smoke:oauth

cd "C:\Users\rache\.codex\skills\.system\plugin-creator"
python scripts\validate_plugin.py "C:\Users\rache\plugins\psycheros-entity-core"
```

Current status:

- Plugin scaffold and marketplace entry exist.
- Plugin validation passes.
- MCP smoke test passes, including a write/fetch/search round trip against a
  temporary entity-core data directory.
- Streamable HTTP smoke test passes, including tool discovery, status, and a
  dry-run write against a temporary entity-core data directory.
- OAuth-mode HTTP smoke test passes, including protected-resource metadata, tool
  `securitySchemes`, tool-level `mcp/www_authenticate`, and invalid-token
  `WWW-Authenticate` behavior.
- The connector can create daily/significant memories. Identity writes are not
  exposed.
- The connector reads entity-core files directly. A future launcher-aware helper
  can start Psycheros automatically if the daemon is not already running.

## Run Locally

```powershell
cd "H:\Cathedral Revamp - Psycheros\connectors\codex-entity-core"
deno task start
```

`deno task start` is the stdio path for Codex. HTTP MCP supports three modes:

- `none` - only for local smoke tests or dummy-data proof-of-life work
- `static-bearer` - local/API debugging guard; ChatGPT cannot use this as its
  normal connector auth flow
- `oauth` - ChatGPT/live-data path

```powershell
cd "H:\Cathedral Revamp - Psycheros\connectors\codex-entity-core"
$env:ENTITY_CONNECTOR_HTTP_AUTH_MODE = "static-bearer"
$env:ENTITY_CONNECTOR_HTTP_BEARER_TOKEN = "<long-random-token>"
deno task start:http
```

The bearer-token guard is useful for local/API Playground testing and prevents
accidental unauthenticated tunnel exposure. ChatGPT connector setup does not
currently provide a static bearer-token field in the normal connector creation
flow, so real private ChatGPT access to live entity-core data should use MCP
OAuth. For a temporary ChatGPT proof-of-life against dummy or intentionally
limited data, you can set `ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED=true`
while the tunnel is actively supervised.

For OAuth mode:

```powershell
cd "H:\Cathedral Revamp - Psycheros\connectors\codex-entity-core"
$env:ENTITY_CONNECTOR_HTTP_AUTH_MODE = "oauth"
$env:ENTITY_CONNECTOR_PUBLIC_BASE_URL = "https://<your-tunnel-or-host>"
$env:ENTITY_CONNECTOR_OAUTH_RESOURCE = "https://<your-tunnel-or-host>"
$env:ENTITY_CONNECTOR_OAUTH_ISSUER = "https://<your-auth-provider-issuer>"
$env:ENTITY_CONNECTOR_OAUTH_AUDIENCE = "<optional-provider-api-audience>"
deno task start:http
```

For a private ChatGPT bridge, prefer the helper scripts:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1 -RunDenoCheck

.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://<your-tailscale-host>" `
  -OAuthIssuer "https://<your-auth0-domain>"
```

In a second terminal:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

To validate the common Auth0 API/resource-server setup problem without exposing
the client secret:

```powershell
.\scripts\test-auth0-chatgpt-authorize.ps1 `
  -Auth0Domain "<your-auth0-domain>" `
  -ClientId "<auth0-client-id>" `
  -CallbackUrl "https://chatgpt.com/connector/oauth/<callback-id>" `
  -PublicBaseUrl "https://<your-tailscale-host>"
```

The HTTP server publishes protected-resource metadata at
`/.well-known/oauth-protected-resource`. In OAuth mode, tools advertise `oauth2`
security schemes and return `mcp/www_authenticate` challenges when ChatGPT needs
to link or reauthorize.

Because this connector is intentionally standalone inside the larger Psycheros
workspace, Deno may warn that its config is not a parent-workspace member. That
warning is harmless for local connector runs.

Useful environment variables:

- `ENTITY_CONNECTOR_INSTANCE_ID` - defaults to `codex`
- `ENTITY_CONNECTOR_DATA_DIR` - overrides the entity-core data directory
- `ENTITY_CONNECTOR_WRITE_ENABLED` - defaults to enabled; set to `false` for a
  read-only connector
- `ENTITY_CONNECTOR_HTTP_HOST` - defaults to `127.0.0.1`
- `ENTITY_CONNECTOR_HTTP_PORT` - defaults to `3006`
- `ENTITY_CONNECTOR_HTTP_PATH` - defaults to `/mcp`
- `ENTITY_CONNECTOR_HTTP_AUTH_MODE` - `oauth`, `static-bearer`, or `none`
- `ENTITY_CONNECTOR_PUBLIC_BASE_URL` - public HTTPS base URL ChatGPT sees
- `ENTITY_CONNECTOR_HTTP_BEARER_TOKEN` - required for `static-bearer` mode
- `ENTITY_CONNECTOR_OAUTH_RESOURCE` - OAuth protected resource identifier;
  usually the public HTTPS base URL
- `ENTITY_CONNECTOR_OAUTH_ISSUER` - authorization server issuer URL
- `ENTITY_CONNECTOR_OAUTH_JWKS_URI` - optional signing-key URL; when omitted,
  the connector discovers it from the issuer metadata
- `ENTITY_CONNECTOR_OAUTH_AUDIENCE` - optional provider API audience; when
  omitted, tokens must contain `aud` or `resource` matching
  `ENTITY_CONNECTOR_OAUTH_RESOURCE`
- `ENTITY_CONNECTOR_OAUTH_EXPIRY_WARNING_SECONDS` - seconds before token expiry
  when the connector should fail fast with a ChatGPT reauthorize message;
  defaults to `120`, set `0` to disable the pre-expiry warning
- `ENTITY_CONNECTOR_RESOURCE_DOCUMENTATION` - optional documentation URL in
  protected-resource metadata
- `ENTITY_CONNECTOR_HTTP_ALLOW_UNAUTHENTICATED` - local smoke-test escape hatch;
  do not use for a tunneled connector

By default, the connector prefers the installed Psycheros data directory at
`%APPDATA%\Psycheros\data\entity-core`, then falls back to the repo data
directory at `packages/entity-core/data`.

This connector expects the Psycheros launcher or daemon supervisor to own daemon
lifecycle. It reads the daemon-managed files, but it does not start or stop the
daemon itself.

For a local Codex MCP config, point the server command at:

```json
{
  "command": "deno",
  "args": [
    "run",
    "--node-modules-dir=none",
    "-A",
    "H:\\Cathedral Revamp - Psycheros\\connectors\\codex-entity-core\\src\\server.ts"
  ],
  "env": {
    "ENTITY_CONNECTOR_INSTANCE_ID": "codex",
    "ENTITY_CONNECTOR_DATA_DIR": "C:\\Users\\rache\\AppData\\Roaming\\Psycheros\\data\\entity-core",
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

## Private ChatGPT App Path

This connector is intended for a private ChatGPT Developer Mode path before any
public app submission. The minimum local setup is:

1. Enable ChatGPT Developer Mode.
2. Create or configure an OAuth app/API in an identity provider that supports
   authorization-code + PKCE and publishes OAuth/OIDC discovery metadata.
3. Configure the provider to issue tokens for the MCP resource URL and include
   scopes `entity:read` and `memory:write`.
4. Add ChatGPT's callback URL from the connector setup page to the provider's
   allowed redirect URLs.
5. Run `deno task start:http` in OAuth mode and expose `/mcp` through a private
   HTTPS tunnel or stable HTTPS host.
6. Add the HTTPS MCP URL in ChatGPT's connector setup.
7. Keep identity/core mutation behind a future review workflow.

For anything beyond personal/private development, use a hosted HTTPS MCP server
with OAuth 2.1, bearer-token verification, no unauthenticated memory access, and
write tools gated by a review/sandbox flow. It can reuse this connector's tool
contracts, but it should not expose a private local `entity-core` directory
directly.
