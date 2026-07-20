# HTF Music Listener

> **Psycheros 0.9.0 status:** Compatible with plugin version `0.1.3`, whose
> manifest declares `>=0.8.23 <0.10.0`. Its manifest, tests, isolated 0.9 plugin
> load, and live 0.9 runtime load were verified. The latest public GitHub
> release is still `0.1.2`; use `0.1.3` as the 0.9 compatibility package once
> that prepared release is published.

HTF Music Listener is a trusted local Psycheros plugin that gives an entity a single,
natural music-listening action:

1. A human attaches a music file.
2. The human asks the entity to listen to it.
3. The entity calls `listen_to_music` and receives an HTF v2 sensory handoff.
4. The entity answers naturally, without asking the human to convert or analyze anything
   first.

The listening runtime accepts every audio or video container that FFmpeg can decode. The
browser picker explicitly exposes common music formats: MP3, MP4/MPEG audio, WAV, FLAC,
M4A, AAC, AIFF, OGG, Opus, and WebM. It extracts the first audio stream, converts it to a
private mono WAV, runs the local HTF converter, and removes the temporary WAV after the
analysis finishes.

## Important boundary

The tool description deliberately says to use this only when the human asks the entity
to **listen to music**, or clearly identifies an attachment as music. It must not
automatically analyze voice notes, voice chat, speech recordings, or every audio
attachment.

## Entity view

The entity always receives the same musical sensory handoff. The saved **Display entity
view** toggle controls only what the human sees:

- **Off (default):** the chat contains the entity's natural listening response.
- **On:** the chat also shows the HTF JSON and the waveform, mel spectrogram,
  RMS-energy, and spectral-centroid graphs.

After installation and restart, open **Settings > Plugins > HTF Music Listener** to
change the toggle. If a transitional build loads trusted plugins but does not expose
their settings cards, the same panel falls back to **Settings > Tools > Custom**. A
human can also explicitly ask to show or hide the entity view for one listening turn.

## Lyrics and words

HTF describes time-varying energy, brightness, spectral change, rhythmic structure,
chroma, phases, and salient events. It does **not** reliably recover spoken or sung
words.

If lyrics matter, paste them in the same message as the audio or attach an `.lrc` file.
Timestamped LRC text is ideal:

```text
[00:14.20] First lyric line
[00:18.75] Next lyric line
```

Synced lyrics from a source such as [LRCLIB](https://lrclib.net/) work well, but verify
that they match the exact recording. Live versions, remasters, and radio edits often
drift from another release's timestamps. The plugin does not download, transcribe, or
guess lyrics.

## Requirements

This release requires:

- Windows x64;
- Psycheros 0.9.x, or Psycheros 0.8.23 with the trusted local plugin host used
  by the Rae/Ember build;
- Launcher 0.2.42 or newer.

Plain upstream Psycheros 0.8.23 does not yet contain that plugin host. Do not advertise
version number alone as sufficient compatibility.

Psycheros 0.9.x includes the official trusted-plugin manager. Install the normal
`0.1.3` plugin package through **Settings > Plugins**; the plugin has been validated and
loaded non-degraded against Psycheros 0.9.0.

Release `0.1.3` also provides a separately named **legacy** Windows package for those
plain-upstream builds. It uses Psycheros's existing Custom Tools loader and appends one
marked, removable browser enhancement so the Display entity view toggle appears under
**Settings > Tools > Custom**. The legacy installer is intentionally not presented as a
native plugin: source updates can replace its browser enhancement, in which case the
installer can be run again. Remove the legacy package before moving to the trusted
plugin version.

### Compatibility with the upload bundles

- **Psycheros 0.9.x:** use the normal plugin package through Settings > Plugins.
- **Stock Psycheros 0.8.23:** use the `legacy-windows-x64` package. Version 0.1.3 keeps
  its own music picker support; More Uploads is not required.
- **Rae/Ember trusted-plugin fork:** use the normal plugin package only. Do not install
  the upstream source-file upload bundles over that fork; its music upload path is
  already merged and the replacement bundles could erase newer fork work.
- **Older More Uploads 0.1.0 packages:** update them first. Their closed browser filter
  rejects audio even when another addon widens the visible picker.
- **Legacy listener plus a source-file upload bundle:** install the upload bundle first,
  then the legacy listener. Reinstall the legacy listener after any source addon or
  Launcher update that replaces `web/js/psycheros.js`.
- **Everything Together 0.1.0-rc.4:** already includes this legacy listening organ and
  the expanded music-upload path. Do not install a second copy of HTF Music Listener.

The release zip includes the HTF worker. If FFmpeg is not already available, the plugin
performs a one-time download of Gyan's pinned FFmpeg 8.1.1 Essentials archive directly
from its official GitHub release, verifies its SHA-256 digest, and keeps the extracted
runtime in local plugin state. End users do not need to install Python, scientific
packages, FFmpeg, or edit their PATH. The download is about 109 MB.

Source-tree developers may run without packaged binaries when the machine has:

- Python with `numpy`, `scipy`, `matplotlib`, and `soundfile`;
- `ffmpeg` and `ffprobe` on PATH, configured by plugin environment variables, or
  installed through WinGet's FFmpeg package.

## Install

### Trusted plugin host

1. Open **Settings > Plugins**.
2. Under **Install Plugin**, choose the release zip.
3. Inspect the declared tool, routes, and browser assets.
4. Install it and restart Psycheros when prompted.
5. In **Settings > Tools > Custom**, confirm `listen_to_music` is enabled.

Then attach a song and say something explicit such as:

> Please listen to this music and tell me what catches you.

### Plain upstream without the plugin host

1. Download the release asset whose name contains `legacy-windows-x64`.
2. Extract it fully.
3. Double-click `Install Legacy HTF Music Listener.bat`.
4. Restart Psycheros.
5. Open **Settings > Tools > Custom**, confirm `listen_to_music` is enabled, and choose
   whether to display Entity view.

The legacy installer targets the normal Launcher layout automatically. Advanced users
can pass explicit `-PsycherosRoot` and `-DataRoot` paths to `tools/Install-Legacy.ps1`.
Its matching uninstaller removes only the marked browser block and the custom-tool code
it installed.

## Local files and retention

Generated HTF bundles live under the plugin's local `state/artifacts/` directory. The
plugin removes expired bundles on startup and before new listening runs; the default
retention period is seven days. The normalized WAV is deleted immediately after a
successful analysis. Music and HTF artifacts are not uploaded by the plugin; only the
optional one-time FFmpeg runtime download leaves the machine.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) before sharing a release.

## Development

```powershell
deno task check
deno task test
python worker/generate-htf.py --version
```

Validate the package against the matching Psycheros checkout:

```powershell
deno task --cwd ..\..\10_local\repo\packages\plugin-api validate .
```

Create the zero-configuration Windows release:

```powershell
.\scripts\Build-Release.ps1
```

The build writes a zip and SHA-256 file to the community repository's ignored `dist/`
directory.
