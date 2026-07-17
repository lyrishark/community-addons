# Third-party notices

The source package does not commit third-party executables. The Windows release includes
the packaged HTF worker and its collected license notices, but it does not redistribute
FFmpeg or FFprobe.

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
