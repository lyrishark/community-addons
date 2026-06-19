# Tunnel Setup - Tailscale Funnel

ChatGPT cannot connect to `localhost` on your computer. It needs a public HTTPS
URL. Tailscale Funnel can provide one.

This is not an official Psycheros release.

## Requirements

Tailscale Funnel requires:

- Tailscale installed and logged in.
- MagicDNS enabled for your tailnet.
- HTTPS certificates enabled for your tailnet.
- Funnel allowed in the tailnet policy.

If Tailscale asks you to approve Funnel in the browser, approve it.

## Start Funnel

Run this in a second PowerShell window:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

Tailscale prints an HTTPS URL.

Example:

```text
https://your-machine.your-tailnet.ts.net
```

Use this as the public base URL.

Use this as the ChatGPT Server URL:

```text
https://your-machine.your-tailnet.ts.net/mcp
```

## Foreground vs Background

Default:

```powershell
.\scripts\start-tailscale-funnel.ps1
```

This keeps Funnel open until you press Ctrl+C.

Background:

```powershell
.\scripts\start-tailscale-funnel.ps1 -Background
```

This asks Tailscale to keep the Funnel configuration running in the background.

For early testing, foreground is easier because it is obvious when the public
tunnel is on.

## Stop Funnel

If running in the foreground, press Ctrl+C.

If running in the background, use Tailscale's own reset/disable commands or the
Tailscale admin UI.

## Official Docs

```text
https://tailscale.com/docs/features/tailscale-funnel
https://tailscale.com/docs/reference/tailscale-cli/funnel
```

