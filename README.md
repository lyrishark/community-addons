# Psycheros Community Addons

Community alpha addons and plugins for the Psycheros AI platform.

This repository currently contains:

1. **Psycheros Thread Exporter** - a browser extension for exporting AI chat
   threads and injecting local Psycheros memory context.
2. **Psycheros Entity Core for Codex** - a local Codex plugin that connects
   Codex to a Psycheros entity-core through MCP.

These are community addons, not official Psycheros releases.

## Addons

### Psycheros Thread Exporter

Location:

```text
browser-thread-exporter/
```

Current alpha features:

- ChatGPT export with exact backend timestamps.
- Claude export with exact web conversation timestamps.
- Gemini visible chat draft exports.
- Gemini Apps Activity timestamp exports.
- Gemini merge workflow with repair reports.
- Local Psycheros memory context injection into ChatGPT, Claude, and Gemini.
- Receiver-aware filtering for synced memories, such as `[via:chatgpt]`.

Start here:

- [Browser extension README](browser-thread-exporter/README.md)
- [Browser extension privacy notes](browser-thread-exporter/PRIVACY.md)
- [Browser extension security notes](browser-thread-exporter/SECURITY.md)

### Psycheros Entity Core for Codex

Location:

```text
codex-entity-core-plugin/
```

Current alpha features:

- entity-core status checks
- identity context reads
- memory and graph search
- fetch by connector ID
- ordinary daily/significant memory writes from Codex
- no direct identity/core mutation

Start here:

- [Codex plugin README](codex-entity-core-plugin/README.md)
- [Codex plugin privacy notes](codex-entity-core-plugin/PRIVACY.md)
- [Codex plugin security notes](codex-entity-core-plugin/SECURITY.md)

## Downloads

Alpha release downloads will be published through GitHub Releases:

- [Psycheros Thread Exporter v0.3.2](https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2)
- [Psycheros Entity Core for Codex v0.2.1](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1)

Checksums are in [SHA256SUMS.txt](SHA256SUMS.txt).

## Trust Notes

- Source is public.
- Release builds include checksums.
- Browser extension permissions are scoped to supported chat sites and
  localhost.
- Neither addon uses analytics, ads, or developer-owned telemetry.
- The browser extension never presses Send.
- The Codex plugin does not expose direct identity/core mutation.

## Issues

Report bugs or questions here:

https://github.com/lyrishark/community-addons/issues

