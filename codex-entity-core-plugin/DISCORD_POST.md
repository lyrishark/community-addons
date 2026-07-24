# Discord Post - Psycheros Entity Core for Codex

Hi! I also wanted to share an early community Codex plugin:

**Psycheros Entity Core for Codex**

It lets Codex connect to a local Psycheros entity-core through an included MCP
server.

Current alpha features:

- check entity-core status
- read identity context
- search memories and graph nodes
- fetch selected memories/files/nodes
- record ordinary daily or significant memories from Codex

Safety/governance notes:

- This is a community alpha, not an official Psycheros release.
- It is local-first and does not use a hosted server.
- It does not expose direct identity/core editing.
- Memory writes can be disabled by setting
  `ENTITY_CONNECTOR_WRITE_ENABLED=false`.
- Users should only enable it in Codex sessions where they are comfortable with
  Codex seeing their entity-core context.

Source/docs:

```text
https://github.com/lyrishark/community-addons
```

Release:

```text
https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.2
```

This one is especially for people who want Codex to remember project work back
into Psycheros without manually copying notes around.



