# Troubleshooting - Psycheros Entity Core for ChatGPT Private Bridge

This is not an official Psycheros release.

## ChatGPT Says It Cannot Connect

If automatic startup is not installed, check:

1. The local bridge terminal is still open.
2. The Tailscale Funnel terminal is still open.
3. The ChatGPT Server URL ends in `/mcp-lite` for the lightweight app.
4. The public base URL in OAuth/Auth0 does not end in `/mcp-lite` or `/mcp`.
5. The tunnel URL opens from another browser or device.

Run:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1
```

On macOS or Linux:

```sh
sh scripts/check-chatgpt-bridge-prereqs.sh
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

On macOS:

```sh
launchctl print gui/$(id -u)/ai.psycheros.chatgpt-bridge
curl http://127.0.0.1:3006/healthz
tail -f "$HOME/Library/Application Support/Psycheros/logs/chatgpt-bridge.error.log"
```

On Linux:

```sh
systemctl --user status psycheros-chatgpt-bridge.service
curl http://127.0.0.1:3006/healthz
journalctl --user -u psycheros-chatgpt-bridge.service -f
```

## OAuth Settings Spin Or Never Load

Common causes:

- the tunnel URL is not reachable
- the bridge is not running
- CORS headers are missing because the bridge version is old
- the ChatGPT URL was pasted without `/mcp-lite`

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

1. Confirm the public `/mcp-lite` endpoint returns tools.
2. Confirm the bridge version includes tool auth metadata.
3. Create a fresh private app only after checking the endpoint.

Command-line check:

```powershell
$body = @{ jsonrpc = "2.0"; id = "tools"; method = "tools/list"; params = @{} } |
  ConvertTo-Json -Depth 10

Invoke-WebRequest `
  -UseBasicParsing `
  -Method Post `
  -Uri "https://your-machine.your-tailnet.ts.net/mcp-lite" `
  -Headers @{ Accept = "application/json" } `
  -ContentType "application/json" `
  -Body $body
```

The response should include:

```text
search
fetch
remember
```

## ChatGPT Worked For A Few Days, Then Crashes While Connecting To App

There are three different failures that look alike in ChatGPT. Check which one
you have before rebuilding anything.

First, keep the bridge access log visible while reproducing the failure:

Windows:

```powershell
Get-Content "$env:APPDATA\Psycheros\logs\chatgpt-bridge.access.jsonl" -Wait
```

macOS:

```sh
tail -f "$HOME/Library/Application Support/Psycheros/logs/chatgpt-bridge.access.jsonl"
```

Linux:

```sh
tail -f "${XDG_DATA_HOME:-$HOME/.local/share}/Psycheros/logs/chatgpt-bridge.access.jsonl"
```

The access log records status, RPC method/tool, auth state, timing, and byte
counts. It does not record tokens, prompts, search terms, or tool arguments.

### No new `/mcp-lite` line appears

ChatGPT did not call the bridge. This rules out a local database or bridge
failure. If branching to a fresh chat immediately works, the active browser
thread's accumulated connector/context state is the likely boundary.

Use bridge v0.2.0 or later and the `/mcp-lite` endpoint. It exposes three small
tools, avoids duplicate result payloads, and bounds individual fetches. A local
connector cannot remove ChatGPT's own maximum conversation context, so a fresh
branch remains the recovery when the browser never sends a request.

### A new line has status `401`

This points to OAuth expiry or scopes before it points to the bridge.

First try:

1. Open ChatGPT Settings.
2. Open Apps.
3. Open the Psycheros app.
4. Click `Reconnect`.

If reconnect fixes it, update the Auth0/API setup before recreating the app:

1. Auth0 > Applications > APIs > Psycheros Entity Core > Settings.
2. Turn `Allow Offline Access` on.
3. Make sure `User-delegated Access` still allows the ChatGPT/Auth0 app.
4. When creating the ChatGPT app, set Base scopes to:

```text
offline_access
```

Keep Default scopes as:

```text
entity:read
memory:write
```

If ChatGPT does not let you edit OAuth scopes after creation, delete and
recreate the private app after changing Auth0. Use the `/mcp-lite` server URL
when you recreate it.

### A new line has status `200`

The bridge accepted and completed the request. Check `responseBytes`; a very
large result can age a long thread faster. Version 0.2.0 removes the former
double copy and defaults lite fetches to 4,000 characters. If ChatGPT still
fails after the 200 response, the failure is in ChatGPT's handling of the
successful tool result rather than local authentication or Entity Core.

## Browser Console Shows `QuotaExceededError` For `system-connectors`

This happens inside ChatGPT before the bridge is contacted. The local bridge can
be perfectly healthy and still receive no `/mcp-lite` request.

Use the lightweight endpoint for the normal ChatGPT app:

```text
https://your-machine.your-tailnet.ts.net/mcp-lite
```

It exposes only `search`, `fetch`, and `remember`, and avoids the large
connector inventory that can overflow ChatGPT's local `system-connectors`
cache.

The full `/mcp` endpoint also supports a smaller tool catalog. Add this line to
`bridge.env` and restart the bridge:

```text
ENTITY_CONNECTOR_OMIT_OUTPUT_SCHEMAS=true
```

Then clear ChatGPT site data once so ChatGPT can rebuild its connector cache
from the smaller descriptor. If the error returns even with a fresh site cache,
the remaining problem is in ChatGPT's account-side connector inventory rather
than the local bridge.

## Auth0 Login Works But Tool Calls Fail

Check the bridge terminal or `chatgpt-bridge.error.log` under the platform's
Psycheros log directory. If it says the token
audience/resource does not match, one of these is wrong:

- `ENTITY_CONNECTOR_OAUTH_RESOURCE`
- Auth0 API Identifier
- ChatGPT OAuth Resource field

All three should be the public base URL without `/mcp-lite` or `/mcp`.

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
