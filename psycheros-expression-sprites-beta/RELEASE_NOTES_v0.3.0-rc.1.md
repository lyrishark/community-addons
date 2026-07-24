# Expression Sprites Beta 0.3.0-rc.1

- Rebased the complete expression, persistence, settings, chat, and voice
  integration onto stock Psycheros 0.10.0.
- Replaced personalized lexical rules with a generic public classifier.
- Removed bundled character art; fresh installations begin with empty sprite
  slots and accept user-supplied images.
- Added exact-version and normalized-hash preflight checks with timestamped
  backups and safe reinstallation.
- Verified 31 focused tests, Deno formatting/type checks, and JavaScript syntax
  on the 0.10.0 port.

This remains a source bridge because API v1 does not expose all required host
hooks. It is not installable through the 0.10 plugin manager.
