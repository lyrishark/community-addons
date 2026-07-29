# Security

HTF Music Listener is trusted local code and receives the same local process permissions
as Psycheros.

- The one-off tool accepts only files inside the current Psycheros chat-attachments
  directory; relative paths, traversal, and arbitrary paths are rejected.
- The shared library reads and writes only the folder the human explicitly enters.
  Generated directories use SHA-256 keys rather than track metadata.
- Existing human-supplied LRC files are never overwritten. LRCLIB output uses a
  same-stem path and `createNew` semantics.
- FFmpeg, FFprobe, the HTF worker, and the Now Playing helper are launched with argument
  arrays rather than shell-built command strings.
- Analysis is serialized. Input limits remain 1 GB and two decoded hours for one-off
  attachments.
- The durable index uses partial-file replacement and completed HTFs are
  content-addressed, allowing interrupted work to resume without treating a partial
  bundle as ready.
- Lyric review accepts only candidate IDs already attached to that indexed track.
  Browser labels and metadata render with `textContent`.
- Artifact routes validate run IDs and a manifest allowlist.
- FFmpeg bootstrap is pinned to an official Gyan release URL, capped at 160 MB, and
  accepted only after its hard-coded SHA-256 check.
- Platform runtime downloads are accepted only from this repository's GitHub release
  namespace, capped at 256 MB, pinned by exact size and SHA-256, and checked again
  against per-executable hashes after extraction. Installation uses a private staging
  directory and an atomic rename into addon state.

The watchers emit only normalized newline-delimited playback snapshots over a private
child-process pipe. The Windows and Linux helpers have no network client or
media-capture permission. The macOS JXA source is shipped readably and queries only
Apple Music or Spotify after confirming that the app is already running.

The separately labeled legacy package is a source bridge, not a native trusted plugin.
It provides only one-off listening. Uninstall it before installing the trusted-plugin
package to avoid two tools with the same name.

Before publication: run Deno tests on Windows, Linux, and macOS; build and test native
watchers on their target systems; execute the JXA self-test with `osascript`; inspect
collected licenses; verify release SHA-256 values; and install the exact zip through
Psycheros's inspect-before-install flow. Report exploitable security problems privately.
