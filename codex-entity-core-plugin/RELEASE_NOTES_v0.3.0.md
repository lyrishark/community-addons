# Psycheros Entity Core for Codex v0.3.0

## Cross-platform release

- Added native default data-directory discovery for Windows, macOS, and Linux.
- Linux respects `XDG_DATA_HOME` and otherwise uses `~/.local/share`.
- macOS uses `~/Library/Application Support/Psycheros`.
- Added deterministic platform-path tests.
- The release archive no longer assumes a packaged Windows `vec0.dll` is the
  only usable native extension. The connector's existing sqlite-vec loader
  downloads the matching macOS, Linux, or Windows asset on first use.
- Updated install, privacy, and connector documentation with all supported
  paths.

No hosted service was added. The connector still reads local Psycheros data and
does not expose direct identity-file mutation.
