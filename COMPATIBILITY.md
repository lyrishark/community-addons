# Compatibility snapshot

Checked 2026-07-24 against upstream `psycheros-v0.10.0` / Entity Core 0.6.0
and the reconciled Ember/Nyx 0.10 source.

## Current manager-native addon

| Package | Version | Psycheros status |
| --- | --- | --- |
| HTF Music Listener | [0.2.0 public](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.2.0) | Compatible with Psycheros `>=0.10.0 <0.11.0` and Launcher `>=0.2.45`. Trusted plugin only; no 0.10 source patch. |

Verification for HTF Music Listener 0.2.0:

- Deno type-check passed.
- Plugin tests passed 7/7; two external-runtime end-to-end tests remain
  explicitly opt-in.
- The Psycheros 0.10 plugin validator accepted the manifest, entrypoint, browser
  assets, routes, prompt hook, and official settings capability.
- The Windows Now Playing watcher passed Rust formatting, test compilation, and
  optimized release compilation.
- The manifest records the community monorepo, package path, and
  `psycheros-htf-music-listener-v*` tag stream.

The published release zip works with the stock Psycheros 0.10 plugin installer.
The live 0.10 manager install, restart, settings fragment, and GitHub update
check were verified on 2026-07-24. Automatic
updates from a plugin stored below a monorepo root additionally require the
compatibility-safe updater in Ember/Nyx or upstream PR #37. That updater checks
the tagged manifest before replacement, skips incompatible versions, and keeps
the prior plugin in a timestamped backup.

## Historical 0.9.2 source packages

| Package | Last prepared 0.9.2 version | 0.10 status |
| --- | --- | --- |
| Expression Sprites Beta | 0.2.0 | Historical only; do not install over 0.10. |
| Loom Gemini Parser Mod | 0.2.0 | Historical only; do not install over 0.10. |
| Windows Shell Fix | 0.2.0 | Historical only; do not install over 0.10. |
| Accessible Font Settings | 0.2.0 | Historical only; do not install over 0.10. |
| More Uploads | 0.2.0 | Historical only; do not install over 0.10. |
| Voice Text Resize | 0.2.0 | Historical only; do not install over 0.10. |
| More Uploads + Voice Text Resize | 0.2.0 | Historical only; do not install over 0.10. |
| Everything Together | 0.2.0 | Historical only; do not install over 0.10. |
| Screen Presence Alpha | 0.2.0 | Historical only; do not install over 0.10. |

These packages retain their exact-version installer guards and historical
payloads. They are not converted to manager plugins by changing a manifest,
because they replace core server, database, browser, voice, or Loom files that
the plugin API does not own.

The retired Loom resume patch remains absent from current source: its behavior
was incorporated upstream, so preserving another live package would only create
two competing implementations.

## Historical HTF releases

HTF 0.1.x packages remain distinct for the Psycheros 0.8/0.9 installations they
target. The 0.2.0 build does not emit a new legacy package and must not overwrite
those release assets.

## Independent projects

Thread Exporter, Entity Core for Codex, and Entity Core for ChatGPT are not
Psycheros manager addons. Their browser/MCP/OAuth surfaces and bundled runtime
snapshots have separate versioning. In particular, the public Codex package's
bundled Entity Core snapshot must not be described as Entity Core 0.6 merely
because Psycheros itself is now 0.10.
