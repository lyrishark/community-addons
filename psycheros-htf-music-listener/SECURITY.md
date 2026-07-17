# Security

HTF Music Listener is trusted local code. Installing it grants the same local process
permissions as Psycheros.

The plugin reduces its input surface in several ways:

- `listen_to_music` accepts only files inside Psycheros's `.psycheros/chat-attachments/`
  directory.
- Relative paths, traversal, and arbitrary filesystem paths are rejected.
- FFmpeg and the HTF worker are launched with argument arrays, not shell-built command
  strings.
- Automatic FFmpeg setup uses a pinned official Gyan release URL, rejects downloads over
  160 MB, and requires the exact published SHA-256 digest before extraction.
- Input is limited to 1 GB and two hours of decoded duration.
- Analysis is serialized to one song at a time.
- Artifact download routes validate both the run ID and a file allowlist stored in that
  run's manifest.
- Browser rendering creates DOM nodes with `textContent`; artifact URLs must remain
  inside the plugin's namespaced route.

Release checks:

1. Build the worker from pinned, reviewed sources.
2. Confirm the addon zip contains no redistributed FFmpeg executables.
3. Verify the SHA-256 digest of the exact release zip.
4. Test the zip through Psycheros's inspect-before-install flow.
5. Test verified FFmpeg bootstrap, malformed media, path traversal, oversized input,
   missing runtimes, and interrupted analysis.

Report security problems privately rather than in a public issue when disclosure would
expose a usable exploit.
