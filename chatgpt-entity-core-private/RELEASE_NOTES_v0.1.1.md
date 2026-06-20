# Release Notes - Psycheros Entity Core for ChatGPT Private Bridge v0.1.1

Community alpha. Not an official Psycheros release.

## Fixed

- ChatGPT no longer receives persistent 502 errors after a reboot or an
  accidentally closed bridge window when automatic startup is enabled.
- The bridge now prefers Psycheros' bundled Deno executable when available.

## Added

- One-click Windows startup task installer and remover.
- A local supervisor that restarts crashed bridge processes.
- Local health monitoring that recycles a bridge after three failed checks.
- Stable runtime, settings, and log locations under `%APPDATA%\Psycheros`.
- Automatic background refresh of the existing Tailscale Funnel route.

## Validation

- Local and public `/healthz` checks returned HTTP 200.
- OAuth protected-resource metadata remained reachable through Funnel.
- An intentional Deno process termination recovered under a new PID.
- Deno type checks and OAuth smoke tests passed from the packaged addon source.
