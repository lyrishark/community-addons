# Privacy

HTF Music Listener runs locally.

- The attached source file is read from Psycheros's local chat-attachments directory.
- FFmpeg creates a temporary normalized WAV inside the plugin's local state.
- The WAV is deleted immediately after a successful HTF analysis and is also removed if
  a run fails.
- HTF JSON and graph artifacts are retained locally for seven days by default so visible
  Entity views continue to work when a conversation is reopened.
- The plugin performs no analytics, telemetry, lyric lookup, transcription, or cloud
  upload.
- If FFmpeg is not already installed or configured, the Windows x64 build makes one
  outbound request to the pinned Gyan FFmpeg 8.1.1 GitHub release, verifies the archive
  against its hard-coded SHA-256 digest, extracts it into local plugin state, and
  deletes the downloaded archive. No music, lyrics, HTF data, identifiers, or usage
  analytics are included in that request.

Normal Psycheros model-provider behavior still applies to the compact textual sensory
handoff that the entity receives. The raw audio and generated graph files are not sent
to FFmpeg's distributor or to the model provider by this plugin.

Removing the plugin through Psycheros backs up its directory according to the plugin
manager's normal safety behavior. A person who needs immediate erasure should also
remove the corresponding plugin backup and original chat attachment.
