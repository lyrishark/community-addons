# Psycheros Community Addons

Community-built, local-first companion projects for Psycheros. They are
source-visible and are not official Psycheros releases.

Read [COMPATIBILITY.md](COMPATIBILITY.md) before installing anything.

## Current Psycheros 0.10 plugins

| Package | Version | Install surface | What it adds |
| --- | --- | --- | --- |
| [HTF Music Listener](psycheros-htf-music-listener/README.md) | [0.2.0 public](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.2.0) | Settings > Plugins | Explicit one-off HTF listening, an opt-in local sensory library, verified synced lyrics, and shared Windows Now Playing presence. |
| [Accessibility Controls](psycheros-accessibility-controls/README.md) | [0.1.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-accessibility-controls-v0.1.0-rc.1) | Settings > Plugins | Persistent font presets and text scale plus adaptive, manually resizable Yin Yang voice text input. |

Both packages are trusted API-v1 plugins for Psycheros `>=0.10.0 <0.11.0`.
They use the official plugin settings capability and declare package-scoped
GitHub update metadata.

Install release zips through **Settings > Plugins**. The plugin manager shows
the declared entrypoint, browser assets, capabilities, compatibility range, and
warnings before installation. The monorepo update path requires Psycheros PR
[#37](https://github.com/PsycherosAI/Psycheros/pull/37) or a later release that
contains it.

## Historical Psycheros source packages

The previous 0.8/0.9 packages replaced Psycheros or Entity Loom source files.
They are not plugin-manager packages and must not be installed over Psycheros
0.10. Their source trees have been removed from the current branch so an old
overlay cannot be mistaken for a current download.

The [historical index](historical/README.md) records each package's final
compatibility, preserved release/tag, and 0.10 disposition. No new all-in-one
source-overlay bundle is planned.

## Other companion projects

These projects are versioned independently and do not install into the
Psycheros plugin manager:

| Project | Public/prepared version | Surface |
| --- | --- | --- |
| [Thread Exporter](browser-thread-exporter/README.md) | 0.3.2 public | Browser extension for exporting ChatGPT, Claude, and Gemini threads. |
| [Entity Core for Codex](codex-entity-core-plugin/README.md) | [0.2.2 prerelease](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.2) | Codex MCP/plugin package; its bundled Entity Core snapshot is separate from the Psycheros 0.10 runtime. |
| [Entity Core for ChatGPT](chatgpt-entity-core-private/START_HERE.md) | [0.1.3 prerelease](https://github.com/lyrishark/community-addons/releases/tag/chatgpt-entity-core-private-v0.1.3) | Private OAuth bridge; not a Psycheros addon. |

Do not infer Entity Core 0.6 compatibility from those package numbers. Use each
project's own release notes and compatibility statement.

## Releases and trust

Public downloads are on [GitHub Releases](https://github.com/lyrishark/community-addons/releases).
Prepared source or a local archive is not public until the matching branch is
merged, tagged, and released. [SHA256SUMS.txt](SHA256SUMS.txt) records published
or staged artifact checksums.

- No analytics, ads, or developer-owned telemetry are included.
- Browser actions and local sensory sharing are user-triggered.
- Trusted plugins can read local data and run code; inspect their declared
  capabilities before installation.
- Historical source overlays remain available only through versioned Git and
  release history.

Report bugs or questions in [GitHub Issues](https://github.com/lyrishark/community-addons/issues).
