# Release Readiness Audit

Status: **blocked** as of 2026-06-21.

## Checks that pass

- All eight replacement TypeScript files passed the earlier `deno check` when
  layered over the 0.8.9 parser mod, but they have not been rebased or rerun on
  current 0.8.11 source.
- The existing stage-lock tests still pass.
- The provider-required-temperature logic has a focused local test, but that
  test is not yet included in this package.

## Blocking findings

1. `files/packages/entity-loom/src/writers/db-writer.ts` removes the upstream
   `messages.is_voice` schema column and stops writing `msg.isVoice`. Installing
   the overlay would regress the current voice-message import schema.
2. Updated-thread replacement and downstream checkpoint reset span convert,
   staging, database, daily-memory, significant-memory, and graph state, but the
   package has no focused tests for those transitions.
3. Downstream reset currently derives affected dates only from the replacement
   conversation. If an update removes old messages or moves them to a new date,
   the old dates also need invalidation to avoid stale daily/graph results.
4. The installer does not validate the target Psycheros version before replacing
   full source files.

## Required before release

- Rebase all replacement files onto current Psycheros 0.8.11 and preserve
  `is_voice`.
- Add DB tests proving same-ID reimports replace messages without losing voice
  metadata.
- Add checkpoint tests covering stale-running recovery and old-plus-new date
  invalidation.
- Add an exact supported-version gate to the installer and repeat an end-to-end
  interrupted Gemini import/resume test on a disposable package.
