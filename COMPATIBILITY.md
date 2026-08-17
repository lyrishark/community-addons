# Compatibility snapshot

Checked 2026-08-17 against upstream main
`261ea0d604aea13bf516ef12f638e3d286b1d191`, tag `psycheros-v0.11.0`
(`4405cb4cf5c8b812260dc68c80581355da786b13`), Entity Core `0.6.1`, and Psycheros
plugin API v2. Plugin API v1 manifests remain accepted.

## Prepared 0.11 matrix

| Package                 | Version    | Compatibility result                                                                                                                                      |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTF Music Listener      | 0.3.0-rc.2 | Manager-native; Psycheros `>=0.10.0 <0.12.0`, Launcher `>=0.2.45`; shared Now Playing on Windows, macOS, and Linux.                                       |
| Accessibility Controls  | 0.1.0-rc.2 | Manager-native; additive to 0.11 Theme Studio because it owns typography and resizable Yin Yang input rather than theme colors.                           |
| Windows Shell Fix       | 0.3.0-rc.2 | Manager-native; still required on standard Windows installs while upstream issue #40 remains open.                                                        |
| Expression Sprites Beta | 0.4.0-rc.1 | Exact-0.11 guarded source bridge; no bundled character art.                                                                                               |
| Screen Presence Alpha   | 0.4.0-rc.1 | Exact-0.11 guarded source bridge.                                                                                                                         |
| Loom Gemini Parser      | 0.4.0-rc.1 | Exact-0.11 guarded Entity Loom source bridge.                                                                                                             |
| Everything Together     | 0.4.0-rc.1 | Expression + Screen source bridge plus exact Accessibility, Shell, and HTF manager artifacts. More Uploads was removed because 0.11 provides it upstream. |

## Why three packages remain source bridges

Plugin API v2 adds Discord media capabilities while preserving v1 manifests, but
it still does not cover every host seam used by these features:

- Expression Sprites needs streamed-response transformation, final-message
  metadata persistence, settings integration, and voice overlay hooks.
- Screen Presence needs an asynchronous pre-turn freshness barrier, host vision
  captioning, and voice-turn hooks.
- Entity Loom needs parser discovery or an upstream parser registration API.

Each source bridge accepts only pristine 0.11.0 files or its own identical
payload, preflights every file before writing, and keeps unknown local edits
untouched.

## Reconciliation decisions

- Upstream 0.11's native image/audio Discord pipeline supersedes More Uploads.
  The old More Uploads packages remain historical 0.10 artifacts and receive no
  fake 0.11 version bump.
- Accessibility Controls remains useful beside Theme Studio: Theme Studio owns
  palette and decoration, while Accessibility Controls owns typography, text
  sizing, and Yin Yang input resizing.
- Windows Shell Fix remains useful because upstream still invokes `sh -c` on
  Windows. [Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40)
  was still open at this check.
- HTF Music Listener is independent of the new Workspace, Skills, Theme Studio,
  and Discord-media paths.
- Everything Together now contains only the two Psycheros source bridges and the
  three current manager plugins. It no longer carries duplicated upload code.

## Verification completed

- Expression Sprites: 31 focused tests, full Deno type-check, clean guarded
  install on pristine 0.11, and exact source-payload comparison.
- Screen Presence: five focused tests, full Deno type-check, clean guarded
  install on pristine 0.11, and exact source-payload comparison.
- Everything Together: 36 combined focused tests, full Deno type-check, clean
  guarded install on pristine 0.11, exact source-payload comparison, and exact
  manager-artifact hashes.
- Loom Gemini Parser: parser format/check/test plus clean guarded install on
  pristine 0.11.
- Accessibility Controls: formatting, lint, type-check, and four focused tests.
- Windows Shell Fix: formatting, lint, type-check, and five focused tests.
- HTF Music Listener: formatting, lint, type-check, and 16 focused tests (two
  platform-specific tests ignored on this Windows host). Its native runtime
  manifest deliberately remains byte-pinned to the existing RC1 binaries.
- Source installers: Windows installers were executed on clean 0.11 worktrees.
  Unix installers were mechanically refreshed but were not executed on this
  Windows-only host.

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
releases, and checksums. More Uploads and its combined 0.10 suite are also
historical for a Psycheros 0.11 installation.
