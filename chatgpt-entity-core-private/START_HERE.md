# Start Here - Psycheros Entity Core for ChatGPT

This guide is for people who love or care for an AI companion and want ChatGPT
to read from the same local Psycheros entity-core.

You do not need Codex. You do need to follow the steps in order.

This is a community alpha addon, not an official Psycheros release.

## What You Are Making

You are making this path:

```text
ChatGPT -> private ChatGPT app -> Auth0 login -> Tailscale HTTPS tunnel -> your computer -> Psycheros entity-core
```

The important rule:

```text
ChatGPT URL ends in /mcp-lite.
Auth0 API Identifier does not end in /mcp-lite or /mcp.
```

Example:

```text
ChatGPT Server URL:  https://your-machine.your-tailnet.ts.net/mcp-lite
Auth0 API Identifier: https://your-machine.your-tailnet.ts.net
```

## Before You Start

You need:

- Psycheros installed and already used at least once.
- ChatGPT account with private app / Developer Mode app access.
- Auth0 account.
- Tailscale account.
- Deno installed.

If you do not have Deno yet:

1. Press the Windows key.
2. Type `PowerShell`.
3. Click `Windows PowerShell`.
4. Paste this:

```powershell
irm https://deno.land/install.ps1 | iex
```

5. Press Enter.
6. When it finishes, close PowerShell.
7. Open a new PowerShell and type:

```powershell
deno --version
```

If it prints a version number, Deno is installed.

If you do not have Tailscale yet:

1. Open `https://tailscale.com/download/windows`.
2. Download Tailscale for Windows.
3. Install it.
4. Sign in.
5. Leave Tailscale running.

## Unzip The Addon

1. Download the release zip.
2. Right-click it.
3. Click `Extract All...`.
4. Put the extracted folder somewhere you can find again, like:

```text
Documents\Psycheros Addons\psycheros-entity-core-chatgpt-private
```

5. Open that extracted folder.

You should see files named:

```text
1 Check Setup.bat
2 Start Tailscale Funnel.bat
3 Edit Bridge Settings.bat
4 Start ChatGPT Bridge.bat
5 Keep Bridge Running Automatically.bat
6 Stop Automatic Bridge.bat
```

## Step 1 - Check This Computer

Double-click:

```text
1 Check Setup.bat
```

Good signs:

```text
[ok] Deno found
[ok] Tailscale CLI found
[ok] Entity-core data directory exists
```

If you see:

```text
[fail] Deno was not found
```

install Deno using the Deno instructions above, then run `1 Check Setup.bat`
again.

If you see:

```text
[warn] Port 3006 is already in use
```

that usually means the bridge is already running in another window. If you are
not sure, close old Psycheros bridge windows and run the check again.

## Step 2 - Start The Public Tunnel

Double-click:

```text
2 Start Tailscale Funnel.bat
```

A black window opens.

It may warn that nothing is listening yet. That is okay during setup.

Look for a URL like:

```text
https://your-machine.your-tailnet.ts.net
```

Copy that URL.

Write it down here:

```text
PUBLIC_BASE_URL=
```

Make the ChatGPT URL by adding `/mcp-lite`:

```text
CHATGPT_SERVER_URL=
```

Example:

```text
PUBLIC_BASE_URL=https://my-laptop.my-tailnet.ts.net
CHATGPT_SERVER_URL=https://my-laptop.my-tailnet.ts.net/mcp-lite
```

Leave the Tailscale window open.

## Step 3 - Create The Auth0 API

Open Auth0 in your browser.

1. Go to `Applications`.
2. Go to `APIs`.
3. Click `Create API`.
4. Name:

```text
Psycheros Entity Core
```

5. Identifier:

```text
paste PUBLIC_BASE_URL here
```

Do not add `/mcp-lite` or `/mcp`.

6. Save or create the API.
7. Open the `Permissions` tab.
8. Add this permission:

```text
entity:read
```

Suggested description:

```text
Read entity-core context, identity, memories, search, and fetch results.
```

