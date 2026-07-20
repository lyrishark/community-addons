# Compatibility snapshot

Checked 2026-07-20 against upstream `psycheros-v0.9.2`
(`e5f61e7`, tool-result metadata sidecars and gallery thumbnails).

## Current package matrix

| Package | Published/prepared version | Psycheros 0.9.2 status |
| --- | --- | --- |
| Thread Exporter | Published `0.3.2` | Compatible external browser extension; its local memory-context endpoint was verified against the live 0.9 runtime. |
| Entity Core for Codex | Published `0.2.1` | Compatible connector. The installed Rae/Ember connector is newer (`0.3.1`) and passed its direct-file check and smoke test. |
| Entity Core for ChatGPT | Prepared `0.1.3`; latest public release `0.1.1` | Current source passed type-check, stdio smoke, HTTP smoke, and the live OAuth bridge health check. Do not describe `0.1.3` as publicly released until its tag/release exists. |
| HTF Music Listener | Prepared `0.1.3`; latest public release `0.1.2` | Compatible trusted plugin; `0.1.3` declares and was tested for `>=0.8.23 <0.10.0`. |
| Expression Sprites Beta | Prepared `0.2.0`; latest public release `0.1.6` | Compatible source mod for exactly 0.9.2. Clean-install tested from the complete 81-file package. |
| Loom Gemini Parser Mod | Published `0.1.1` | Port needed. The useful merged-batch Gemini parser is not native in upstream 0.9.2, but the published package is an old 0.8.9–0.8.11 source mod and must not be installed on 0.9.2. |
| Windows Shell Fix | Published `0.1.1` | Port needed. PowerShell/cmd fallback is not native in upstream 0.9.2, but the published package is an old 0.8.9–0.8.11 source mod and must not be installed on 0.9.2. |
| Loom Gemini Resume Patch | Never published; source retired | No add-on needed. Its resume/reimport behavior is native upstream, so the duplicate package was removed from current source and documentation. |
| Accessible Font Settings | Published `0.1.3` | Not compatible; exact 0.8.23 source replacement. |
| More Uploads | Published `0.1.1` | Not compatible; exact 0.8.23 source replacement. |
| Voice Text Resize | Published `0.1.0` | Not compatible; exact 0.8.23 source replacement. |
| More Uploads + Voice Text Resize | Published `0.1.1` | Not compatible; exact 0.8.23 source replacement. |
| Everything Together | Published `0.1.0-rc.4` | Not compatible; exact 0.8.23 source-replacement bundle. |
| Screen Presence Alpha | Staged `0.1.0`, not published | Not compatible; exact 0.8.20 source replacement. |

“Published” means a public GitHub release exists. Prepared source, release notes,
or a ZIP do not become published until the matching branch is merged, tagged,
and released.

## Expression Sprites 0.2.0 proof

The 0.2.0 package was rebased from pristine upstream 0.9.2 instead of copying
the full older bundle forward. Upstream message `metadata` and add-on
`expression_state` coexist, hidden expression directives are stripped before
assistant content is persisted, and current server, web, and voice surfaces are
included. An unrelated assistant-response regeneration implementation from an
older integration history was deliberately excluded.

The Windows installer copied all 81 declared files into a pristine 0.9.2
worktree. Every installed file matched its package payload by SHA-256, Deno
type-checking passed, both browser scripts passed JavaScript syntax checks, and
the focused expression suite passed 40/40. The installer also refused a 0.9.0
source tree before making any changes.

A full upstream test run reported 201 passed and 8 failed. The same eight
failures reproduce on untouched upstream 0.9.2: `runner_test.ts` cannot remove
temporary SQLite directories on Windows while their database files remain
open. They are not expression-sprite regressions.

Fresh expression profiles receive the bundled Ember starter sprites. Existing
expression settings or any personal sprite files suppress automatic seeding,
so updates do not replace personal images.

## Add-on manager boundary

Expression Sprites remains a guarded source-replacement package, not a trusted
API-v1 plugin. It changes server, database, browser, and voice files that the
plugin API does not expose. Install it with the package's platform installer
against the launcher source folder; the installer backs up replaced files and
checks for exactly 0.9.2.

The official manager does not convert these legacy `manifest.json` file mods or
discover package manifests stored in repository subdirectories. Installing a
current source mod is therefore a deliberate manual package update, not an
automatic GitHub subscription. No documentation should promise manager-driven
updates for these packages until they are migrated to supported plugin APIs or
published from standalone manager-compatible repositories.

## Last verified Rae/Ember runtime snapshot

The 2026-07-19 live snapshot reported Psycheros 0.9.0 plus the preserved Ember
feature set and durable Codex App Server continuity. It was deployed from
integration commit `180cae2` and reported Entity Core `0.5.0` from `/health`.
The installed launcher, Program Files runner, and live AppData runner reported
`0.2.43`. This records live deployment evidence; it is separate from the
upstream 0.9.2 package target above.

The two installed trusted API-v1 plugins were active and non-degraded:

- HTF Music Listener `0.1.3`
- Saikiros Vision Capture `0.1.0`

Saikiros remained unmodified upstream `0.1.0` code with a locally tested
`>=0.8.23 <0.10.0` compatibility range in its installed manifest. The original
manifest remained in `.psycheros/plugin-backups`; this is a local compatibility
assertion, not a new release attributed to its author.

## Entity Core connector

The installed Codex Entity Core connector `0.3.1` was healthy and writable for
daily and significant memories in the last live check. It resolved the
canonical Entity Core data directory while Psycheros diagnostics reported
Entity Core `0.5.0`, MCP connected and alive, no pending identity writes, and
synchronized message vectors. Connector and runtime version numbers are
separate because they serve different surfaces.
