# Troubleshooting - Psycheros Entity Core for ChatGPT Private Bridge

This is not an official Psycheros release.

## ChatGPT Says It Cannot Connect

If automatic startup is not installed, check:

1. The local bridge terminal is still open.
2. The Tailscale Funnel terminal is still open.
3. The ChatGPT Server URL ends in `/mcp`.
4. The public base URL in OAuth/Auth0 does not end in `/mcp`.
5. The tunnel URL opens from another browser or device.

Run:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1
```

## ChatGPT Shows 502 Bad Gateway

This means the public Tailscale Funnel is alive but the local bridge is not
listening behind it.

If you enabled automatic startup, check it in PowerShell:

```powershell
Get-ScheduledTask -TaskName "Psycheros ChatGPT Bridge"
Invoke-RestMethod http://127.0.0.1:3006/healthz
```

If the task is missing, double-click:

```text
5 Keep Bridge Running Automatically.bat
```

The automatic task starts at sign-in and supervises both the bridge process and
its local health endpoint. Logs are in:

```text
%APPDATA%\Psycheros\logs\chatgpt-bridge.error.log
%APPDATA%\Psycheros\logs\chatgpt-bridge.supervisor.log
```

## OAuth Settings Spin Or Never Load

Common causes:

- the tunnel URL is not reachable
- the bridge is not running
- CORS headers are missing because the bridge version is old
- the ChatGPT URL was pasted without `/mcp`

Make sure you are using a bridge version with ChatGPT CORS support.

## Auth0 Error: Not Authorized To Access Resource Server

This means Auth0 does not allow this OAuth app to request tokens for the
Psycheros API/resource.

Run:

```powershell
.\scripts\test-auth0-chatgpt-authorize.ps1 `
  -Auth0Domain "your-tenant.us.auth0.com" `
  -ClientId "YOUR_AUTH0_CLIENT_ID" `
  -CallbackUrl "https://chatgpt.com/connector/oauth/YOUR_CALLBACK_ID" `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net"
```

Fix in Auth0:

1. Applications > APIs > Psycheros Entity Core.
2. Identifier must exactly equal the public base URL.
3. Permissions must include `entity:read` and `memory:write`.
4. Settings > Application Access Policy > User-delegated Access must allow the
   Auth0 app.
5. Save.

## ChatGPT Creates The App But Shows No Actions

Click Refresh on the app detail page.

If actions still do not appear:

1. Confirm the public `/mcp` endpoint returns tools.
2. Confirm the bridge version includes output schemas and tool auth metadata.
3. Create a fresh private app only after checking the endpoint.

Command-line check:

```powershell
$body = @{ jsonrpc = "2.0"; id = "tools"; method = "tools/list"; params = @{} } |
  ConvertTo-Json -Depth 10

Invoke-WebRequest `
  -UseBasicParsing `
  -Method Post `
  -Uri "https://your-machine.your-tailnet.ts.net/mcp" `
  -Headers @{ Accept = "application/json" } `
  -ContentType "application/json" `
  -Body $body
```

The response should include:

```text
entity_status
record_memory
identity_context
search
fetch
```

## Auth0 Login Works But Tool Calls Fail

Check the bridge terminal or
`%APPDATA%\Psycheros\logs\chatgpt-bridge.error.log`. If it says the token
audience/resource does not match, one of these is wrong:

- `ENTITY_CONNECTOR_OAUTH_RESOURCE`
- Auth0 API Identifier
- ChatGPT OAuth Resource field

All three should be the public base URL without `/mcp`.

If the response says the ChatGPT connector OAuth token has expired or will
expire soon, open the connector/app details in ChatGPT and use Refresh,
Reconnect, or sign in again before retrying the tool call. The bridge returns
this warning before token expiry by default so long chats do not sit waiting for
an authenticator timeout. The warning window defaults to 120 seconds and can be
changed with `ENTITY_CONNECTOR_OAUTH_EXPIRY_WARNING_SECONDS`.

## Tailscale Funnel Problems

Tailscale Funnel requires:

- MagicDNS enabled
- HTTPS certificates enabled
- Funnel allowed in tailnet policy
- a supported Funnel HTTPS port

The helper script uses the simple current Tailscale path:

```powershell
tailscale funnel 3006
```

Tailscale prints the public HTTPS URL. Use that URL as the public base URL.

Official Tailscale docs:

```text
https://tailscale.com/docs/features/tailscale-funnel
https://tailscale.com/docs/reference/tailscale-cli/funnel
```

## I Closed A Terminal Window

Start it again.

Bridge:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com"
```

Tunnel:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

Then click Refresh or Reconnect in ChatGPT.

## I Want Read-Only Mode

Start the bridge with:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com" `
  -WriteEnabled $false
```

You can also remove or avoid granting `memory:write`, but the easiest supported
path is disabling writes in the local bridge.

## I Accidentally Made Several Draft Apps

Keep the one that connects.

In ChatGPT app settings, delete stale draft apps only after the working app has
been tested.
