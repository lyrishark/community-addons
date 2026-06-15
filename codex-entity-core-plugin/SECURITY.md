# Security Notes - Psycheros Entity Core for Codex

Psycheros Entity Core for Codex is a local MCP plugin. It can expose sensitive
identity and memory data to a Codex thread when the user invokes it.

This is not an official Psycheros release.

## Security Model

- Local MCP server only.
- Reads the configured local entity-core directory.
- Can write ordinary memories if write mode is enabled.
- Does not expose direct identity/core mutation.
- Does not expose memory deletion.
- Does not use a hosted service.

## Main Risk

Entity-core contains private identity, relationship, and memory data. If you ask
Codex to read it, that content may become part of the active model context.

Only enable the plugin in Codex sessions where that is acceptable to you.

## Recommended User Safety

- Install only from the public source repository or release page.
- Review `.mcp.json` before enabling.
- Confirm `ENTITY_CONNECTOR_DATA_DIR` points at your own Psycheros data.
- Set `ENTITY_CONNECTOR_WRITE_ENABLED=false` if you want read-only behavior.
- Do not share your entity-core directory or plugin config if it contains local
  private paths you do not want public.

## Reporting Security Issues

Please do not post security-sensitive reports publicly.

Report privately through:

```text
https://github.com/lyrishark/community-addons/issues
```



