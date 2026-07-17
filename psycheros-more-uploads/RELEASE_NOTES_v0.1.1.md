# Psycheros More Uploads 0.1.1

This update adds the missing host-side half of music attachments for Psycheros 0.8.23.

## New

- MP3, MP4/MPEG audio, WAV, FLAC, M4A, AAC, AIFF, OGG, Opus, and WebM files
  are accepted in chat and Yin Yang typed voice.
- Audio is persisted as a distinct `USER_AUDIO` attachment and renders with native
  browser audio controls when chat history is reopened.
- Large files stream directly to a temporary file and are atomically finalized.
- The attachment ceiling is now 512 MB instead of 10 MB.
- Static asset cache keys are refreshed.

## HTF Music Listener

For stock Psycheros, install this package first and HTF Music Listener 0.1.2 legacy
second. The normal trusted-plugin build should use its built-in upload path instead of
installing this source-file mod.
