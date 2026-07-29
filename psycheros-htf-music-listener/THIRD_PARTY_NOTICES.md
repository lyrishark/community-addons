# Third-party notices

The source package does not commit third-party executables. Platform runtime archives on
the matching release include the packaged HTF worker, the Windows/Linux watcher where
applicable, and collected license notices. They do not redistribute FFmpeg or FFprobe.

## FFmpeg

FFmpeg is a separate project. When neither a configured nor locally installed runtime is
available, the plugin downloads Gyan's FFmpeg 8.1.1 Essentials archive directly from
Gyan's official GitHub release. The plugin pins and verifies this archive digest:

```text
6f58ce889f59c311410f7d2b18895b33c03456463486f3b1ebc93d97a0f54541
```

- Project: <https://ffmpeg.org/>
- Gyan build: <https://github.com/GyanD/codexffmpeg/releases/tag/8.1.1>
- Corresponding FFmpeg source commit:
  <https://github.com/FFmpeg/FFmpeg/commit/239f2c733d>

The downloaded build is GPLv3 software distributed by Gyan. Its own archive contains the
notices supplied by that distributor. HTF Music Listener invokes the separate CLI
executables and does not link FFmpeg into the addon or packaged HTF worker.

## Python scientific runtime

The packaged HTF worker is built from this addon's Python source and may bundle Python,
NumPy, SciPy, Matplotlib, SoundFile, and their transitive runtime components. Their
license files must be collected into the release's `third-party/` directory by the build
and reviewed before publication.

PyInstaller is used only as a build tool and is not required on end-user machines.

## Windows and Linux Now Playing helpers

The Windows and Linux runtime releases include `now-playing-watcher`, built from this
repository's Rust source. The Windows target uses the open-source
`windows`/`windows-core` family generated from Microsoft metadata. The Linux target uses
zbus and zvariant to query MPRIS over D-Bus. Both use Serde and serde_json. Exact
resolved versions are recorded in `watcher/Cargo.lock`; collected license files ship
inside each runtime archive.

- windows-rs: <https://github.com/microsoft/windows-rs>
- zbus: <https://github.com/dbus2/zbus>
- Serde: <https://github.com/serde-rs/serde>

The helpers call Windows Global System Media Transport Controls or Linux MPRIS. They
include no Spotify SDK and no network client.

## macOS Now Playing adapter

The macOS adapter is readable JavaScript for Automation source included in the addon. It
uses Apple's system-provided `osascript`, Foundation APIs, and application scripting
interfaces for Apple Music and Spotify. It includes no copied Apple or Spotify SDK.

## LRCLIB and LRCGET interoperability

The plugin optionally calls LRCLIB's public HTTP API for synchronized lyrics. No LRCLIB
or LRCGET source code is copied into this addon. LRCGET is the official LRCLIB client
and informed the compatible same-stem LRC workflow.

- LRCLIB: <https://lrclib.net/>
- LRCGET: <https://github.com/tranxuanthang/lrcget>
