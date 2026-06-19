# Setup - Psycheros Entity Core for ChatGPT Private Bridge

This guide assumes you are not using Codex. You are setting up ChatGPT to talk
to your local Psycheros entity-core through a private MCP app.

This is not an official Psycheros release.

## Before You Start

You need accounts or apps for:

- ChatGPT with Developer Mode private apps/connectors.
- Auth0 or another OAuth/OIDC provider.
- Tailscale if you use Tailscale Funnel for HTTPS.

You need software installed on your computer:

- Psycheros
- Deno
- Tailscale, or another HTTPS tunnel

## Words Used In This Guide

`Public base URL` means the HTTPS URL for your local bridge without `/mcp`.

Example:

```text
https://your-machine.your-tailnet.ts.net
```

`MCP URL` means the same URL with `/mcp`.

Example:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

`OAuth resource` or `API identifier` means the public base URL.

Example:

```text
https://your-machine.your-tailnet.ts.net
```

Do not mix these up. Most setup failures come from putting `/mcp` in the
OAuth resource/API identifier.

## Step 1 - Check The Local Package

Open PowerShell in `connectors\codex-entity-core`.

Run:

```powershell
.\scripts\check-chatgpt-bridge-prereqs.ps1 -RunDenoCheck
```

Fix any red `[fail]` lines before continuing.

Yellow `[warn]` lines can be okay if you know why they appeared.

## Step 2 - Start The Local Bridge

You do not know the public URL yet if this is your first run, so start
Tailscale first in Step 3 if you need to discover it.

Once you know the public base URL and Auth0 issuer, run:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com"
```

Leave this terminal window open.

If you want read-only mode:

```powershell
.\scripts\start-chatgpt-bridge.ps1 `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net" `
  -OAuthIssuer "https://your-tenant.us.auth0.com" `
  -WriteEnabled $false
```

If you prefer one editable settings file:

1. Copy `bridge.env.example` to `connectors\codex-entity-core\bridge.env`.
2. Edit `connectors\codex-entity-core\bridge.env`.
3. Run:

```powershell
.\scripts\start-chatgpt-bridge.ps1 -EnvFile .\bridge.env
```

## Step 3 - Start The HTTPS Tunnel

In a second PowerShell window, run:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

Tailscale prints a public HTTPS URL.

Copy the base URL. It usually looks like:

```text
https://your-machine.your-tailnet.ts.net
```

ChatGPT will use:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

If Tailscale asks you to approve Funnel in a browser, approve it.

## Step 4 - Create The Auth0 Application

In Auth0:

1. Go to Applications.
2. Create Application.
3. Choose Regular Web Application.
4. Name it something like `Psycheros Entity Core`.
5. Open the new application's Settings page.
6. Copy the Client ID.
7. Copy the Client Secret.
8. In Advanced Settings > OAuth, set Token Endpoint Authentication Method to
   `Post`.

Auth0's UI may display this as `client_secret_post` in some places.

## Step 5 - Create The Auth0 API

In Auth0:

1. Go to Applications > APIs.
2. Create API.
3. Name it `Psycheros Entity Core`.
4. Set Identifier to your public base URL, without `/mcp`.

Example:

```text
https://your-machine.your-tailnet.ts.net
```

Add these permissions:

```text
entity:read
memory:write
```

Suggested descriptions:

```text
entity:read    Read entity-core context, identity, memories, search, and fetch results.
memory:write   Record ordinary daily or significant memories.
```

Open the API Settings tab.

Set:

- User-delegated Access: All apps allowed

If you prefer stricter setup, use Per-app authorization, but then you must
explicitly authorize the Auth0 application and grant both permissions.

Save changes.

## Step 6 - Create The ChatGPT Private App

In ChatGPT:

1. Open Settings.
2. Open Apps.
3. Open Advanced settings or Developer Mode app creation.
4. Create a new app.
5. Name it `Psycheros Entity Core`.
6. For Server URL, paste the MCP URL.

Example:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

7. Choose OAuth authentication.
8. Open Advanced OAuth settings.
9. Choose User-Defined OAuth Client.
10. Paste the Auth0 Client ID.
11. Paste the Auth0 Client Secret.
12. Set token endpoint auth method to `client_secret_post`.
13. Confirm default scopes include:

```text
entity:read
memory:write
```

14. Leave Base scopes blank.
15. Copy the Callback URL from ChatGPT.

## Step 7 - Add ChatGPT Callback URL To Auth0

Return to the Auth0 Application Settings page.

Paste ChatGPT's callback URL into:

```text
Allowed Callback URLs
```

The callback URL looks like:

```text
https://chatgpt.com/connector/oauth/...
```

Save changes.

## Step 8 - Test Auth0 Before Clicking Connect

Run:

```powershell
.\scripts\test-auth0-chatgpt-authorize.ps1 `
  -Auth0Domain "your-tenant.us.auth0.com" `
  -ClientId "YOUR_AUTH0_CLIENT_ID" `
  -CallbackUrl "https://chatgpt.com/connector/oauth/YOUR_CALLBACK_ID" `
  -PublicBaseUrl "https://your-machine.your-tailnet.ts.net"
```

Good result:

```text
[ok] Auth0 accepted the client/resource/scopes and redirected to login.
```

Bad result:

```text
Client is not authorized to access resource server
```

Fix:

- Auth0 API Identifier must exactly equal the public base URL.
- Auth0 API must have `entity:read` and `memory:write`.
- Auth0 API Application Access must allow the app.

## Step 9 - Create And Connect

Back in ChatGPT:

1. Create the app.
2. Click Connect.
3. Sign in through Auth0.
4. Approve the app if Auth0 asks for consent.
5. Return to ChatGPT.

Start with a read-only prompt:

```text
Use Psycheros Entity Core to check entity status.
```

Then try:

```text
Use Psycheros Entity Core to search memory for "setup".
```

Only after reads work, try a dry run memory write if your version supports it.

## What To Leave Running

While ChatGPT uses the bridge, keep both terminal windows open:

- the local MCP bridge
- the Tailscale Funnel tunnel

If either stops, ChatGPT loses access until you start it again.
