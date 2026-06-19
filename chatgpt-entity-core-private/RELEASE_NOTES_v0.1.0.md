# Release Notes - Psycheros Entity Core for ChatGPT Private Bridge v0.1.0

Community alpha. Not an official Psycheros release.

## Added

- Private ChatGPT Developer Mode setup path for Psycheros entity-core.
- OAuth-protected Streamable HTTP MCP bridge.
- Tool surface:
  - `entity_status`
  - `identity_context`
  - `search`
  - `fetch`
  - `record_memory`
- Auth0-compatible OAuth setup guidance.
- Tailscale Funnel setup guidance.
- Windows PowerShell helper scripts:
  - `check-chatgpt-bridge-prereqs.ps1`
  - `start-chatgpt-bridge.ps1`
  - `start-tailscale-funnel.ps1`
  - `test-auth0-chatgpt-authorize.ps1`

## Validated

- Deno check.
- OAuth smoke test.
- Public `/mcp` tool discovery with JSON responses.
- Auth0 authorization flow with custom API/resource scopes.
- Private ChatGPT app connection.

## Known Limitations

- This is not a public approved ChatGPT app.
- Each user must run their own local bridge, tunnel, and OAuth app.
- Setup still requires several manual Auth0 and ChatGPT clicks.
- Existing ChatGPT private apps may not allow editing the icon after creation.
- Direct identity/core mutation is intentionally not exposed.

## Suggested Release Asset

```text
psycheros-entity-core-chatgpt-private-0.1.0.zip
```

