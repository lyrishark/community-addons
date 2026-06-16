# Psycheros Community Addons

Community alpha addons and plugins for the Psycheros AI platform.

This repository currently contains:

1. **Psycheros Thread Exporter** - a browser extension for exporting AI chat
   threads and injecting local Psycheros memory context.
2. **Psycheros Entity Core for Codex** - a local Codex plugin that connects
   Codex to a Psycheros entity-core through MCP.
3. **Psycheros Loom Gemini Parser Mod** - optional alternate Entity Loom files
   that let Loom consume merged Gemini batch exports from the browser
   extension.

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

### Psycheros Loom Gemini Parser Mod

Location:

```text
psycheros-loom-gemini-parser-mod/
```

Current alpha features:

- Adds `gemini` as an Entity Loom source platform.
- Auto-detects merged Gemini batch files created by Psycheros Thread Exporter.
- Parses merged Gemini conversations into Loom's normal import format.
- Leaves raw Gemini thread drafts and raw Activity exports unsupported; merge
  them first in the browser extension.

Important: this is a **modded Psycheros file set**, not an official Psycheros
release. Read the README and back up files before replacing local Entity Loom
files.

Start here:

- [Gemini parser mod README](psycheros-loom-gemini-parser-mod/README.md)

## Downloads

Alpha release downloads will be published through GitHub Releases:

- [Psycheros Thread Exporter v0.3.2](https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2)
- [Psycheros Entity Core for Codex v0.2.1](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1)
- Psycheros Loom Gemini Parser Mod v0.1.0: release coming after testing

Checksums are in [SHA256SUMS.txt](SHA256SUMS.txt).

## Trust Notes

- Source is public.
- Release builds include checksums.
- Browser extension permissions are scoped to supported chat sites and
  localhost.
- Neither addon uses analytics, ads, or developer-owned telemetry.
- The browser extension never presses Send.
- The Codex plugin does not expose direct identity/core mutation.
- The Gemini parser mod is visibly labeled as a local Entity Loom file
  replacement.

## Issues

Report bugs or questions here:

https://github.com/lyrishark/community-addons/issues
