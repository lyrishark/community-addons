# Psycheros Windows Shell Fix v0.1.0

Initial community-alpha release for Psycheros 0.8.9.

- selects a host-appropriate command shell
- uses PowerShell with a `cmd.exe` spawn fallback on Windows
- preserves `sh -c` on macOS and Linux
- preserves timeouts and non-zero exit reporting
- includes focused Windows runtime tests
