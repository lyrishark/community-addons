# Psycheros Expression Sprites Beta v0.1.6

Hybrid stream-and-settle expression update for Psycheros 0.8.23.

## What changed

- Keeps lexical expression tracking active throughout visible streamed text, so
  the sprite can continue changing as a long response moves across topics and
  emotional postures.
- Requires one hidden entity-selected expression at the end of every final
  conversational response, settling the face intentionally after intermediate
  changes.
- Adds an optional 0-1 display intensity to the hidden expression signal.
- Records an entity-selected directive as `llm` rather than `manual` state.
- Persists the final expression shown on each assistant message and restores it
  when a conversation is reopened, with text classification retained for legacy
  rows.
- Keeps the same hybrid behavior in text chat and the live voice overlay.
- Continues stripping all expression control syntax before display and
  persistence. Only the label and intensity are exposed to the embodiment UI;
  no hidden reasoning is accessed or stored.

## Compatibility

This package checks for Psycheros 0.8.23 and refuses other versions before
install. Use v0.1.4 for Psycheros 0.8.22.

Official Psycheros updates can replace modded source files. After updating
Psycheros, reinstall the expression-sprites package that matches the installed
Psycheros version.

## Verification

- `deno fmt --check` on the affected TypeScript and test files.
- `deno check` on the entity loop, database, rendering, and expression test
  entry points.
- `deno test -A` for expression classification, sprite protocol, persistence,
  checkerboard cleanup, and settings navigation.
- Live Psycheros runtime verification with all 50 expression sprites installed.

## Dependency note

No new external dependency was added in this release.
