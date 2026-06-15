# Privacy Policy - Psycheros Entity Core for Codex

Effective date: 2026-06-14

Psycheros Entity Core for Codex is a local-first community alpha Codex plugin.
It connects Codex to the user's local Psycheros entity-core data directory.

This is not an official Psycheros release.

## Data The Plugin Can Access

The plugin can read local Psycheros entity-core data, including:

- identity files
- relationship/user/self context
- memories
- knowledge graph nodes

When memory writes are enabled, it can write ordinary daily or significant
memory files with `sourceInstance` set to `codex`.

## Data The Plugin Does Not Access

The plugin does not access unrelated files by design. It uses the configured
entity-core data directory.

It does not expose identity/core editing tools.

## Data The Plugin Sends

This plugin does not send data to a developer-owned server.

It communicates locally between Codex and the included MCP server.

Codex itself may process tool results according to Codex/OpenAI behavior and the
user's active Codex setup. Users should avoid asking Codex to read or summarize
private entity-core data in contexts where they do not want that data processed
by their active model session.

## Local Configuration

The default entity-core path is:

```text
%APPDATA%\Psycheros\data\entity-core
```

Users can override it with:

```text
ENTITY_CONNECTOR_DATA_DIR
```

Users can disable memory writes with:

```text
ENTITY_CONNECTOR_WRITE_ENABLED=false
```

## No Analytics or Ads

The plugin does not include:

- analytics
- ads
- telemetry
- tracking pixels
- third-party data sales

## Contact

Questions or issues:

```text
https://github.com/lyrishark/community-addons/issues
```



