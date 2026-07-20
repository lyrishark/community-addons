# Psycheros Entity Core for ChatGPT - Private Bridge

Community alpha addon that lets a private ChatGPT Developer Mode app read and
record memories in a local Psycheros entity-core through MCP.

This is not an official Psycheros release.

> **Psycheros 0.9.0 status:** Compatible. The current `0.1.3` source passed
> type-check, stdio and HTTP MCP smoke tests, and a live OAuth bridge health
> check on 2026-07-19. The public GitHub release is still `0.1.1`; `0.1.3` is
> prepared but must not be described as publicly released yet.

This is also not a public ChatGPT app. Each user runs the bridge on their own
computer and connects it to their own ChatGPT account.

## Who This Is For

Use this if you want ChatGPT to access your local Psycheros entity-core but you
do not use Codex.

You still need:

- Psycheros installed on the same computer.
- Deno installed.
- A public HTTPS tunnel, such as Tailscale Funnel.
- An OAuth provider account, such as Auth0.
- ChatGPT Developer Mode access for private apps/connectors.

If you do use Codex, the simpler local plugin track is:

```text
codex-entity-core-plugin/
```

## What It Does

ChatGPT can:

- search memories and graph nodes
- fetch selected memories or graph nodes
- record ordinary daily or significant memories when writes are enabled

The recommended ChatGPT app uses the lightweight MCP endpoint. It exposes only
`search`, `fetch`, and `remember`, which keeps ChatGPT's connector cache small.

The full MCP endpoint is still available for debugging and admin-style use. It
adds status, identity context, recent-memory controls, and the older
`record_memory` tool.

ChatGPT cannot:

- edit identity files directly
- delete memories
- rewrite graph nodes directly
- use the bridge when your local server or tunnel is off
- use the bridge without OAuth authorization

## Quick Setup Map

There are four pieces:

1. Local bridge: runs the MCP server on your computer.
2. Tunnel: gives ChatGPT an HTTPS URL for the local bridge.
3. OAuth: lets ChatGPT sign in without exposing the bridge to everyone.
4. ChatGPT private app: points ChatGPT at the HTTPS MCP URL.

The recommended ChatGPT URL shape is:

```text
https://your-machine.your-tailnet.ts.net/mcp-lite
```

The full/admin URL shape is:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

The OAuth resource/API identifier should be the same URL without `/mcp-lite` or
`/mcp`:

```text
https://your-machine.your-tailnet.ts.net
```

## Helper Scripts

Non-technical path: double-click the numbered `.bat` files in this folder.
After the connection works, number 5 installs automatic startup and crash
recovery so no terminal window has to stay open.

Manual path: open PowerShell in `connectors\codex-entity-core`.

Check local prerequisites:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1 -RunDenoCheck
```

Start the local MCP bridge:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com"
```

Or copy `bridge.env.example` to `connectors\codex-entity-core\bridge.env`,
edit it, and run:

```powershell
.\scripts\start-chatgpt-bridge.ps1 -EnvFile .\bridge.env
```

In a second terminal, start Tailscale Funnel:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

After testing the connection, install the supervised Windows startup task:

```powershell
.\scripts\install-chatgpt-bridge-autostart.ps1 -EnvFile .\bridge.env
```

The task uses a stable runtime copy under `%APPDATA%\Psycheros\addons`, restarts
the bridge after crashes or failed health checks, and writes logs under
`%APPDATA%\Psycheros\logs`.

After configuring Auth0, test the common Auth0 resource-server problem:

```powershell
.\scripts\test-auth0-chatgpt-authorize.ps1 `
  -Auth0Domain "your-tenant.us.auth0.com" `
  -ClientId "YOUR_AUTH0_CLIENT_ID" `
  -CallbackUrl "https://chatgpt.com/connector/oauth/YOUR_CALLBACK_ID" `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net"
```

That script does not need your client secret.

## Full Setup

If you are not technical, start with:

```text
START_HERE.md
```

It uses the numbered double-click files in this folder.

Use:

```text
SETUP.md
```

It is written as a click-by-click guide for non-developers.

## Safety Defaults

The bridge uses OAuth mode for ChatGPT. Do not use unauthenticated mode with a
public tunnel.

Memory writes are enabled by default in the alpha because ordinary memory
recording is the point of the bridge. To make the bridge read-only, start it
with:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com" `
  -WriteEnabled $false
```

Identity/core edits are intentionally not exposed. A future governance flow
should propose identity changes for user review before any core mutation.

## Troubleshooting

Use:

```text
TROUBLESHOOTING.md
```

Most failures are one of:

- the local bridge is not running
- the tunnel URL was copied with or without `/mcp-lite` or `/mcp` in the wrong
  field
- the Auth0 API identifier does not exactly match the public base URL
- Auth0 API permissions are missing `entity:read` or `memory:write`
- Auth0 Application Access does not allow the ChatGPT OAuth app

## Source and Issues

Source:

```text
https://github.com/lyrishark/community-addons
```

Issues:

```text
https://github.com/lyrishark/community-addons/issues
```