9. Add this permission:

```text
memory:write
```

Suggested description:

```text
Record ordinary daily or significant memories.
```

10. Open the API `Settings` tab.
11. Find `User-delegated Access`.
12. Set it to:

```text
All apps allowed
```

13. Find `Allow Offline Access`.
14. Turn it on.

This lets Auth0 issue refresh tokens when ChatGPT asks for `offline_access`.

15. Save.

## Step 4 - Create The Auth0 Application

Still in Auth0:

1. Go to `Applications`.
2. Click `Create Application`.
3. Name:

```text
Psycheros Entity Core
```

4. Choose:

```text
Regular Web Application
```

5. Create it.
6. Open the application `Settings` page.
7. Copy the `Domain`.
8. Copy the `Client ID`.
9. Copy the `Client Secret`.

Write them here:

```text
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
```

10. Scroll to `Advanced Settings`.
11. Open the `OAuth` tab.
12. Set `Token Endpoint Authentication Method` to:

```text
Post
```

Auth0 may show this as `client_secret_post` later. That is the same thing.

Do not close Auth0 yet.

## Step 5 - Create The Private App In ChatGPT

Open ChatGPT in your browser.

1. Open `Settings`.
2. Open `Apps`.
3. Start creating a new private app or connector.
4. Name:

```text
Psycheros Entity Core
```

5. Server URL:

```text
paste CHATGPT_SERVER_URL here
```

Example:

```text
https://my-laptop.my-tailnet.ts.net/mcp-lite
```

6. Authentication:

```text
OAuth
```

7. Open advanced OAuth settings.
8. Registration method:

```text
User-Defined OAuth Client
```

9. OAuth Client ID:

```text
paste AUTH0_CLIENT_ID here
```

10. OAuth Client Secret:

```text
paste AUTH0_CLIENT_SECRET here
```

11. Token endpoint auth method:

```text
client_secret_post
```

12. Default scopes:

```text
entity:read
memory:write
```

13. Base scopes:

```text
offline_access
```

If ChatGPT asks for OAuth endpoint URLs manually:

```text
Auth URL: https://AUTH0_DOMAIN/authorize
Token URL: https://AUTH0_DOMAIN/oauth/token
Authorization server base: https://AUTH0_DOMAIN
Resource: PUBLIC_BASE_URL
```

Replace `AUTH0_DOMAIN` and `PUBLIC_BASE_URL` with your real values.

`offline_access` lets ChatGPT request a refresh token. Without it, the app can
work for a while and then start failing after the Auth0 access token expires.

14. Find ChatGPT's `Callback URL`.
15. Copy it.

It usually starts like:

```text
https://chatgpt.com/connector/oauth/
```

Do not click Connect yet.

## Step 6 - Paste The Callback URL Into Auth0

Return to the Auth0 Application Settings page.

1. Find `Allowed Callback URLs`.
2. Paste ChatGPT's callback URL there.
3. Save changes.

## Step 7 - Edit The Bridge Settings

Double-click:

```text
3 Edit Bridge Settings.bat
```

Notepad opens `bridge.env`.

Find this line:

```text
ENTITY_CONNECTOR_PUBLIC_BASE_URL=https://your-machine.your-tailnet.ts.net
```

Replace the example URL with your `PUBLIC_BASE_URL`.

Find this line:

```text
ENTITY_CONNECTOR_OAUTH_RESOURCE=https://your-machine.your-tailnet.ts.net
```

Replace the example URL with your `PUBLIC_BASE_URL`.

Find this line:

```text
ENTITY_CONNECTOR_OAUTH_ISSUER=https://your-tenant.us.auth0.com
```

Replace the example URL with:

```text
https://AUTH0_DOMAIN
```

For example:

```text
https://dev-example.us.auth0.com
```

For first testing, leave this line as `false`:

```text
ENTITY_CONNECTOR_WRITE_ENABLED=false
```

This makes the bridge read-only while you prove the connection works.

Save the file in Notepad.

Close Notepad.

## Step 8 - Start The Local Bridge

