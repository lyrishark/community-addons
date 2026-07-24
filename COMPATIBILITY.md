# Compatibility snapshot

Checked 2026-07-24 against stock `psycheros-v0.10.0`, Entity Core 0.6.0, and
the Psycheros plugin API v1 validator.

## Current manager-native plugins

| Package | Version | Psycheros status |
| --- | --- | --- |
| HTF Music Listener | [0.2.0 public](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.2.0) | Compatible with Psycheros `>=0.10.0 <0.11.0` and Launcher `>=0.2.45`. |
| Accessibility Controls | 0.1.0-rc.1 prepared | Compatible with Psycheros `>=0.10.0 <0.11.0`; no launcher dependency. |

HTF Music Listener 0.2.0 passed Deno checks, seven plugin tests, the stock 0.10
validator, Windows helper builds, an exact-ZIP manager install, restart,
settings-page smoke, and update check.

Accessibility Controls 0.1.0-rc.1 passed Deno formatting and type checks, four
tests, JavaScript syntax validation, the stock 0.10 validator, release ZIP
inspection, and a live 0.10 manager preview with no compatibility warnings. It
replaces the historical font and voice-resize overlays with one plugin-owned
settings route and browser assets.

Both manifests record the community monorepo, a package path, and a dedicated
tag stream. Compatibility-safe updates for packages below a monorepo root
require [Psycheros PR #37](https://github.com/PsycherosAI/Psycheros/pull/37) or
a later release containing the same updater behavior.

## Independent projects that still work as-is

| Project | Compatibility conclusion |
| --- | --- |
| Thread Exporter 0.3.2 | Browser-only; no Psycheros 0.10 dependency or code change required. |
| Entity Core for Codex 0.2.2 | Status, identity, search, fetch, and memory recording work against the 0.10 data location. It is a Codex MCP/plugin package, not a Psycheros plugin. |
| Entity Core for ChatGPT 0.1.x | HTTPS/OAuth bridge with separate release and runtime requirements; not a Psycheros plugin-manager package. |

The public Codex package's bundled Entity Core snapshot must not be described
as Entity Core 0.6 merely because Psycheros itself is now 0.10.

## Retired 0.9.2 source packages

| Historical package | 0.10 disposition |
| --- | --- |
| Accessible Font Settings | Replaced by Accessibility Controls 0.1.0-rc.1. |
| Voice Text Resize | Replaced by Accessibility Controls 0.1.0-rc.1. |
| More Uploads + Voice Text Resize | Retired overlap; no combined replacement. |
| Everything Together | Retired all-in-one source overlay. |
| More Uploads | Requires chat-attachment lifecycle hooks not exposed by API v1; not relabeled as a plugin. |
| Expression Sprites Beta | Requires response-stream filtering and message-state persistence hooks not exposed by API v1; not relabeled as a plugin. |
| Screen Presence Alpha | Replaced core server, voice, browser, and prompt-assembly files; not relabeled as a plugin. |
| Windows Shell Fix | A host-shell implementation issue belongs in Psycheros core, not a competing shell-tool plugin; tracked upstream as [Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40). |
| Loom Gemini Parser Mod | Entity Loom has no corresponding plugin-manager extension point. |

See [historical/README.md](historical/README.md) for versioned source and release
links. These packages are absent from the current branch tip by design.

## Historical HTF releases

HTF 0.1.x packages remain distinct for the Psycheros 0.8/0.9 installations they
target. The 0.2.0 build does not emit a new legacy package and does not overwrite
those release assets.
