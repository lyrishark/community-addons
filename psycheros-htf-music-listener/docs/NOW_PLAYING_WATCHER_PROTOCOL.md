# Now Playing watcher protocol

HTF Music Listener keeps operating-system media detection outside the listener core. A
platform watcher writes one UTF-8 JSON object per line to standard output. Standard
error is diagnostic-only and must never contain playback metadata that the listener
needs.

## Snapshot schema

Every line is one complete snapshot:

```json
{
  "capturedAtMs": 1700000000000,
  "sourceAppId": "org.mpris.MediaPlayer2.spotify",
  "title": "Signal Fire",
  "artist": "Fixture Artist",
  "album": "Fixture Album",
  "positionMs": 42500,
  "durationMs": 240000,
  "playbackStatus": "playing"
}
```

Required fields:

- `capturedAtMs`: nonnegative finite Unix time in milliseconds, captured as close as
  practical to the position sample.
- `playbackStatus`: one of `playing`, `paused`, `stopped`, `changing`, `closed`,
  `opened`, or `unknown`.

Optional fields:

- `sourceAppId`: stable player or media-session identifier when available.
- `title`, `artist`, `album`: trimmed metadata strings.
- `positionMs`, `durationMs`: nonnegative finite milliseconds.

Unknown fields are ignored for forward compatibility. A watcher must omit an unknown
optional value rather than inventing it. The listener rejects malformed required fields,
invalid statuses, negative time values, and wrong optional types.

## State behavior

- Emit a current snapshot promptly at startup.
- Emit when the active track, playback state, metadata, or seek position changes.
- Refresh a playing snapshot often enough that the listener never exceeds its 15-second
  stale-data boundary. The Windows watcher uses 750 milliseconds.
- Use `closed` when no usable media session exists. This is ordinary state, not an
  error.
- Multiple-player arbitration belongs to the platform watcher. Prefer a playing session
  over paused sessions and keep the selection stable when candidates are otherwise
  equivalent.
- Watchers expose metadata and timing only. They do not capture or upload audio.

The fixtures under `tests/fixtures/now-playing/` are the executable examples for
accepted, rejected, and stale snapshots.

## Platform implementations

- Windows uses Global System Media Transport Controls.
- Linux uses the standard MPRIS player interface on the session D-Bus.
- macOS uses explicit JavaScript for Automation adapters because Apple does not publish
  a system-wide observer equivalent to GSMTC or MPRIS. The initial adapters cover Music
  and Spotify, only query applications already running, and may trigger macOS's one-time
  Automation permission prompt.
