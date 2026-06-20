# Quickstart - ChatGPT Private Bridge

This is the short path. If anything fails, use `SETUP.md` and
`TROUBLESHOOTING.md`.

This is not an official Psycheros release.

## 1. Install Requirements

Install:

- Psycheros
- Deno
- Tailscale

Create or log into:

- Auth0
- ChatGPT with Developer Mode private apps/connectors

## 2. Check Your Computer

Open PowerShell in `connectors\codex-entity-core`.

Run:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1 -RunDenoCheck
```

Fix red `[fail]` lines before continuing.

## 3. Start Tailscale Funnel

In PowerShell:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

Copy the HTTPS URL Tailscale prints.

Public base URL:

```text
https://your-machine.your-tailnet.ts.net
```

ChatGPT MCP URL:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

## 4. Configure Auth0

Create:

- one Regular Web Application
- one API

Auth0 API Identifier must be the public base URL without `/mcp`:

```text
https://your-machine.your-tailnet.ts.net
```

Auth0 API permissions:

```text
entity:read
memory:write
```

Auth0 Application token endpoint auth method:

```text
client_secret_post
```

Auth0 API Settings:

```text
User-delegated Access: All apps allowed
```

## 5. Start The Bridge

In another PowerShell window:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com"
```

Leave this terminal open until the connection test succeeds.

Optional: copy `bridge.env.example` to
`connectors\codex-entity-core\bridge.env`, fill in your URLs, then start with:

```powershell
.\scripts\start-chatgpt-bridge.ps1 -EnvFile .\bridge.env
```

## 6. Create ChatGPT App

In ChatGPT private app setup:

- Server URL: `https://your-machine.your-tailnet.ts.net/mcp`
- Authentication: OAuth
- Registration method: User-Defined OAuth Client
- Client ID: from Auth0 Application
- Client Secret: from Auth0 Application
- Token endpoint auth method: `client_secret_post`
- Default scopes: `entity:read`, `memory:write`
- Base scopes: blank

Copy ChatGPT's callback URL into Auth0 Application > Allowed Callback URLs.

## 7. Test Auth0

```powershell
.\scripts\test-auth0-chatgpt-authorize.ps1 `
  -Auth0Domain "your-tenant.us.auth0.com" `
  -ClientId "YOUR_AUTH0_CLIENT_ID" `
  -CallbackUrl "https://chatgpt.com/connector/oauth/YOUR_CALLBACK_ID" `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net"
```

Good:

```text
[ok] Auth0 accepted the client/resource/scopes and redirected to login.
```

## 8. Connect

Create the app in ChatGPT, click Connect, and sign in through Auth0.

Try:

```text
Use Psycheros Entity Core to check entity status.
```

## 9. Enable Automatic Startup

After the bridge works, run:

```powershell
.\scripts\install-chatgpt-bridge-autostart.ps1 -EnvFile .\bridge.env
```

Or double-click `5 Keep Bridge Running Automatically.bat` from the addon root.
The supervised task starts at sign-in and recovers from bridge crashes or
failed local health checks.
