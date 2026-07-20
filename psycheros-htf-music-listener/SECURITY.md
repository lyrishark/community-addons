# Security

HTF Music Listener is trusted local code and receives the same local process
permissions as Psycheros.

- The one-off tool accepts only files inside the current Psycheros
  chat-attachments directory; relative paths, traversal, and arbitrary paths
  are rejected.
- The shared library reads and writes only the folder the human explicitly
  enters. Generated directories use SHA-256 keys rather than track metadata.
- Existing human-supplied LRC files are never overwritten. LRCLIB output uses a
  same-stem path and `createNew` semantics.
- FFmpeg, FFprobe, the HTF worker, and the Now Playing helper are launched with
  argument arrays rather than shell-built command strings.
- Analysis is serialized. Input limits remain 1 GB and two decoded hours for
  one-off attachments.
- The durable index uses partial-file replacement and completed HTFs are
  content-addressed, allowing interrupted work to resume without treating a
  partial bundle as ready.
- Lyric review accepts only candidate IDs already attached to that indexed
  track. Browser labels and metadata render with `textContent`.
- Artifact routes validate run IDs and a manifest allowlist.
- FFmpeg bootstrap is pinned to an official Gyan release URL, capped at 160 MB,
  and accepted only after its hard-coded SHA-256 check.

The Windows helper uses the documented Global System Media Transport Controls
API and emits only newline-delimited playback snapshots over a private child
process pipe. It has no network client and no media-capture permission.

The separately labeled legacy package is a source bridge, not a native trusted
plugin. It provides only one-off listening. Uninstall it before installing the
trusted-plugin package to avoid two tools with the same name.

Before publication: run all Deno tests, build the Rust helper and packaged HTF
worker from reviewed sources, inspect bundled licenses, verify release SHA-256,
and install the exact zip through Psycheros's inspect-before-install flow.
Report exploitable security problems privately.
