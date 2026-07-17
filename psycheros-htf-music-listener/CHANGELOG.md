# Changelog

## 0.1.2 - 2026-07-17

- Widen image-only Psycheros attachment pickers to common FFmpeg-decodable music
  formats so the listening action is self-contained on a stock host.
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
