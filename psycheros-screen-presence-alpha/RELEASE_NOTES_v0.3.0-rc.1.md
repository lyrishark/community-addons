# Screen Presence Alpha 0.3.0-rc.1

- Rebased the complete chat, voice, visual-context, and freshness-barrier flow
  onto stock Psycheros 0.10.0.
- Preserved 0.10's composer draft-saving behavior during the UI merge.
- Removed the unrelated provider-balance error overlay from the add-on.
- Added exact-version and normalized-hash preflight guards with timestamped
  backups and safe reinstall support.
- Verified 5 focused tests, Deno formatting/type checks, and JavaScript syntax.

This remains a source bridge because API v1 does not expose all required host
hooks. It is not installable through the 0.10 plugin manager.
