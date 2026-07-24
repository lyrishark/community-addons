# Psycheros Community Addons

Community-built, local-first companion projects for Psycheros. They are
source-visible and are not official Psycheros releases.

Read [COMPATIBILITY.md](COMPATIBILITY.md) before installing anything.

## Current Psycheros 0.10 addon

| Package | Version | Install surface | What it adds |
| --- | --- | --- | --- |
| [HTF Music Listener](psycheros-htf-music-listener/README.md) | 0.2.0 prepared | Settings > Plugins | Explicit one-off HTF listening plus an opt-in local sensory library, verified synced lyrics, and shared Windows Now Playing presence. |

HTF Music Listener 0.2.0 is a trusted API-v1 plugin. It declares Psycheros
`>=0.10.0 <0.11.0`, Launcher `>=0.2.45`, the official plugin-settings
capability, and a compatibility-safe GitHub update channel.

Install the release zip through **Settings > Plugins**. Ember/Nyx builds that
contain the compatibility-safe updater can also inspect this repository with
package path `psycheros-htf-music-listener`; the same metadata lets later
compatible tags appear as one-click updates. The corresponding upstream change
is tracked in [Psycheros PR #37](https://github.com/PsycherosAI/Psycheros/pull/37).

## Historical Psycheros source packages

The following directories are preserved as exact Psycheros 0.9.2 artifacts:

- `psycheros-expression-sprites-beta`
- `psycheros-accessible-font-settings`
- `psycheros-more-uploads`
- `psycheros-voice-text-resize`
- `psycheros-more-uploads-voice-resize`
- `psycheros-screen-presence-alpha`
- `psycheros-windows-shell-fix`
- `psycheros-loom-gemini-parser-mod`
- `psycheros-everything-together`

They are guarded `manifest.json` source replacements, not plugin-manager
packages, and they must not be installed over Psycheros 0.10. Their old tags,
release assets, manifests, installers, and documentation remain available so a
0.9.2 installation can be reproduced without turning those snapshots into the
current recommendation.

No new 0.10 source-overlay bundle is planned. Features that are now native or
permanent in the maintained Psycheros channels should be developed there;
future community addons should use supported plugin APIs.

## Other companion projects

These repository projects are versioned independently and do not install into
the Psycheros plugin manager:

| Project | Public/prepared version | Surface |
| --- | --- | --- |
| [Thread Exporter](browser-thread-exporter/README.md) | 0.3.2 public | Browser extension for exporting ChatGPT, Claude, and Gemini threads. |
| [Entity Core for Codex](codex-entity-core-plugin/README.md) | 0.2.1 public | Codex MCP/plugin package; its bundled Entity Core snapshot is separate from the Psycheros 0.10 runtime. |
| [Entity Core for ChatGPT](chatgpt-entity-core-private/START_HERE.md) | 0.1.3 prepared; 0.1.1 public | Private OAuth bridge; not a Psycheros addon. |

Do not infer Entity Core 0.6 compatibility from those package numbers. Use each
project's own release notes and compatibility statement.

## Releases and trust

Public downloads are on [GitHub Releases](https://github.com/lyrishark/community-addons/releases).
Prepared source or a local archive is not public until the matching branch is
merged, tagged, and released. [SHA256SUMS.txt](SHA256SUMS.txt) records published
or staged artifact checksums; older versions remain available for their stated
Psycheros versions.

- No analytics, ads, or developer-owned telemetry are included.
- Browser actions, music-library sharing, and screen sharing are user-triggered.
- Trusted plugins can read local data and run code; inspect their declared
  capabilities before installation.
- Exact source-mod compatibility is enforced before historical installation.

Report bugs or questions in [GitHub Issues](https://github.com/lyrishark/community-addons/issues).
