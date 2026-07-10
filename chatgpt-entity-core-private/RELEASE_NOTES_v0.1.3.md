# ChatGPT Entity-Core Private Bridge v0.1.3

## Changed

- Added a lightweight ChatGPT endpoint at `/mcp-lite`.
- The recommended private ChatGPT app now uses only three tools:
  `search`, `fetch`, and `remember`.
- The full `/mcp` endpoint remains available for diagnostics and admin-style
  use.
- Lite tool descriptors omit output schemas and keep the ChatGPT connector
  inventory much smaller.
- `remember` writes ordinary daily memories by default and can write
  significant memories when requested.
- Plain daily-memory text is normalized into bullet form so it merges correctly
  with existing daily memory files.
- HTTP and OAuth smoke tests now verify the lite endpoint, tool catalog, OAuth
  metadata, and `remember -> search -> fetch`.
- Setup docs now direct normal companion users to `/mcp-lite` while keeping
  Auth0/OAuth resources on the pathless public base URL.

Use this ChatGPT Server URL shape:

```text
https://your-machine.your-tailnet.ts.net/mcp-lite
```

Keep the Auth0 API Identifier/OAuth Resource as:

```text
https://your-machine.your-tailnet.ts.net
```
