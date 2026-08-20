# Compatibility snapshot

Checked 2026-08-20 against upstream main
`a1561f5a3589c859f6f7e5eba3fd8a2935fb7094`, tag `psycheros-v0.11.2`, Entity Core
`0.6.1`, and Psycheros plugin API v2. Plugin API v1 manifests remain accepted.

## Current 0.11 matrix

| Package                 | Version    | Compatibility result                                                                                                                                      |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTF Music Listener      | 0.3.0-rc.2 | Manager-native; Psycheros `>=0.10.0 <0.12.0`, Launcher `>=0.2.45`; shared Now Playing on Windows, macOS, and Linux.                                       |
| Accessibility Controls  | 0.1.0-rc.2 | Manager-native; additive to 0.11 Theme Studio because it owns typography and resizable Yin Yang input rather than theme colors.                           |
| Windows Shell Fix       | 0.3.0-rc.2 | Manager-native; still required on standard Windows installs while upstream issue #40 remains open.                                                        |
| More Uploads            | 0.4.0-rc.1 | Exact-0.11.2 guarded source bridge; restores multiple main-chat and Yin Yang typed attachments without replacing upstream Discord media.                 |
| Expression Sprites Beta | 0.4.0-rc.2 | Exact-0.11.2 guarded source bridge; no bundled character art.                                                                                             |
| Screen Presence Alpha   | 0.4.0-rc.2 | Exact-0.11.2 guarded source bridge.                                                                                                                       |
| Loom Gemini Parser      | 0.4.0-rc.2 | Exact-0.11.2 guarded Entity Loom source bridge.                                                                                                           |
| Everything Together     | 0.4.0-rc.2 | Expression + Screen source bridge plus exact Accessibility, Shell, and HTF manager artifacts. It does not yet include the revived More Uploads bridge.    |

## Why four packages remain source bridges

Plugin API v2 adds Discord media capabilities while preserving v1 manifests, but
it still does not cover every host seam used by these features:

- Expression Sprites needs streamed-response transformation, final-message
  metadata persistence, settings integration, and voice overlay hooks.
- Screen Presence needs an asynchronous pre-turn freshness barrier, host vision
  captioning, and voice-turn hooks.
- More Uploads needs multi-file composer state, request fields, persistence,
  rendering, document extraction, and typed-voice hooks.
- Entity Loom needs parser discovery or an upstream parser registration API.

Each source bridge accepts only pristine 0.11.2 files or its own identical
payload, preflights every file before writing, and keeps unknown local edits
untouched.

## Reconciliation decisions

- Upstream 0.11's native Discord media pipeline and single-image chat path do
  not supersede More Uploads: stock chat and typed voice still hold only one
  attachment. More Uploads was therefore rebased as a new exact-0.11.2 release;
  the older 0.10 assets remain historical.
- Accessibility Controls remains useful beside Theme Studio: Theme Studio owns
  palette and decoration, while Accessibility Controls owns typography, text
  sizing, and Yin Yang input resizing.
- Windows Shell Fix remains useful because upstream still invokes `sh -c` on
  Windows. [Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40)
  was still open at this check.
- HTF Music Listener is independent of the new Workspace, Skills, Theme Studio,
  and Discord-media paths.
- Everything Together 0.4.0-rc.2 still contains only the Expression and Screen
  source bridges plus three manager plugins. It conflicts with standalone More
  Uploads until a future combined release merges the overlapping host files.

## Verification completed

- More Uploads: focused tests, Deno type-check, JavaScript syntax checks, clean
  guarded install on pristine 0.11.2, and exact source-payload comparison.
- Expression Sprites: focused tests, Deno type-check, clean guarded install on
  pristine 0.11.2, and exact source-payload comparison.
- Screen Presence: focused tests, Deno type-check, clean guarded install on
  pristine 0.11.2, and exact source-payload comparison.
- Everything Together: combined focused tests, Deno type-check, clean guarded
  install on pristine 0.11.2, exact source-payload comparison, and exact
  manager-artifact hashes.
- Loom Gemini Parser: parser format/check/test plus clean guarded install on
  pristine 0.11.2.
- Accessibility Controls: formatting, lint, type-check, and four focused tests.
- Windows Shell Fix: formatting, lint, type-check, and five focused tests.
- HTF Music Listener: formatting, lint, type-check, and 16 focused tests (two
  platform-specific tests ignored on this Windows host). Its native runtime
  manifest deliberately remains byte-pinned to the existing RC1 binaries.
- Source installers: the More Uploads Windows installer and exact release ZIP
  were executed on clean 0.11.2 worktrees. Its Linux installer is exercised by
  CI against the same immutable upstream tag.

## Independent projects

- Thread Exporter `0.3.2` remains browser-only; its JavaScript parsed cleanly
  and no version change was needed.
- Entity Core for Codex `0.4.0` now bundles Entity Core `0.6.1` and plugin API
  v2. Its exact release ZIP passed type-check, platform tests, and read/write
  smoke testing.
- ChatGPT Entity Core Private Bridge `0.3.0` now bundles Entity Core `0.6.1`,
  plugin API v2, and connector `0.5.0`, while preserving its lexical FTS search
  seam. Its exact release ZIP passed type-check, platform tests, and stdio,
  HTTP, and OAuth smoke tests.

These projects have independent release streams and are not Psycheros
plugin-manager packages.

## Historical releases

The [historical index](historical/README.md) points to immutable 0.8/0.9 tags,
releases, and checksums. More Uploads' old 0.10 assets and its combined 0.10
suite remain historical; use the standalone 0.4.0-rc.1 bridge on 0.11.2.
