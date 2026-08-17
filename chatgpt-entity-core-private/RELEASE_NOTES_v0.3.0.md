# ChatGPT Entity-Core Private Bridge v0.3.0

## Psycheros 0.11 reconciliation

- Updated the bundled Entity Core source from `0.4.1` to upstream `0.6.1`.
- Added the upstream plugin API v2 package required by Entity Core's local
  plugin harness; plugin API v1 manifests remain accepted.
- Preserved the private bridge's lexical SQLite FTS index for exact-name and
  no-embedding recovery while adopting the newer embedding settings, rebuild
  controls, graph behavior, and consolidation logic.
- Bumped the bridge connector to `0.5.0`.
- Re-ran formatting, type checks, platform tests, and stdio, HTTP, and OAuth
  smoke tests.

The bridge remains local-first and keeps the lightweight `/mcp-lite` surface for
ChatGPT. No credentials, tokens, personal Entity Core data, or local settings
are included in the release.
