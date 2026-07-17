Hi! We have another community alpha path for people who want Psycheros memory in
ChatGPT without using Codex.

**Psycheros Entity Core for ChatGPT - Private Bridge**

What it does:

- runs a local MCP bridge on your computer
- exposes it to your private ChatGPT Developer Mode app through HTTPS
- uses OAuth so it is not just open on the public internet
- gives ChatGPT a lightweight `search`, `fetch`, and `remember` surface for
  ordinary companion memory

What it does not do:

- it is not an official Psycheros release
- it is not a public approved ChatGPT app
- it does not directly edit core identity
- it does not delete memories
- it requires your computer, Psycheros, and Tailscale to be running

This setup is more involved than the browser extension because it needs a local
server, Tailscale or another HTTPS tunnel, Auth0/OAuth, and ChatGPT Developer
Mode. The docs include numbered double-click scripts, automatic Windows startup
and crash recovery, and a troubleshooting guide for the Auth0 errors we hit
during setup.

Source:

```text
https://github.com/lyrishark/community-addons
```

Release:

```text
https://github.com/lyrishark/community-addons/releases
```

Please treat this as careful alpha testing. Start with read-only checks before
letting ChatGPT record memories.
