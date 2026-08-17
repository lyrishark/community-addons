# Psycheros Community Addons

Community-built, local-first companion projects for Psycheros. They are
source-visible and are not official Psycheros releases.

Read [COMPATIBILITY.md](COMPATIBILITY.md) before installing anything.

## Prepared for Psycheros 0.11

| Package                                                                | Version               | Install surface            | Purpose                                                                                            |
| ---------------------------------------------------------------------- | --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| [HTF Music Listener](psycheros-htf-music-listener/README.md)           | `0.3.0-rc.2` prepared | Settings > Plugins         | Local HTF listening, sensory library, synced lyrics, and Windows/macOS/Linux Now Playing presence. |
| [Accessibility Controls](psycheros-accessibility-controls/README.md)   | `0.1.0-rc.2` prepared | Settings > Plugins         | Typography controls and resizable Yin Yang text input; additive to Theme Studio.                   |
| [Windows Shell Fix](psycheros-windows-shell-fix/README.md)             | `0.3.0-rc.2` prepared | Settings > Plugins         | Native host-shell execution on Windows while upstream issue #40 remains open.                      |
| [Expression Sprites Beta](psycheros-expression-sprites-beta/README.md) | `0.4.0-rc.1` prepared | Guarded source bridge      | Live expression state and user-supplied chat/voice sprites.                                        |
| [Screen Presence Alpha](psycheros-screen-presence-alpha/README.md)     | `0.4.0-rc.1` prepared | Guarded source bridge      | Consent-based screen context in chat and voice.                                                    |
| [Loom Gemini Parser](psycheros-loom-gemini-parser-mod/README.md)       | `0.4.0-rc.1` prepared | Guarded Loom source bridge | Merged Gemini export import in Entity Loom.                                                        |
| [Everything Together](psycheros-everything-together/README.md)         | `0.4.0-rc.1` prepared | Release suite              | Expression + Screen source bridge with exact Accessibility, Shell, and HTF manager ZIPs.           |

Manager plugins target Psycheros `>=0.10.0 <0.12.0`. Source bridges target
exactly `0.11.0`, verify stock-file hashes before writing, back up replaced
files, and refuse unknown local edits.

These versioned artifacts are built and tested but not tagged or published yet.
Existing public 0.10 releases remain available on GitHub Releases until this
review branch is merged and a separate publish decision is made.

## Independent projects

| Project                                                          | Version          | Surface                                                               |
| ---------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| [Thread Exporter](browser-thread-exporter/README.md)             | 0.3.2            | Browser extension; no Psycheros host dependency.                      |
| [Entity Core for Codex](codex-entity-core-plugin/README.md)      | `0.4.0` prepared | Cross-platform Codex MCP/plugin package; bundles Entity Core 0.6.1.   |
| [Entity Core for ChatGPT](chatgpt-entity-core-private/README.md) | `0.3.0` prepared | Cross-platform private HTTPS/OAuth bridge; bundles Entity Core 0.6.1. |

These projects have their own version streams. Their package numbers do not
imply the version of Entity Core bundled with Psycheros.

## Historical releases

More Uploads is now part of upstream Psycheros 0.11. Its standalone package and
the More Uploads + Voice Text Controls suite remain historical 0.10 releases and
must not be installed over 0.11. Older 0.8/0.9 source overlays likewise remain
available only through immutable tags and releases. See
[historical/README.md](historical/README.md).

## Releases and trust

Public downloads are on
[GitHub Releases](https://github.com/lyrishark/community-addons/releases).
[SHA256SUMS.txt](SHA256SUMS.txt) records current artifact checksums.

- No analytics, ads, or developer-owned telemetry are included.
- Browser actions and local sensory sharing are user-triggered.
- Trusted plugins can read local data and run code; inspect capabilities before
  installation.
- A working directory is not a release. Use the matching tagged archive.

Report bugs or questions in
[GitHub Issues](https://github.com/lyrishark/community-addons/issues).
