# Psycheros Entity Core for Codex v0.4.0

## Psycheros 0.11 reconciliation

- Updated the bundled Entity Core source from `0.3.5` to upstream `0.6.1`.
- Added the upstream plugin API v2 package required by Entity Core's local
  plugin harness; plugin API v1 manifests remain accepted.
- Preserved the connector's deliberately bounded surface: status, identity and
  memory reads, graph search/fetch, and governed daily/significant memory
  writes. Direct identity mutation remains unavailable.
- Retained native Entity Core discovery on Windows, macOS, and Linux.
- Re-ran formatting, type checks, platform tests, connector smoke tests, and
  Codex plugin validation against the packaged source.

No personal Entity Core data or Psycheros settings are included in the release.
