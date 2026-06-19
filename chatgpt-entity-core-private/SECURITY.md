# Security Notes - Psycheros Entity Core for ChatGPT Private Bridge

Psycheros Entity Core for ChatGPT Private Bridge exposes a local MCP server to
ChatGPT through a public HTTPS tunnel and OAuth.

This is not an official Psycheros release.

## Security Model

- Local MCP server runs on the user's computer.
- Public HTTPS tunnel forwards ChatGPT traffic to the local server.
- OAuth is required for ChatGPT access.
- Access tokens are verified by the bridge.
- Tools use explicit scopes:
  - `entity:read`
  - `memory:write`
- Direct identity/core mutation is not exposed.
- Memory deletion is not exposed.

## Main Risk

Entity-core contains private identity, relationship, and memory data.

If you connect ChatGPT to it, that content can become part of the active
ChatGPT conversation and tool context.

Only connect this bridge to ChatGPT accounts and workspaces where that is
acceptable to you.

## Never Do This

- Do not run the bridge in unauthenticated mode behind a public tunnel.
- Do not share your OAuth client secret.
- Do not use someone else's Auth0 tenant unless you understand who controls it.
- Do not point the bridge at an entity-core directory you do not own.
- Do not leave a public tunnel running when you are done testing.

## Recommended User Safety

- Install only from the public source repository or release page.
- Keep the local bridge and tunnel terminals visible while testing.
- Use a unique Auth0 app/API for this bridge.
- Verify the Auth0 API Identifier exactly matches the public base URL.
- Grant only `entity:read` and `memory:write`.
- Start in read-only mode if you only want search/context:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com" `
  -WriteEnabled $false
```

## Reporting Security Issues

Please do not post security-sensitive reports publicly.

Report privately through:

```text
https://github.com/lyrishark/community-addons/issues
```

