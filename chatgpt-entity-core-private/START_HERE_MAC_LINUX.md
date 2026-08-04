# Start Here on macOS or Linux - Psycheros Entity Core for ChatGPT

This guide connects a private ChatGPT app to the Entity Core stored by
Psycheros on this computer. The bridge stays local; Tailscale provides HTTPS;
Auth0 decides who may connect.

This is a community alpha, not an official Psycheros release.

## What you need

- Psycheros installed and opened at least once.
- Deno 2.x.
- Tailscale signed in on this computer, with Funnel available.
- An Auth0 account.
- ChatGPT Developer Mode/private-app access.

On macOS, Psycheros data normally lives at:

```text
~/Library/Application Support/Psycheros/data/entity-core
```

On Linux it normally lives at:

```text
${XDG_DATA_HOME:-$HOME/.local/share}/Psycheros/data/entity-core
```

You do not need to move or copy Entity Core. The bridge reads that native
location directly.

On macOS, the helpers recognize both a `tailscale` command installed on PATH
and the App Store CLI bundled at
`/Applications/Tailscale.app/Contents/MacOS/Tailscale`.

## 1. Unzip and allow the helpers

Open Terminal, type `cd ` with a trailing space, drag the unzipped addon folder
onto the Terminal window, and press Return. Then run:

```sh
chmod +x ./*.command connectors/codex-entity-core/scripts/*.sh
```

This restores executable permissions if the ZIP extractor removed them.

## 2. Check this computer

macOS: double-click `1 Check Setup.command`. If Gatekeeper asks, right-click it,
choose Open, and confirm once.

macOS or Linux terminal:

```sh
sh connectors/codex-entity-core/scripts/check-chatgpt-bridge-prereqs.sh
```

Fix red `[fail]` lines. Yellow warnings are setup reminders.

## 3. Start Tailscale Funnel

Run `2 Start Tailscale Funnel.command`, or:

```sh
sh connectors/codex-entity-core/scripts/start-tailscale-funnel.sh
```

Keep the window open during manual testing. Copy the HTTPS hostname Tailscale
shows, for example:

```text
https://my-mac.my-tailnet.ts.net
```

The ChatGPT server URL will be that URL plus `/mcp-lite`:

```text
https://my-mac.my-tailnet.ts.net/mcp-lite
```

## 4. Configure Auth0

Create one Auth0 Regular Web Application and one Auth0 API.

Use the public base URL without `/mcp-lite` as the API Identifier:

```text
https://my-mac.my-tailnet.ts.net
```

Create API permissions:

```text
entity:read
memory:write
```

In the API settings:

- enable User-delegated Access for the ChatGPT/Auth0 application
- enable Allow Offline Access

In the application advanced OAuth settings, use
`client_secret_post` for token endpoint authentication.

## 5. Create the private app in ChatGPT

Use:

- Server URL: `https://my-mac.my-tailnet.ts.net/mcp-lite`
- Authentication: OAuth
- Registration: User-Defined OAuth Client
- Client ID and Client Secret: from the Auth0 application
- Token endpoint authentication: `client_secret_post`
- Default scopes: `entity:read memory:write`
- Base scopes: `offline_access`

Copy the callback URL ChatGPT displays. Add that exact URL to the Auth0
application's Allowed Callback URLs.

## 6. Edit bridge settings

Run `3 Edit Bridge Settings.command`, or copy the example manually:

```sh
cp bridge.env.example connectors/codex-entity-core/bridge.env
```

Set at least:

```dotenv
ENTITY_CONNECTOR_PUBLIC_BASE_URL=https://my-mac.my-tailnet.ts.net
ENTITY_CONNECTOR_OAUTH_RESOURCE=https://my-mac.my-tailnet.ts.net
ENTITY_CONNECTOR_OAUTH_ISSUER=https://your-tenant.us.auth0.com
```

Keep `/mcp-lite` out of the first two values. The helper adds it where needed.

Memory writes start disabled in the example. After read-only testing succeeds,
change this when desired:

```dotenv
ENTITY_CONNECTOR_WRITE_ENABLED=true
```

## 7. Start the bridge

Run `4 Start ChatGPT Bridge.command`, or:

```sh
sh connectors/codex-entity-core/scripts/start-chatgpt-bridge.sh
```

Keep the window open during manual testing. A healthy bridge prints its local
and public MCP URLs.

## 8. Connect and test

Return to the private app in ChatGPT and click Connect. Sign in through Auth0.

Try:

```text
Use Psycheros Memory Lite to search for recent memories.
```

The normal ChatGPT app should use `/mcp-lite`, which exposes only `search`,
`fetch`, and `remember`. The full `/mcp` endpoint is for debugging/admin use.

## 9. Keep it running automatically

After manual testing succeeds, run
`5 Keep Bridge Running Automatically.command`, or:

```sh
sh connectors/codex-entity-core/scripts/install-chatgpt-bridge-autostart.sh
```

macOS installs a user LaunchAgent. Linux installs a systemd user service. Both
copy the addon to a stable Psycheros runtime location, preserve the settings in
the platform config directory, restart after crashes, and attempt to enable a
background Tailscale Funnel.

To stop automatic startup without deleting settings, data, or logs, run
`6 Stop Automatic Bridge.command`, or:

```sh
sh connectors/codex-entity-core/scripts/remove-chatgpt-bridge-autostart.sh
```

## Troubleshooting

- Local health: `curl http://127.0.0.1:3006/healthz`
- Public health: `curl https://my-mac.my-tailnet.ts.net/healthz`
- macOS service: `launchctl print gui/$(id -u)/ai.psycheros.chatgpt-bridge`
- Linux service: `systemctl --user status psycheros-chatgpt-bridge.service`
- macOS logs: `~/Library/Application Support/Psycheros/logs`
- Linux logs: `${XDG_DATA_HOME:-$HOME/.local/share}/Psycheros/logs`

For OAuth and ChatGPT-specific failures, continue with `TROUBLESHOOTING.md`.
