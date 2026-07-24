# Windows Shell Fix 0.3.0-rc.1

- Rebuilt as a Psycheros 0.10 API-v1 plugin.
- Installs through **Settings > Plugins** without replacing host source files.
- Overrides the stock shell tool registration with a platform-aware
  implementation.
- Uses PowerShell on Windows, falls back to cmd.exe only when PowerShell cannot
  spawn, and retains sh -c on macOS and Linux.
- Preserves timeouts, exit reporting, stdout/stderr capture, and basic secret
  redaction.

This is a release candidate for Psycheros 0.10.x.
