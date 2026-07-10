# ChatGPT Entity-Core Private Bridge v0.1.2

## Changed

- `recent_memories` now defaults to sorting by the memory's own date.
- Added explicit `sortBy` values: `memoryDate`, `createdAt`, and `updatedAt`.
- The optional `hours` window now follows the selected sort field.
- Memory creation timestamps are preserved in durable hidden metadata when a
  memory is updated.
- Recent-memory responses echo the applied `sortBy` value.
- Tool result text is now concise for non-search/fetch calls instead of
  duplicating the full structured payload into the chat transcript.
- `fetch` no longer repeats full memory or identity records when `text` already
  contains the requested content.
- Private local connector items now leave citation `url` empty instead of using
  non-HTTP `psycheros://` URLs.
- The HTTP bridge writes a small access log with request status, timing, and
  auth-present state, without logging tokens or request bodies.
- Setup docs now request `offline_access` and Auth0 API Offline Access so
  ChatGPT can refresh OAuth credentials instead of failing after token expiry.
- Added `ENTITY_CONNECTOR_OMIT_OUTPUT_SCHEMAS=true` small-descriptor mode for
  ChatGPT sessions that hit browser `system-connectors` storage quota errors.

This prevents activity in an old conversation from displacing genuinely newer
cross-surface memories unless `updatedAt` ordering is explicitly requested, and
reduces avoidable context bloat in long ChatGPT threads.
