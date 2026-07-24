# Privacy

HTF Music Listener is local-first and does not contain analytics or telemetry.

## One-off attachments

- The source is read from Psycheros's local chat-attachments directory.
- FFmpeg creates a temporary normalized WAV inside plugin state and deletes it after
  success or failure.
- HTF JSON and graphs remain in local plugin artifacts for seven days by default so
  reopened Entity views keep working.

## Shared library and playback

- The plugin reads audio tags and audio bytes only from the folder explicitly selected
  in settings.
- The durable index and HTF bundles are stored under that library's private
  `.psycheros/` directory. They are not uploaded by the plugin.
- Windows Global System Media Transport Controls supplies local title, artist, album,
  play/pause state, duration, and position. The helper does not capture the media
  stream, microphone, or speaker output.
- Psycheros receives a bounded textual HTF/LRC interval on conversation turns. Normal
  model-provider handling applies to that text, just like other prompt context; raw
  audio and graph files are not sent by this plugin.

## Optional network requests

- With **Fetch synchronized lyrics** enabled, the plugin sends track title, artist,
  album, and duration to `lrclib.net`. It sends no audio, local path, Psycheros
  conversation, account identifier, or analytics. Confident matches become same-stem
  `.lrc` files; ambiguous metadata stays in the private index until reviewed.
- If FFmpeg is missing, one request downloads the pinned Gyan FFmpeg archive from
  GitHub. Its exact SHA-256 digest is verified before use. No music or usage data is
  included.

Disabling the library stops new scans and playback sensing but preserves work already
completed. To erase it immediately, remove the library's `.psycheros/` directory and any
generated same-stem `.lrc` files the human no longer wants. Removing the plugin follows
Psycheros's normal backup behavior, so plugin-state backups may also need to be removed
for immediate erasure.
