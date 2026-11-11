# Compatibility snapshot

Reconciled 2026-11-10 against upstream tag `psycheros-v1.0.2`, commit
`1b575abb5fd5494af7fa713756dfc7d3ae189c73`.

## Current releases

| Package | Version | Install surface |
| --- | --- | --- |
| HTF Music Listener | 0.3.0-rc.4 | Manager plugin, >=0.10.0 <2.0.0; Launcher >=0.2.45 |
| Accessibility Controls | 0.1.0-rc.4 | Manager plugin, >=0.10.0 <2.0.0 |
| Windows Shell Fix | 0.3.0-rc.4 | Manager plugin, >=0.10.0 <2.0.0 |
| More Uploads | 0.5.0-rc.1 | Stock 1.0.2 source bridge |
| Expression Sprites Beta | 0.5.0-rc.1 | Stock 1.0.2 source bridge |
| Screen Presence Alpha | 0.5.0-rc.1 | Stock 1.0.2 source bridge |
| Loom Gemini Parser | 0.5.0-rc.1 | Stock 1.0.2 Entity Loom source bridge |
| Everything Together | 0.5.0-rc.1 | Combined source bridge and exact manager ZIPs |

Everything Together contains More Uploads, Expression Sprites, and Screen
Presence plus the three manager plugins above. Do not stack the individual
source bridges with the suite. Loom is separate.

## Update safely

Back up the installation and close Psycheros/Loom. Source bridges accept only
pristine 1.0.2 files or their own identical current payload. Update or reinstall
official source to a clean 1.0.2 tree first. Older addon overlays and unknown
local edits deliberately fail preflight without writes. Personal data and
configuration are not part of these source archives; replaced source files are
saved in timestamped backups.

Manager-plugin release numbers record verified 1.0.2 compatibility, not feature
rewrites. HTF native runtimes remain pinned to existing immutable RC1 assets.

## Reconciliation decisions

- Psycheros 1.0's action drawer, Flux paths, multimodal turns, current agent
  loop, launcher safety fixes, and Entity Loom UI are retained in every overlap.
- More Uploads remains necessary because stock 1.0.2 still retains one
  attachment at a time in the main and typed-voice composers.
- Expression Sprites and Screen Presence still require host seams absent from
  the manager plugin API; Loom still lacks parser registration.
- Accessibility remains additive to Theme Studio.
- The bundled upstream `entity-shell` is a game-world/MUSH plugin, not a host OS
  shell replacement. Windows Shell Fix therefore remains useful while
  [upstream #40](https://github.com/PsycherosAI/Psycheros/issues/40) remains open.

## Verification scope

Release validation uses exact packaged ZIPs on isolated stock 1.0.2 trees:
guarded install, identical reinstall, payload equality, type checks, focused
feature tests, and browser JavaScript syntax checks. Manager checks cover
Accessibility (4 tests), Shell (5), and HTF (16 passing, with 2 optional media
conversion end-to-end tests not run locally). Packaged suite manager ZIPs are
pinned by SHA-256. CI supplies the cross-platform installer checks.

## Independent and historical projects

Thread Exporter 0.3.2, Entity Core for Codex 0.4.0, and the private ChatGPT
bridge 0.3.0 keep independent version streams. Old releases and tags remain
immutable. Use the version-specific historical release for Psycheros 0.11.3 or
earlier; never relabel an old source overlay as 1.0.2 compatible. See
[historical/README.md](historical/README.md).
