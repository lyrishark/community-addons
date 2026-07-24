# Loom Gemini Parser 0.3.0-rc.1

- Rebased the self-contained Gemini parser and wizard registration onto stock
  Psycheros 0.10.0.
- Added normalized SHA-256 preflight checks for every replaced stock file.
- Refuses mismatched versions and unknown local edits before writing anything.
- Creates timestamped backups and an installation marker.
- Passed Deno formatting, type checking, and the focused Gemini parser test on
  a clean stock 0.10.0 worktree.

This remains a source bridge because Psycheros plugin API v1 cannot register
Entity Loom parsers.
