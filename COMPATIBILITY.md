# Compatibility snapshot

Checked 2026-07-24 against stock `psycheros-v0.10.0`, Entity Core 0.6.0, and
Psycheros plugin API v1.

## Current matrix

| Package | Version | Compatibility result |
| --- | --- | --- |
| HTF Music Listener | 0.2.0 | Manager-native; Psycheros `>=0.10.0 <0.11.0`, Launcher `>=0.2.45`. |
| Accessibility Controls | 0.1.0-rc.1 | Manager-native; replaces the font and voice-resize source overlays. |
| Windows Shell Fix | 0.3.0-rc.1 | Manager-native; replaces the stock `shell` tool registration on Windows. |
| More Uploads | 0.3.0-rc.1 | Exact-0.10 guarded source bridge. |
| Expression Sprites Beta | 0.3.0-rc.1 | Exact-0.10 guarded source bridge; no bundled character art. |
| Screen Presence Alpha | 0.3.0-rc.1 | Exact-0.10 guarded source bridge. |
| Loom Gemini Parser | 0.3.0-rc.1 | Exact-0.10 guarded Entity Loom source bridge. |
| More Uploads + Voice Text Controls | 0.3.0-rc.1 | Upload source bridge plus exact Accessibility Controls manager artifact. |
| Everything Together | 0.3.0-rc.1 | Merged source bridge plus exact Accessibility, Shell, and HTF artifacts. |

## Why four packages remain source bridges

API v1 supports tools, routes, browser assets, settings, and prompt text hooks,
but it does not yet cover every host seam used by these features:

- More Uploads needs attachment lifecycle, multimodal-turn, persistence, and
  message-rendering hooks.
- Expression Sprites needs streamed-response transformation, final-message
  metadata persistence, settings integration, and voice overlay hooks.
- Screen Presence needs an asynchronous pre-turn freshness barrier, host vision
  captioning, and voice-turn hooks.
- Entity Loom needs parser discovery or an upstream parser registration API.

Those are limits on a pure manager-native implementation, not blockers to a
0.10-compatible release. Each source bridge accepts only pristine 0.10.0 files
or its own identical payload, and preflights every file before any write.

## Verification completed

- More Uploads: six focused tests, Deno checks, JavaScript syntax, clean install,
  and atomic refusal of a simulated local edit.
- Expression Sprites: 31 focused tests, Deno checks, JavaScript syntax, clean
  install, and atomic refusal. Personalized rules and bundled art were removed.
- Screen Presence: five focused tests, Deno checks, JavaScript syntax, clean
  install, and atomic refusal. An unrelated provider-error overlay was removed.
- Everything Together: 42 combined tests, Deno checks, JavaScript syntax, clean
  install, and atomic refusal.
- Loom Gemini Parser: parser format/check/test and clean guarded install.
- Accessibility Controls and Windows Shell Fix: stock validator, exact-ZIP
  manager inspection/install, focused tests, and active manager load.
- HTF Music Listener: stock validator, plugin tests, Windows helper builds,
  exact-ZIP manager install/restart, settings smoke, and update check.

PowerShell installers were executed on clean Windows worktrees. Unix installer
scripts are included for the Psycheros source bridges but were not executed on
this Windows-only validation host.

## Removed as redundant or out of scope

- Accessible Font Settings and Voice Text Resize are superseded by
  Accessibility Controls.
- The old source-level Windows shell replacement is superseded by the API-v1
  plugin; the underlying host issue is tracked as
  [Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40).
- Combined bundles no longer duplicate manager-native accessibility, shell, or
  HTF implementations.
- The unrelated provider-balance error overlay is not carried by Screen
  Presence or Everything Together.

## Independent projects

Thread Exporter 0.3.2 remains browser-only. Entity Core for Codex 0.2.2 and the
ChatGPT bridge 0.1.3 have independent runtimes and release streams; they are not
Psycheros plugin-manager packages.

## Historical releases

The [historical index](historical/README.md) points to immutable 0.8/0.9 tags,
releases, and checksums. Historical payloads are not current installation
sources for Psycheros 0.10.
