# Psycheros Community Addons

Community alpha addons and plugins for the Psycheros AI platform.

This repository currently contains:

1. **Psycheros Thread Exporter** - a browser extension for exporting AI chat
   threads and injecting local Psycheros memory context.
2. **Psycheros Entity Core for Codex** - a local Codex plugin that connects
   Codex to a Psycheros entity-core through MCP.
3. **Psycheros Entity Core for ChatGPT** - a private ChatGPT Developer Mode app
   bridge for people who do not use Codex but want ChatGPT to read and record
   local Psycheros memories through MCP.
4. **Psycheros Loom Gemini Parser Mod** - optional alternate Entity Loom files
   that let Loom consume merged Gemini batch exports from the browser extension.
5. **Psycheros Loom Gemini Resume Patch** - optional alternate Entity Loom files
   that recover stale running import stages and improve updated-thread reimports
   while testing Gemini history.
6. **Psycheros Accessible Font Settings** - a Psycheros 0.8.9–0.8.11 file mod
   with interface font sizing and reading-oriented font presets.
7. **Psycheros Windows Shell Fix** - a Psycheros 0.8.9–0.8.11 compatibility
   patch for systems where the shell tool cannot spawn `sh`.

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

### Psycheros Entity Core for ChatGPT

Location:

```text
chatgpt-entity-core-private/
```

Current alpha features:

- private ChatGPT Developer Mode app bridge
- local MCP server for Psycheros entity-core
- OAuth login through Auth0
- Tailscale Funnel support for HTTPS
- read identity context, memories, and graph nodes
- record daily and significant memories when writes are enabled
- numbered double-click setup helpers for non-technical users
- no direct identity/core mutation

Start here:

- [ChatGPT bridge start-here guide](chatgpt-entity-core-private/START_HERE.md)
- [ChatGPT bridge README](chatgpt-entity-core-private/README.md)
- [ChatGPT bridge privacy notes](chatgpt-entity-core-private/PRIVACY.md)
- [ChatGPT bridge security notes](chatgpt-entity-core-private/SECURITY.md)

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

### Psycheros Loom Gemini Resume Patch

Location:

```text
psycheros-loom-gemini-resume-patch/
```

Current alpha features:

- Recovers stale `running` Significant/Daily/Graph checkpoints as resumable
  after a daemon restart.
- Treats changed same-ID thread exports as updates instead of duplicates.
- Replaces old messages for updated conversations and resets downstream
  checkpoints only where needed.
- Includes helper scripts that back up replaced source files and checkpoint
  files.

Important: this is a **modded Psycheros file set**, not an official Psycheros
release. It is mainly useful for long Gemini import testing.

Start here:

- [Gemini resume patch README](psycheros-loom-gemini-resume-patch/README.md)

### Psycheros Accessible Font Settings

Location:

```text
psycheros-accessible-font-settings/
```

Current alpha features:

- Adds a Text tab to General Settings.
- Provides a 12–28 px interface font-size slider.
- Provides Sans, Serif, Dyslexia-friendly, and Handwriting presets.
- Preserves theme and background settings.
- Checks for Psycheros 0.8.9–0.8.11 and backs up replaced files during install.

Start here:

- [Accessible font settings README](psycheros-accessible-font-settings/README.md)

### Psycheros Windows Shell Fix

Location:

```text
psycheros-windows-shell-fix/
```

Current alpha features:

- Uses PowerShell for shell-tool commands on Windows.
- Falls back to `cmd.exe` only when PowerShell cannot be spawned.
- Keeps `sh -c` behavior on macOS and Linux.
- Checks for Psycheros 0.8.9–0.8.11 and backs up replaced files during install.

Start here:

- [Windows shell fix README](psycheros-windows-shell-fix/README.md)

## Downloads

Alpha release downloads will be published through GitHub Releases:

- [Psycheros Thread Exporter v0.3.2](https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2)
- [Psycheros Entity Core for Codex v0.2.1](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1)
- [Psycheros Entity Core for ChatGPT v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/chatgpt-entity-core-private-v0.1.1)
- [Psycheros Loom Gemini Parser Mod v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-loom-gemini-parser-mod-v0.1.1)
- Psycheros Loom Gemini Resume Patch v0.1.0: blocked pending a current rebase,
  database/checkpoint coverage, and update-path tests
- [Psycheros Accessible Font Settings v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-accessible-font-settings-v0.1.1)
- [Psycheros Windows Shell Fix v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-windows-shell-fix-v0.1.1)

Checksums are in [SHA256SUMS.txt](SHA256SUMS.txt).

## Trust Notes

- Source is public.
- Release builds include checksums.
- Browser extension permissions are scoped to supported chat sites and
  localhost.
- Neither addon uses analytics, ads, or developer-owned telemetry.
- The browser extension never presses Send.
- The Codex plugin does not expose direct identity/core mutation.
- The ChatGPT bridge requires OAuth and does not expose direct identity/core
  mutation.
- The Gemini parser mod is visibly labeled as a local Entity Loom file
  replacement.
- The Gemini resume patch is visibly labeled as a local Entity Loom file
  replacement and includes backup scripts.
- The Psycheros file-mod packages list their exact 0.8.9–0.8.11 compatibility
  window and refuse other versions before install.

## Issues

Report bugs or questions here:

https://github.com/lyrishark/community-addons/issues
