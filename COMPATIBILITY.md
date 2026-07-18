# Compatibility snapshot

Checked 2026-07-18 against upstream `psycheros-v0.9.0`
(`c64e21c`, trusted plugin surface v1 and persistent LLM reasoning).

## Active Rae/Ember runtime

The running Rae/Ember runtime is the verified `0.8.23` line plus local Ember
work; it is deliberately not relabeled as `0.9.0`. The two installed trusted
plugins are active and non-degraded in that runtime:

- HTF Music Listener `0.1.2`
- Saikiros Vision Capture `0.1.0`

The launcher is `0.2.42`; its runner remains `0.2.16`. This is an existing
launcher maintenance warning, not a plugin load failure.

## API-v1 trusted plugins

Both installed API-v1 plugins were exercised against the v0.9.0 plugin host:

| Plugin | v0.9.0 validation | Isolated v0.9.0 manager load | Current live runtime |
| --- | --- | --- | --- |
| HTF Music Listener 0.1.2 | Manifest validated; 5 tests passed (2 hardware/FFmpeg end-to-end tests intentionally skipped) | Active, non-degraded; 1 tool, 4 routes, 1 browser script, 1 stylesheet | Active, non-degraded |
| Saikiros Vision Capture 0.1.0 | Manifest validated; 4 tests passed | Active, non-degraded; 1 browser script, 1 stylesheet | Active, non-degraded |

Their released `plugin.json` files still declare the conservative
`>=0.8.23 <0.9.0` range. That is release metadata which has not been retagged
in this documentation-only pass; the evidence above establishes API-v1
compatibility with v0.9.0 without pretending a new package release exists.

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

The installed Codex Entity Core connector `0.3.1` remains healthy against the
canonical Entity Core data directory. Upstream v0.9.0 advances Entity Core to
`0.5.0` by adding the trusted plugin surface; it does not change the storage,
sync, snapshot, or graph modules used by the connector. This is therefore not
a reason to replace the working local bridge.

## Verification notes

- Upstream v0.9.0's plugin API and plugin-manager tests passed.
- The upstream Entity Core runner tests currently hit a repeatable Windows
  temporary SQLite directory cleanup lock (8 cleanup failures after test work
  completes). This is upstream test-harness maintenance, unrelated to either
  addon and not present in the live addon checks above.
- Full upstream integration is intentionally separate from this compatibility
  record because it is a large source merge, not a version-label change.
