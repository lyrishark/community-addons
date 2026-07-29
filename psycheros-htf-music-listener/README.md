# HTF Music Listener

HTF Music Listener gives a Psycheros entity two related local music senses:

1. **One-off listening:** attach a song and ask the entity to listen. The addon
   privately converts it into an HTF v2 sensory object.
2. **Shared Now Playing:** choose an offline music collection and the addon aligns
   Windows, macOS, or Linux playback metadata with the matching local song's HTF
   timeline and verified synchronized lyrics.

Shared Now Playing does not stream or capture speaker audio. A media player supplies
only title, artist, album, playback state, duration, and position. Evidence about what
the music sounds like always comes from a human-owned local audio file.

## Quick setup

Install the addon through **Settings > Plugins**, restart Psycheros if requested, and
open **HTF Music Listener** in the plugin settings.

For one song, attach its file in chat and say something like “listen to this with me.”
Nothing else needs to be enabled.

For continuing shared listening:

1. Choose the folder containing the local music collection.
2. Enable **Maintain sensory library**.
3. Keep **Fetch synchronized lyrics** and **Build HTF in background** on if wanted.
4. Let the initial library scan run. It is resumable.
5. Enable **Share Now Playing** and save.

The addon creates its own private index and sensory data under
`<music collection>/.psycheros/`. It does not change or copy the songs. Confident LRCLIB
matches are written beside songs as same-stem `.lrc` files; ambiguous matches wait in
**Lyrics needing review**.

The default is deliberately quiet: **Share Now Playing is off**, while manual attachment
listening is available. Installing the addon never makes an entity react to whatever
happens to be playing.

## Player and platform support

- **Windows x64:** uses the system media-session surface. Spotify, browsers, and other
  players that publish Windows Now Playing metadata can work.
- **macOS, Apple Silicon and Intel:** supports Apple Music and Spotify. The first use
  may show the normal macOS Automation consent prompt; Psycheros needs permission to
  read playback metadata from the selected app.
- **Linux x64 and ARM64:** uses the desktop MPRIS session bus. Spotify, VLC, Firefox,
  Chromium, and other MPRIS-capable players can work. Headless sessions without a user
  D-Bus session cannot provide Now Playing state.

When several players are open, an actively playing source wins, then a paused source.
The previous source remains preferred on equal status to prevent rapid switching.

The platform-specific HTF worker and Windows/Linux watcher are downloaded from the
matching GitHub release on first need. The addon verifies the pinned byte size and
SHA-256 digest before extraction, verifies the extracted executables again, and stores
them in versioned addon state for reuse. A later addon release uses its own newly pinned
runtime. Python and Rust are not required on an end-user machine.

### FFmpeg

FFmpeg and FFprobe are required to inspect and normalize local music files.

- On Windows x64, missing FFmpeg is installed automatically from the pinned Gyan FFmpeg
  8.1.1 Essentials release after SHA-256 verification.
- On macOS, install it once with `brew install ffmpeg` (or configure existing FFmpeg and
  FFprobe executables).
- On Debian/Ubuntu Linux, use `sudo apt install ffmpeg`; use the equivalent `ffmpeg`
  package on other distributions.

The settings status names a missing dependency; manual listening and library work do not
silently pretend to succeed without it.

## What the entity receives

One-off listening is used only when the human explicitly asks the entity to listen to
music or identifies an attachment as music. It is not automatically invoked for voice
notes, calls, speech recordings, or arbitrary audio.

On a conversation turn during shared listening, the addon contributes a bounded
interval: the playback segment since the prior turn in that conversation, the current
HTF phase and salient events, compact signal evidence, and a few locally verified LRC
lines. There is no continuous model stream and no model wakeup for each media update.

If playback metadata cannot be safely matched to the offline collection, the entity
receives the title and clock but is explicitly told it has not heard that music. It must
not infer musical details from metadata alone.

The saved **Display entity view** toggle affects only the human-visible technical
attachment. The entity receives the same HTF evidence either way.

## Library behavior and lyrics

Music can be arranged however the human prefers. Embedded title, artist, album, and
duration tags are used first; `Artist - Title.ext` filenames and the parent folder are
conservative fallbacks. New and changed audio is noticed automatically.

The initial scan inventories files, checks same-stem `.lrc` files, optionally queries
LRCLIB with respectful pacing, queues ambiguous lyric candidates for review, and then
builds one HTF object at a time. Completed work is content-addressed beneath
`.psycheros/derived/`, so interrupted work resumes without restarting from zero.

HTF does not recover reliable sung words. Lyrics come only from a local LRC file or a
reviewed/high-confidence LRCLIB match. Disable **Fetch synchronized lyrics** to keep
lyric work entirely offline. When enabled, LRCLIB receives only title, artist, album,
and duration—not audio or local paths.

## Compatibility and installation

Version 0.3.0-rc.1 requires Psycheros 0.10.x and Launcher 0.2.45 or newer. The plugin
manager uses package path `psycheros-htf-music-listener` and the
`psycheros-htf-music-listener-v*` release stream for compatible one-click updates.

For a manual install, use the versioned addon zip from the current GitHub release and
install it through **Settings > Plugins**. Inspect-before-install shows the declared
tool, prompt hook, routes, settings page, and browser assets.

The 0.1.x packages remain on their historical GitHub tags for Psycheros 0.8/0.9 users.
Do not layer the old legacy HTF, More Uploads, or combined source-overlay packages over
Psycheros 0.10.

## Source development

Developers can use Deno 2, Python with NumPy/SciPy/Matplotlib/SoundFile, FFmpeg, and
Rust. The native watcher selects Windows Global System Media Transport Controls or Linux
MPRIS at compile time; macOS uses the readable JXA adapter.

```powershell
deno task check
deno task test
cargo test --manifest-path watcher/Cargo.toml
```

Build the platform-neutral manual-install zip with:

```powershell
.\scripts\Build-Release.ps1
```

Cross-platform runtime archives are built by `.github/workflows/htf-runtime-build.yml`.
See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before distribution.
