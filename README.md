# Psycheros Community Addons

Community-built, local-first companion projects for Psycheros. They are
source-visible and are not official Psycheros releases.

Read [COMPATIBILITY.md](COMPATIBILITY.md) before installing anything.

## Current for Psycheros 0.10

| Package | Version | Install surface | Purpose |
| --- | --- | --- | --- |
| [HTF Music Listener](psycheros-htf-music-listener/README.md) | [0.2.0](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.2.0) | Settings > Plugins | Local HTF listening, sensory library, synced lyrics, and Windows Now Playing presence. |
| [Accessibility Controls](psycheros-accessibility-controls/README.md) | [0.1.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-accessibility-controls-v0.1.0-rc.1) | Settings > Plugins | Typography controls and resizable Yin Yang text input. |
| [Windows Shell Fix](psycheros-windows-shell-fix/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-windows-shell-fix-v0.3.0-rc.1) | Settings > Plugins | Native host-shell execution on Windows. |
| [More Uploads](psycheros-more-uploads/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-more-uploads-v0.3.0-rc.1) | Guarded source bridge | Multiple image, document, and audio attachments in chat and typed voice. |
| [Expression Sprites Beta](psycheros-expression-sprites-beta/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-expression-sprites-beta-v0.3.0-rc.1) | Guarded source bridge | Live expression state and user-supplied chat/voice sprites. |
| [Screen Presence Alpha](psycheros-screen-presence-alpha/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-screen-presence-alpha-v0.3.0-rc.1) | Guarded source bridge | Consent-based screen context in chat and voice. |
| [Loom Gemini Parser](psycheros-loom-gemini-parser-mod/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-loom-gemini-parser-mod-v0.3.0-rc.1) | Guarded Loom source bridge | Merged Gemini export import in Entity Loom. |
| [More Uploads + Voice Text Controls](psycheros-more-uploads-voice-resize/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-more-uploads-voice-resize-v0.3.0-rc.1) | Release suite | Upload bridge plus an Accessibility Controls manager ZIP. |
| [Everything Together](psycheros-everything-together/README.md) | [0.3.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-everything-together-v0.3.0-rc.1) | Release suite | Merged source bridge plus Accessibility, Shell, and current HTF plugin ZIPs. |

Manager plugins target Psycheros `>=0.10.0 <0.11.0`. Source bridges target
exactly 0.10.0, verify stock-file hashes before writing, back up replaced files,
and refuse unknown local edits.

Release suites contain ready-to-install plugin ZIPs because Psycheros 0.10 does
not automatically install dependencies declared by a meta-plugin.

## Independent projects

| Project | Version | Surface |
| --- | --- | --- |
| [Thread Exporter](browser-thread-exporter/README.md) | 0.3.2 | Browser extension; no Psycheros host dependency. |
| [Entity Core for Codex](codex-entity-core-plugin/README.md) | [0.2.2](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.2) | Codex MCP/plugin package. |
| [Entity Core for ChatGPT](chatgpt-entity-core-private/START_HERE.md) | [0.1.3](https://github.com/lyrishark/community-addons/releases/tag/chatgpt-entity-core-private-v0.1.3) | Private HTTPS/OAuth bridge. |

These projects have their own version streams. Their package numbers do not
imply the version of Entity Core bundled with Psycheros.

## Historical releases

Older 0.8/0.9 source overlays remain available through immutable tags and
releases only. See [historical/README.md](historical/README.md). Do not install
those payloads over Psycheros 0.10.

## Releases and trust

Public downloads are on [GitHub Releases](https://github.com/lyrishark/community-addons/releases).
[SHA256SUMS.txt](SHA256SUMS.txt) records current artifact checksums.

- No analytics, ads, or developer-owned telemetry are included.
- Browser actions and local sensory sharing are user-triggered.
- Trusted plugins can read local data and run code; inspect capabilities before
  installation.
- A working directory is not a release. Use the matching tagged archive.

Report bugs or questions in [GitHub Issues](https://github.com/lyrishark/community-addons/issues).
