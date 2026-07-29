# HTF Music Listener 0.3.0-rc.1

This release candidate brings shared Now Playing to macOS and Linux while preserving the
existing Windows path and the deliberately opt-in listening boundary.

## What is new

- Apple Music and Spotify playback clocks on Intel and Apple-Silicon macOS.
- MPRIS playback clocks on x64 and ARM64 Linux desktops, including Spotify, VLC, and
  compatible browsers and players.
- A common watcher protocol with stale-snapshot rejection and stable multi-player
  selection.
- Native HTF workers for all five release platforms. Windows and Linux also receive a
  native watcher; macOS keeps its application adapter as readable JXA source.
- Verified first-use runtime installation from the matching GitHub release. Each
  download is pinned by exact size and SHA-256, its extracted executables are checked
  again. A completed runtime is reused until the addon release changes.

## Defaults and consent

Fresh installs keep **Share Now Playing off**. Manual attachment listening remains
available without enabling the library or playback sensing. LRCLIB remains optional and
can be disabled independently.

macOS may request Automation permission the first time the watcher reads Apple Music or
Spotify. It does not launch stopped players. Windows and Linux helpers have no network
client and none of the watchers capture media audio, microphones, or speakers.

## Installation notes

Psycheros 0.10.x and Launcher 0.2.45+ are required. Install or update through **Settings

> Plugins** using the normal `psycheros-htf-music-listener-v*` channel.

The addon runtime needs no end-user Python or Rust installation. FFmpeg and FFprobe are
still separate prerequisites: Windows x64 can install the pinned Gyan build
automatically; macOS users can run `brew install ffmpeg`; Linux users can install their
distribution's `ffmpeg` package.

This is an RC because real-player permission and desktop-session behavior still deserves
field testing across different macOS and Linux installations. One-off listening, the
library, lyrics workflow, and Windows shared listening remain covered by the existing
regression suite.
