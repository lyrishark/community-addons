# Changelog

## 0.2.0 - 2026-07-24

- Declare tested Psycheros 0.10.x and Launcher 0.2.45+ compatibility.
- Add a manager-native settings page plus a monorepo-aware, compatibility-safe GitHub
  update channel.
- Publish only the trusted plugin package for 0.10; retain older legacy packages under
  their historical releases without rebuilding them.

- Add a resumable, content-addressed sensory library beneath the selected music folder,
  with automatic discovery and change watching.
- Read embedded tags, use conservative filename fallbacks, and precompute HTF bundles
  serially after faster metadata and lyric preparation.
- Integrate LRCLIB cached search with respectful pacing, exact duration-aware matching,
  same-stem LRC export, and an in-Psycheros ambiguity review queue.
- Add a local Rust Windows Now Playing watcher using Global System Media Transport
  Controls; no media stream is captured or uploaded.
- Add a bounded prompt hook that aligns each conversation's unseen playback interval
  with HTF phase/events, compact signal evidence, and verified LRC lines.
- Keep shared listening off until a library path is chosen and the human enables it.
  Unmatched playback metadata is never presented as heard music.

## 0.1.3 - 2026-07-18

- Declare tested compatibility with the official Psycheros 0.9.x trusted-plugin host
  while retaining support for the Rae/Ember 0.8.23 plugin host.
- Confirm the plugin loads active and non-degraded under Psycheros 0.9.0 with one tool,
  four routes, one browser script, and one stylesheet.
- Keep the legacy source-patch package pinned to stock 0.8.23; Psycheros 0.9.x users
  should install the normal plugin package through Settings > Plugins.

## 0.1.2 - 2026-07-17

- Widen image-only Psycheros attachment pickers to common FFmpeg-decodable music formats
  so the listening action is self-contained on a stock host.
- Replace stock broken-image previews for audio attachments with a compact music-file
  chip.
- Apply the same upload-picker bridge to both the trusted-plugin and legacy packages.
- Document exact compatibility and install order for More Uploads, the voice-resize
  combo, and Everything Together.

## 0.1.1 - 2026-07-17

- Fall back to `Settings > Tools > Custom` when a trusted-plugin host loads the addon
  but does not expose an installed-plugin settings card.
- Add a separate Windows legacy package for upstream Psycheros builds that do not have
  the trusted plugin host yet. It installs the same listening organ through the existing
  Custom Tools system and adds a browser-local Entity view toggle under the Custom tab.
- Keep the normal trusted-plugin package and legacy compatibility package explicitly
  separate so users cannot mistake a source patch for a native plugin installation.

## 0.1.0 - 2026-07-17

- Add the explicit `listen_to_music` tool boundary.
- Convert common audio and video containers to a private normalized WAV.
- Generate HTF v2 JSON plus four preview graphs locally.
- Provide the entity a compact, time-evolving sensory handoff designed for a natural
  listening response.
- Add a persistent Display entity view toggle and one-turn override.
- Render durable JSON and graph links from tool-result metadata.
- Add seven-day local artifact retention and temporary-WAV cleanup.
- Add zero-configuration Windows packaging with a bundled HTF worker.
- Fetch FFmpeg 8.1.1 Essentials directly from Gyan when needed, with a pinned URL,
  strict size cap, SHA-256 verification, and local-only extraction.
