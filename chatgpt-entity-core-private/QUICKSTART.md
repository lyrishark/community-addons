# Quickstart - ChatGPT Private Bridge

Choose the detailed guide for the computer running Psycheros:

- Windows: `START_HERE.md`
- macOS or Linux: `START_HERE_MAC_LINUX.md`

The short path on every platform is:

1. Install Psycheros, Deno, and Tailscale.
2. Run helper 1 to check prerequisites.
3. Run helper 2 and copy the Tailscale HTTPS hostname.
4. Configure an Auth0 API and Regular Web Application with `entity:read`,
   `memory:write`, delegated access, and offline access.
5. Create a ChatGPT private app pointing to
   `https://your-machine.your-tailnet.ts.net/mcp-lite`.
6. Put the pathless public URL and Auth0 issuer into `bridge.env` using helper 3.
7. Run helper 4, connect in ChatGPT, and test `search`.
8. Run helper 5 to install platform-native automatic startup.

Windows helpers end in `.bat`. macOS helpers end in `.command`. Linux users can
run the matching files under `connectors/codex-entity-core/scripts` with `sh`.

If anything fails, open `TROUBLESHOOTING.md`.
