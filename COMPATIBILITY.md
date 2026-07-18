# Compatibility snapshot

Checked 2026-07-18 against upstream `psycheros-v0.9.0`
(`c64e21c`, trusted plugin surface v1 and persistent LLM reasoning).

## Active Rae/Ember runtime

The running Rae/Ember runtime is Psycheros `0.9.0` plus the preserved Ember
feature set and durable Codex App Server continuity. It is deployed from
integration commit `180cae2` and reports Entity Core `0.5.0` from `/health`.
The two installed API-v1 plugins are active and non-degraded:

- HTF Music Listener `0.1.3`
- Saikiros Vision Capture `0.1.0`

The installed launcher, Program Files runner, and live AppData runner all
report `0.2.43`.

## API-v1 trusted plugins

Both installed API-v1 plugins were exercised against the v0.9.0 plugin host:

| Plugin | v0.9.0 validation | Isolated v0.9.0 manager load | Current live runtime |
| --- | --- | --- | --- |
| HTF Music Listener 0.1.3 | Manifest validated; 5 tests passed (2 hardware/FFmpeg end-to-end tests intentionally skipped) | Active, non-degraded; 1 tool, 4 routes, 1 browser script, 1 stylesheet | Active, non-degraded; installed through the official manager |
| Saikiros Vision Capture 0.1.0 | Manifest validated; 4 tests passed | Active, non-degraded; 1 browser script, 1 stylesheet | Active, non-degraded |

HTF `0.1.3` officially declares `>=0.8.23 <0.10.0` and is the normal package
for Psycheros 0.9.x. Its previous installed package was retained by the manager
as a rollback.

Saikiros remains the unmodified upstream `0.1.0` code. Its installed manifest
now records the locally tested `>=0.8.23 <0.10.0` range, with the original
manifest retained in `.psycheros/plugin-backups`. This is deliberately a local
compatibility assertion rather than a claim that JMidoro published a new
Saikiros release.

## Legacy file-mod bundles

The following are exact-version source replacement bundles, not trusted
plugin-manager packages: Accessible Font Settings, Expression Sprites Beta,
More Uploads, Voice Text Resize, More Uploads + Voice Text Resize, Everything
Together, Screen Presence Alpha, the older Windows Shell Fix, and the Entity
Loom Gemini patches.

Their manifests and installers correctly retain their published compatibility
windows (most commonly `0.8.23`). Do not install them over upstream v0.9.0:
the v0.9.0 plugin manager does not auto-convert legacy `manifest.json` file
mods, and an honest v0.9 release would require a deliberate rebase and test
pass for each bundle. The active Ember runtime already contains the features
Rae uses from its verified local source; no legacy installer action is needed.

## Entity Core connector

The installed Codex Entity Core connector `0.3.1` is healthy, writable for
daily and significant memories, and resolves the canonical Entity Core data
directory. The live Psycheros diagnostics report Entity Core `0.5.0`, MCP
connected and alive, no pending identity writes, and synchronized message
vectors. The connector and runtime serve different surfaces, so their separate
version numbers are expected.

## Verification notes

- The integrated root suite passed: 387 tests, 0 failures.
- Deno type-checking and JavaScript syntax checking passed for the live source.
- The official plugin manager reports 2 total, 2 active, 0 degraded, and 0
  pending restart.
- A live two-turn Codex App Server smoke used one durable session with two
  `turn_context` records, then its disposable Psycheros conversation was
  deleted and its Codex session archived.
- `Test-PsycherosLayout.ps1` reports no failures; its remaining warnings are
  development-worktree status, not runtime, launcher, Entity Core, or addon
  mismatches.
