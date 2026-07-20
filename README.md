# Psycheros Community Addons

Community-built, local-first addons for Psycheros. They are source-visible and
are not official Psycheros releases.

Read [COMPATIBILITY.md](COMPATIBILITY.md) before installing. The current source
packages target **Psycheros 0.9.2 exactly** unless their own manifest says
otherwise.

## Current packages

| Package | Current source | What it adds |
| --- | --- | --- |
| [Thread Exporter](browser-thread-exporter/README.md) | 0.3.2 | Exports ChatGPT, Claude, and Gemini threads; merges Gemini timestamps; injects selected local memory context. |
| [Entity Core for Codex](codex-entity-core-plugin/README.md) | 0.2.1 public | Connects Codex to local Entity Core through MCP. |
| [Entity Core for ChatGPT](chatgpt-entity-core-private/START_HERE.md) | 0.1.3 prepared | Private OAuth bridge from ChatGPT Developer Mode to local Entity Core. |
| [Loom Gemini Parser Mod](psycheros-loom-gemini-parser-mod/README.md) | 0.2.0 prepared | Imports merged Gemini batch exports into Entity Loom. |
| [Accessible Font Settings](psycheros-accessible-font-settings/README.md) | 0.2.0 prepared | Text sizing and reading-oriented font presets. |
| [Windows Shell Fix](psycheros-windows-shell-fix/README.md) | 0.2.0 prepared | Uses the host Windows shell with a safe PowerShell-to-cmd spawn fallback. |
| [Screen Presence Alpha](psycheros-screen-presence-alpha/README.md) | 0.2.0 prepared | User-controlled screen context for chat and voice. |
| [Expression Sprites Beta](psycheros-expression-sprites-beta/README.md) | 0.2.0 prepared | Streaming expressions, sprite packs, chat/voice display, and persistence. |
| [More Uploads](psycheros-more-uploads/README.md) | 0.2.0 prepared | Multiple images, documents, and music files in chat and typed voice. |
| [Voice Text Resize](psycheros-voice-text-resize/README.md) | 0.2.0 prepared | Adaptive and manually resizable Yin Yang typed input. |
| [Uploads + Voice Resize](psycheros-more-uploads-voice-resize/README.md) | 0.2.0 prepared | The two overlapping UI features composed safely. |
| [Everything Together](psycheros-everything-together/README.md) | 0.2.0 prepared | The current 0.9.2 source features composed in one package; Windows x64 release also bundles HTF legacy. |
| [HTF Music Listener](psycheros-htf-music-listener/README.md) | 0.1.3 prepared | A trusted local plugin that produces an HTF v2 sensory handoff for explicitly requested music. |

“Prepared” means the source, release notes, and archive are ready on the current
branch. It does not mean a matching public tag or GitHub release exists yet.

## Choosing a source package

Use one package for any files it owns:

- Choose **Everything Together** for uploads, voice resize, fonts, Windows
  shell handling, screen presence, and expression sprites in one installation.
- Choose **Uploads + Voice Resize** when those are the only two overlapping UI
  changes needed.
- Otherwise use the narrow standalone package.
- The Gemini parser changes Entity Loom and can be installed independently.
- HTF's normal package is a trusted plugin. Its separately labeled legacy
  Windows package is for source-based Custom Tools installations.

Everything Together 0.2.0 deliberately excludes three unrelated experiments
that appeared in older integration snapshots: missing-response regeneration,
voice-started auto-titling, and queued typed-turn draining.

## Add-on manager boundary

The Psycheros add-on manager can install the API-v1 HTF plugin. It cannot safely
install or update the `manifest.json` source-file mods because those replace
core Psycheros or Entity Loom files. Download and extract those packages, then
run their guarded `install.ps1` or `install.sh`. Each current source installer:

- accepts Psycheros 0.9.2 only;
- makes timestamped backups before replacement;
- refuses unsupported versions before changing files;
- preserves Psycheros data, identity, memory, and state directories.

Official Psycheros source updates can replace modded files. Reinstall the
matching source package after updating Psycheros.

## Releases and checksums

Public downloads are on [GitHub Releases](https://github.com/lyrishark/community-addons/releases).
Prepared 0.2.0 archives are listed in [SHA256SUMS.txt](SHA256SUMS.txt); their
release links should be added only after the branch is merged, tagged, and
published.

Older public versions remain available for their documented Psycheros versions.
Do not infer current compatibility from an older release number.

## Trust notes

- No analytics, ads, or developer-owned telemetry are included.
- Browser actions and screen sharing are user-triggered.
- The browser extension inserts reviewed context but never presses Send.
- Entity Core connectors do not expose direct identity/core mutation.
- Screen frames are transient; entity context receives compact text summaries.
- Exact file-mod compatibility is enforced before installation.

Report bugs or questions in [GitHub Issues](https://github.com/lyrishark/community-addons/issues).
