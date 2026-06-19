# OAuth Setup - Auth0

This guide uses Auth0 because it worked in private bridge testing.

This is not an official Psycheros release.

## Required Values

You will need:

- Auth0 domain, such as `your-tenant.us.auth0.com`
- Auth0 Client ID
- Auth0 Client Secret
- ChatGPT callback URL
- public base URL for your bridge

Public base URL example:

```text
https://your-machine.your-tailnet.ts.net
```

Do not include `/mcp` in the Auth0 API Identifier.

## Create The Application

1. Auth0 Dashboard > Applications.
2. Create Application.
3. Choose Regular Web Application.
4. Name it `Psycheros Entity Core`.
5. Open Settings.
6. Copy Client ID.
7. Copy Client Secret.
8. Advanced Settings > OAuth.
9. Set Token Endpoint Authentication Method to `Post`.

ChatGPT calls this:

```text
client_secret_post
```

## Create The API

1. Auth0 Dashboard > Applications > APIs.
2. Create API.
3. Name it `Psycheros Entity Core`.
4. Identifier: public base URL, without `/mcp`.

Example:

```text
https://your-machine.your-tailnet.ts.net
```

## Add API Permissions

Add:

```text
entity:read
memory:write
```

Suggested descriptions:

```text
entity:read    Read entity-core context, identity, memories, search, and fetch results.
memory:write   Record ordinary daily or significant memories.
```

## Allow The Application To Use The API

Open the API Settings tab.

Set:

```text
User-delegated Access: All apps allowed
```

Save.

If you choose Per-app authorization instead, open the API Application Access
tab and explicitly grant the Auth0 application both permissions.

## Add ChatGPT Callback URL

In ChatGPT's private app setup, copy the Callback URL.

It looks like:

```text
https://chatgpt.com/connector/oauth/...
```

Paste it into Auth0 Application > Allowed Callback URLs.

Save.

## Test Before Connecting

Run:

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

If you see `not authorized to access resource server`, the API Identifier,
permissions, or Application Access settings are wrong.

