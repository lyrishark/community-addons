# More Uploads 0.3.0-rc.1

- Rebased the multi-image, document, audio, and typed-voice attachment flow
  onto stock Psycheros 0.10.0.
- Preserved stock 0.10 behavior while resolving the only port conflict in the
  draft-aware main composer.
- Added normalized SHA-256 preflight checks for every replaced stock file.
- Refuses mismatched versions and unknown local edits before writing.
- Creates timestamped backups and installation markers.
- Passed Deno formatting and type checks, six focused tests, and JavaScript
  syntax checks on a clean stock 0.10.0 worktree.

This remains a source bridge because plugin API v1 cannot contribute
multimodal attachment content, persistence, and message rendering.
