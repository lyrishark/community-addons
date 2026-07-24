# Psycheros Everything Together v0.1.0-rc.3

Status: release candidate prerelease. Target Psycheros: `0.8.23`.

## What Changed Since rc.2

- Keeps lexical expression tracking active throughout visible streamed text, so
  the sprite can continue changing as a long response moves across topics and
  emotional postures.
- Requires one hidden entity-selected expression at the end of every final
  conversational response, settling the face intentionally after intermediate
  changes.
- Adds an optional 0-1 display intensity to the hidden expression signal and
  records entity-selected directives as `llm` rather than `manual` state.
- Persists the final expression shown on each assistant message and restores it
  when a conversation is reopened. Text classification remains as a fallback for
  legacy rows that predate expression persistence.
- Keeps the same hybrid behavior in text chat and the live voice overlay.
- Continues stripping all expression control syntax before display and
  persistence. Only the label and intensity are exposed to the embodiment UI; no
  hidden reasoning is accessed or stored.
- Refreshes the Everything Together app-shell/cache stamp to
  `everything-together-0.1.0-rc.3`.

## Still Included

- More Uploads for chat and Yin Yang typed voice mode.
- Resizable Yin Yang typed voice box.
- Accessible font settings.
- Windows shell handling.
- Screen presence alpha for chat and voice.
- Expression sprites, including voice overlay forwarding and the bundled Ember
  seed pack.
- Missing assistant turn recovery.
- Voice-started chat auto-titling and queued Yin Yang typed-turn draining.

## Verification

- Clean installation over an official Psycheros 0.8.23 source tree.
- `deno fmt --check`, `deno lint`, and `deno check` on the affected expression,
  entity, database, rendering, and test files.
- Focused Everything Together tests, including expression classification,
  hidden-directive parsing, reload persistence, voice forwarding, settings,
  uploads, shell handling, screen presence, and the existing combined-package
  regressions.
- JavaScript syntax checks for the chat and voice clients.

## Dependency Note

No new external dependency was added in rc.3. The existing `pngjs` dependency is
still used only for optional expression sprite checkerboard cleanup.
