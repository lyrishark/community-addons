# HTF Music Listener

HTF Music Listener gives a Psycheros entity two related local music senses:

1. **One-off listening:** attach a song, ask the entity to listen, and the
   `listen_to_music` tool converts it to an HTF v2 sensory object.
2. **Shared Now Playing:** point the plugin at an offline music library and it follows
   the Windows media clock, aligning the current song, playback position, HTF timeline,
   and verified synchronized lyrics on each conversation turn.

The second path is not audio streaming. Spotify, a browser, or another media app
supplies only local Now Playing metadata and timing. Musical evidence always comes from
the human-owned audio file and its locally generated HTF bundle.

## One-off listening boundary

The entity uses `listen_to_music` only when the human explicitly asks it to **listen to
music** or identifies an attachment as music. It must not automatically analyze voice
notes, voice chat, speech recordings, or every audio attachment.

Common MP3, MP4/MPEG audio, WAV, FLAC, M4A, AAC, AIFF, OGG, Opus, and WebM files appear
in the Psycheros picker. FFmpeg extracts the first audio stream, a private temporary
mono WAV feeds the HTF worker, and that WAV is deleted afterward.

The saved **Display entity view** toggle affects only what the human sees. The entity
always receives the same HTF evidence; the visible view additionally shows the JSON and
waveform, mel-spectrogram, RMS-energy, and spectral-centroid graphs.

## Shared Now Playing

Open **Settings > Plugins > HTF Music Listener** (or the **Tools > Custom** fallback
panel on transitional trusted-plugin builds), then:

1. Enter the folder containing the offline music collection.
2. Enable **Maintain sensory library**.
3. Leave synchronized lyrics and HTF precomputation on if desired.
4. Enable **Share Now Playing**.
5. Save.

The library may be arranged however the human prefers. Artist folders without album
folders are fine. Embedded title, artist, album, and duration tags are used first;
`Artist - Title.ext` filenames and the parent folder provide safe fallbacks.

The initial run is resumable and intentionally staged:

- inventory files and read tags;
- check existing same-stem `.lrc` files;
- query LRCLIB's cached database with respectful pacing;
- auto-save only high-confidence synchronized matches;
- list ambiguous matches in **Lyrics needing review**;
- build one HTF sensory object at a time after lyric review data is available.

Completed work is indexed under `<music library>/.psycheros/`. Generated HTF bundles
live in `.psycheros/derived/<audio-content-hash>/`; confident LRCLIB matches are written
beside the song as same-stem `.lrc` files. New audio is noticed automatically; a later
hand-supplied LRC is picked up at startup or with **Scan now**. Nothing requires a
static manifest as the collection grows.

On an actual conversation turn, the plugin contributes only a bounded interval: the
playback segment since the prior turn in that conversation, the current HTF phase and
salient events, compact signal evidence, and a few locally verified LRC lines. There is
no low-latency model stream and no wakeup per media frame.

If Windows reports a song that is not safely matched to the offline collection, the
entity receives the title and clock but is explicitly told it has not heard that music.
A currently playing song is prioritized if its HTF bundle is still waiting in the
background queue.

## Lyrics and words

HTF does not recover reliable spoken or sung words. Shared listening uses only an
existing local LRC or a reviewed/high-confidence LRCLIB match. Live versions, remasters,
rerecordings, and radio edits often need review because their timing can differ even
when the title is identical.

LRCLIB integration is optional. It uses the service's public API without an API key and
sends only title, artist, album, and duration—not audio. Disable **Fetch synchronized
lyrics** to keep lyric work entirely offline.

For one-off attachments, include timestamped LRC text when words matter:

```text
[00:14.20] First lyric line
[00:18.75] Next lyric line
```

## Requirements and compatibility

The trusted-plugin package requires:

- Windows x64 for shared Now Playing;
- Psycheros 0.10.x;
- Launcher 0.2.45 or newer.

Version 0.2.0 is not a source overlay. Do not install the old More Uploads, Everything
Together, or legacy HTF packages over Psycheros 0.10.

## Runtime and installation

The Windows release includes the HTF worker and the small local Now Playing watcher. If
FFmpeg is unavailable, the plugin downloads Gyan's pinned FFmpeg 8.1.1 Essentials
archive once, verifies its SHA-256 digest, and stores the extracted runtime locally. End
users do not need Python or PATH edits.

Install the release zip through **Settings > Plugins**, inspect the declared tool,
prompt hook, routes, settings page, and browser assets, then restart Psycheros. Open
**Settings > Plugins > HTF Music Listener** to configure the library and confirm
`listen_to_music` is enabled under **Settings > Tools > Custom**.

Builds containing the compatibility-safe updater can instead inspect the community
repository with package path `psycheros-htf-music-listener`. Once 0.2.0 is installed,
its manifest records that same repository, package path, and
`psycheros-htf-music-listener-v*` tag stream so later compatible releases appear as
one-click updates.

## Historical packages

The 0.1.x trusted and legacy packages remain on their original GitHub tags for Psycheros
0.8/0.9 users. They are intentionally distinct from this 0.10 release and are no longer
built from current source.

Source-tree developers can use Python with NumPy, SciPy, Matplotlib, and SoundFile plus
FFmpeg/FFprobe on PATH. The Windows watcher is built with Rust:

```powershell
deno task check
deno task test
cargo build --manifest-path watcher/Cargo.toml --release
```

Build the manager-native Windows package with:

```powershell
.\scripts\Build-Release.ps1
```

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before distribution.
