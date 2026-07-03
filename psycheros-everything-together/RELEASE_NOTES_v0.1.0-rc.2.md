# Psycheros Everything Together v0.1.0-rc.2

Status: release candidate prerelease.  
Target Psycheros: `0.8.23`.

## What Changed Since rc.1

- Voice-started conversations now run the same first-turn auto-title generation
  as text chat. The title worker starts only when the conversation is empty and
  untitled, and it still broadcasts the sidebar/header update through the
  existing persistent SSE path.
- Yin Yang typed voice turns queued during an ordinary voice response now drain
  after that response finishes. rc.1 could queue those messages but only drained
  the queue after Pulse responses, which made quick follow-up Enter sends look
  swallowed.
- Queued typed voice turns preserve their typed-turn options, so they do not get
  reprocessed as browser speech transcripts when the queue drains.
- Refreshed the Everything Together app-shell/cache stamp to
  `everything-together-0.1.0-rc.2`.

## Still Included

- More Uploads for chat and Yin Yang typed voice mode.
- Resizable Yin Yang typed voice box.
- Accessible font settings.
- Windows shell handling.
- Screen presence alpha for chat and voice.
- Expression sprites, including voice overlay forwarding.
- Missing assistant turn recovery.

## Verification

- `deno fmt --check` passed for the affected route, voice pipeline/session, and
  addon tests.
- `deno lint` passed for the affected route, voice pipeline/session, and addon
  tests.
- `deno check` passed for the affected route, voice pipeline/session, and addon
  tests.
- Focused Everything Together tests passed, including the new voice-start title
  and queued typed-turn regression check.

## Dependency Note

No new external dependency was added in rc.2. The existing `pngjs` dependency is
still used only for optional expression sprite checkerboard cleanup.
