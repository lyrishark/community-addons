# Compatibility snapshot

Checked 2026-07-24 against stock `psycheros-v0.10.0`, Entity Core 0.6.0, and
the Psycheros plugin API v1 validator.

## Current manager-native plugins

| Package | Version | Psycheros status |
| --- | --- | --- |
| HTF Music Listener | [0.2.0 public](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.2.0) | Compatible with Psycheros `>=0.10.0 <0.11.0` and Launcher `>=0.2.45`. |
| Accessibility Controls | [0.1.0-rc.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-accessibility-controls-v0.1.0-rc.1) | Compatible with Psycheros `>=0.10.0 <0.11.0`; no launcher dependency. |
| Windows Shell Fix | 0.3.0-rc.1 staged | Compatible with Psycheros `>=0.10.0 <0.11.0`; loads one replacement tool through API v1. |

HTF Music Listener 0.2.0 passed Deno checks, seven plugin tests, the stock 0.10
validator, Windows helper builds, an exact-ZIP manager install, restart,
settings-page smoke, and update check.

Accessibility Controls 0.1.0-rc.1 passed Deno formatting and type checks, four
tests, JavaScript syntax validation, the stock 0.10 validator, release ZIP
inspection, and a live 0.10 manager preview with no compatibility warnings. It
replaces the historical font and voice-resize overlays with one plugin-owned
settings route and browser assets.

Windows Shell Fix 0.3.0-rc.1 passed Deno formatting and type checks, five tests,
exact-ZIP manager inspection and installation with no warnings, manager load
with one active tool and no degradation, and a real command through that loaded
tool on Windows.

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

## Source-package 0.10 port status

The old 0.9.2 payloads remain historical and are not compatible with 0.10.
That does not retire the features: the addon directories are retained as the
starting point for new, version-guarded ports.

| Package | 0.10 disposition |
| --- | --- |
| Accessible Font Settings | Replaced by Accessibility Controls 0.1.0-rc.1. |
| Voice Text Resize | Replaced by Accessibility Controls 0.1.0-rc.1. |
| More Uploads | A guarded 0.10 source bridge is feasible now. Exact manager-native parity needs attachment lifecycle, multimodal-turn, and message-rendering hooks beyond API v1. |
| Expression Sprites Beta | A guarded 0.10 source bridge is feasible now. Exact manager-native parity needs streamed-response filtering and final-message metadata persistence hooks beyond API v1. |
| Screen Presence Alpha | A guarded 0.10 source bridge is feasible now. Exact manager-native parity needs a pre-turn barrier, host vision access, and voice-turn context hooks beyond API v1. |
| Windows Shell Fix | Rebuilt as the staged API-v1 plugin above; its `shell` tool overrides the stock registration on Windows. The underlying core issue is also tracked as [Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40). |
| Loom Gemini Parser Mod | A guarded Entity Loom source bridge is feasible now. Psycheros API v1 cannot register Entity Loom parsers, so a native package needs Loom parser discovery or an upstream merge. |
| More Uploads + Voice Text Resize | Rebuild as a suite combining the 0.10 More Uploads port with Accessibility Controls, without duplicating its accessibility implementation. |
| Everything Together | Rebuild after the component ports; plugin-manager dependencies are declared but not installed automatically in 0.10, so a one-click manager meta-plugin is not yet equivalent. |

See [historical/README.md](historical/README.md) for versioned source and release
links. Do not install a working directory over 0.10 until its new README,
version guard, tests, and release asset explicitly name 0.10.

## Historical HTF releases

HTF 0.1.x packages remain distinct for the Psycheros 0.8/0.9 installations they
target. The 0.2.0 build does not emit a new legacy package and does not overwrite
those release assets.
