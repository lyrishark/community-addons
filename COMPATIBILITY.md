# Compatibility snapshot

Reconciled 2026-09-22 against upstream main
`2bb9c9e751b2539aac20588d8a72f70a0c8d36d9` (Psycheros `0.11.3`). Entity Core
remains `0.6.1`; plugin API v2 continues accepting v1 manifests.

## Current releases

| Package | Version | Install surface |
| --- | --- | --- |
| HTF Music Listener | 0.3.0-rc.3 | Manager plugin, >=0.10.0 <0.12.0; Launcher >=0.2.45 |
| Accessibility Controls | 0.1.0-rc.3 | Manager plugin, >=0.10.0 <0.12.0 |
| Windows Shell Fix | 0.3.0-rc.3 | Manager plugin, >=0.10.0 <0.12.0 |
| More Uploads | 0.4.0-rc.2 | Stock 0.11.3 source bridge |
| Expression Sprites Beta | 0.4.0-rc.3 | Stock 0.11.3 source bridge |
| Screen Presence Alpha | 0.4.0-rc.3 | Stock 0.11.3 source bridge |
| Loom Gemini Parser | 0.4.0-rc.3 | Stock 0.11.3 Entity Loom source bridge |
| Everything Together | 0.4.0-rc.4 | Combined source bridge and exact manager ZIPs |

Everything Together contains **More Uploads + Expression Sprites + Screen
Presence**, plus the three manager plugins above. The former documentation
saying it omitted More Uploads was stale. Do not stack these individual source
bridges; choose the combined suite when you want their overlapping features.
Loom is separate.

## Update safely

Back up your installation and close Psycheros/Loom. Source bridges accept only
**pristine 0.11.3 files or their own identical current payloads**. Update/reinstall
official source to a clean 0.11.3 tree first. Older addon overlays and unknown
local edits deliberately fail preflight without writes; do not bypass that
guard. Personal data/configuration is not part of these source archives.
Installers preserve replaced files in timestamped backups.

Manager plugins retain their existing supported range and capabilities. Their
new release numbers record this compatibility refresh; they are not feature
rewrites. HTF native runtimes remain pinned to existing immutable RC1 assets,
not silently rebuilt or replaced.

## Reconciliation decisions

- The upstream patch adds lorebook recursion deduplication, pulse backoff, vault
  bookkeeping/export fixes, and sandbox improvements. Overlapping addon DB and
  pulse files retain the new upstream code. Stock-hash guards are regenerated
  for 0.11.3 in both PowerShell and shell installers, where provided.
- More Uploads still adds multiple chat/typed-voice attachments; native Discord
  media and the stock single-image composer do not replace it.
- Expressions and screen presence still need host seams absent from plugin API
  v2; Loom still lacks a parser-registration plugin API.
- Accessibility remains additive to Theme Studio (typography/input resizing,
  not theme palettes).
- Windows Shell Fix remains useful: upstream sandbox changes do not remove its
  Windows `sh -c` dependency. [Upstream #40](https://github.com/PsycherosAI/Psycheros/issues/40)
  remains open at this check.
- The new upstream fuzzy vault targeting and pulse-skip/backoff defects are
  tracked in [#62](https://github.com/PsycherosAI/Psycheros/issues/62) and
  [#63](https://github.com/PsycherosAI/Psycheros/issues/63). These addon releases
  are not general-purpose fixes for unrelated host defects; they do not claim
  to fix either issue.

## Verification scope

Release validation uses the exact packaged source ZIPs on isolated stock
0.11.3 trees: guarded install, identical reinstall, payload hash equality,
type-checks, feature tests, and browser JavaScript syntax checks. CI covers
Windows/Linux installers for More Uploads and Everything Together; HTF CI
covers its supported Windows, Linux, and macOS platforms. See the release PR
checks for results rather than assuming a platform was tested locally.

Manager checks cover Accessibility (4 tests), Shell (5), and HTF (16, with
2 optional media-conversion end-to-end tests not run on the local host).
Packaged suite manager ZIPs are pinned by SHA-256. This is code/package
verification, not a fresh manual end-to-end session on every platform.

## Independent and historical projects

Thread Exporter `0.3.2`, Entity Core for Codex `0.4.0`, and the private ChatGPT
bridge `0.3.0` keep their independent version streams. The upstream patch does
not change their bundled Core/plugin contracts; no new connector/browser release
is required. Their earlier release verification is not represented as a new
live browser/OAuth test here.

Old releases/tags remain immutable. Use the version-specific historical
release for stock 0.11.2 or earlier, not a current 0.11.3 bridge.
See [historical/README.md](historical/README.md).
