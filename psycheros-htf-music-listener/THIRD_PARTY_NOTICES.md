# Third-party notices

The source package does not commit third-party executables. The Windows release builder
assembles reviewed runtime components into the test zip.

## FFmpeg

FFmpeg is a separate project. Release packages must include the exact license,
configuration/build information, and corresponding-source information for the binary
they distribute.

- Project: <https://ffmpeg.org/>
- Source: <https://ffmpeg.org/download.html#get-sources>

## Python scientific runtime

The packaged HTF worker is built from this addon's Python source and may bundle Python,
NumPy, SciPy, Matplotlib, SoundFile, and their transitive runtime components. Their
license files must be collected into the release's `third-party/` directory by the build
and reviewed before publication.

PyInstaller is used only as a build tool and is not required on end-user machines.