Double-click:

```text
4 Start ChatGPT Bridge.bat
```

Good signs:

```text
Starting Psycheros ChatGPT MCP bridge...
Public MCP URL: https://your-machine.your-tailnet.ts.net/mcp
Lite MCP URL: https://your-machine.your-tailnet.ts.net/mcp-lite
OAuth issuer: https://your-tenant.us.auth0.com
Writes enabled: false
```

Leave this bridge window open during the first connection test.

At this point you should have two black windows open:

```text
Tailscale Funnel
Local MCP bridge
```

Do not close them until you finish Step 11.

## Step 9 - Connect In ChatGPT

Return to ChatGPT.

1. Save or create the app if you have not already.
2. Click `Connect`.
3. Sign in through Auth0.
4. Approve the app if Auth0 asks.
5. Return to ChatGPT.

Try this first:

```text
Use Psycheros Entity Core to search for recent memories.
```

Then try:

```text
Use Psycheros Entity Core to remember that this bridge connected successfully.
```

If the search works, the read path is working. If remember works after writes
are enabled, ChatGPT can save lightweight memories into Psycheros.

## Step 10 - Turn Memory Writes On

Only do this after reads work.

1. Close the `Local MCP bridge` black window.
2. Double-click:

```text
3 Edit Bridge Settings.bat
```

3. Change:

```text
ENTITY_CONNECTOR_WRITE_ENABLED=false
```

to:

```text
ENTITY_CONNECTOR_WRITE_ENABLED=true
```

4. Save.
5. Close Notepad.
6. Double-click:

```text
4 Start ChatGPT Bridge.bat
```

Now ChatGPT can record ordinary daily and significant memories.

The bridge still does not expose direct identity/core file editing.

## Step 11 - Keep It Running Automatically

After both reads and writes work, double-click:

```text
5 Keep Bridge Running Automatically.bat
```

Wait for this line:

```text
Automatic startup is installed and running.
```

This creates a private Windows startup task. It:

- starts the bridge when you sign in
- restarts the bridge if it crashes or stops responding
- keeps its working copy and settings under your Psycheros AppData folder
- refreshes Tailscale Funnel in background mode

You can now close the old `Local MCP bridge` and `Tailscale Funnel` windows.

To turn automatic startup off later, double-click:

```text
6 Stop Automatic Bridge.bat
```

## What To Tell ChatGPT

Good first prompts:

```text
Use Psycheros Entity Core to search for recent memories.
```

```text
Use Psycheros Entity Core to search memory for "first meeting".
```

After writes are enabled:

```text
Use Psycheros Entity Core to remember that this setup worked.
```

## When You Are Done Without Automatic Startup

Close:

```text
Local MCP bridge
Tailscale Funnel
```

Without Step 11, ChatGPT cannot reach your Psycheros entity-core after those
windows are closed.

## Fast Troubleshooting

Problem:

```text
There was a problem connecting
```

Check:

- If you completed Step 11, did `5 Keep Bridge Running Automatically.bat`
  finish successfully?
- Otherwise, is `2 Start Tailscale Funnel.bat` still open?
- Otherwise, is `4 Start ChatGPT Bridge.bat` still open?
- Did ChatGPT Server URL end in `/mcp-lite`?
- Did Auth0 API Identifier not end in `/mcp-lite` or `/mcp`?

Problem:

```text
Client is not authorized to access resource server
```

Fix in Auth0:

- API Identifier must exactly equal `PUBLIC_BASE_URL`.
- API permissions must include `entity:read` and `memory:write`.
- API User-delegated Access should be `All apps allowed`.

Problem:

```text
Deno was not found
```

Install Deno using the instructions at the top, then close and reopen the
black windows.

Problem:

```text
Callback URL mismatch
```

Copy the callback URL from ChatGPT again. Paste the exact full URL into Auth0
Application Settings > Allowed Callback URLs. Save.

Problem:

```text
Writes enabled: false
```

That is normal during read-only testing. Turn writes on in Step 10.
