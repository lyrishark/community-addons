# Psycheros Screen Presence Alpha v0.1.0

Initial community alpha for Psycheros 0.8.20.

## Added

- Screen-share controls for text chat and voice mode.
- Browser `getDisplayMedia` capture with user-selected screen, window, or tab.
- Server-side transient screen-presence service.
- Vision-caption refresh before text and voice turns.
- Situational-awareness formatting for current screen state.
- Bounded distinct visual-state journal since the previous turn.
- Tests for screen-presence state, formatting, UI wiring, and provider-error
  wording.

## Changed

- Provider error 1113 now points users toward rate-limit/quota/billing checks.

## Verification

Tested in the Nyx integration source on Psycheros 0.8.20:

```text
deno check packages/psycheros/src/main.ts
deno lint packages/psycheros/src/server/screen-presence.ts packages/psycheros/src/server/llm-errors.ts packages/psycheros/src/entity/sa-formatters.ts packages/psycheros/src/entity/loop.ts packages/psycheros/src/db/client.ts packages/psycheros/src/server/ui-updates.ts
deno test -A packages/psycheros/tests/
```

Result: 158 passed, 0 failed.
