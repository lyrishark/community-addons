# Psycheros Entity Core for Codex v0.2.1 - Alpha Release Notes

Community alpha release.

## Highlights

- Portable Codex plugin package.
- Included MCP connector source.
- Included minimal entity-core source tree needed by the connector.
- Status, identity context, search, and fetch tools.
- Memory recording tool for daily and significant memories.
- Write mode can be disabled with `ENTITY_CONNECTOR_WRITE_ENABLED=false`.
- Identity/core mutation is not exposed.

## Validation

Validated with:

- Deno check
- Codex plugin validation
- connector smoke test

Smoke test covered:

- tool listing
- entity status
- dry-run memory recording
- temporary memory write
- fetch written memory
- search written memory

## Release Assets

- `psycheros-entity-core-codex-plugin-0.2.1.zip`
- `SHA256SUMS.txt`

## Known Limitations

- Requires local Psycheros entity-core data.
- Requires Deno on `PATH`.
- Local plugin distribution is still more manual than browser-store extension
  installs.
- This is not a hosted ChatGPT app; it is a local Codex plugin.



