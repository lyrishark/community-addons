# Psycheros Loom Gemini Parser

A guarded Entity Loom source bridge that adds merged Gemini exports as an
import platform.

## Compatibility

Version 0.3.0-rc.1 is rebuilt and tested against stock Psycheros 0.10.0. It is
not compatible with older source trees and is not an API-v1 manager plugin:
Psycheros 0.10's plugin manager cannot register Entity Loom parsers.

The installer verifies the Psycheros version and the normalized SHA-256 of every
stock file it will replace before writing anything. It accepts a pristine
0.10.0 file or the identical 0.3.0-rc.1 payload for safe reinstallation, creates
timestamped backups, and refuses unknown local edits.

## What it adds

- Registers Gemini as an Entity Loom source platform.
- Auto-detects gemini-merged-batch-draft and
  gemini-thread-activity-merged-draft JSON.
- Parses merged conversations into Loom's normal conversation format.
- Leaves raw Gemini Activity exports and raw Gemini thread drafts unsupported;
  merge them in Psycheros Thread Exporter first.

## Install on Windows

1. Fully close Entity Loom and Psycheros.
2. Extract the release ZIP.
3. Open PowerShell in the extracted directory.
4. Run:

    Set-ExecutionPolicy -Scope Process Bypass
    .\tools\install-source-files.ps1 -PsycherosRoot "D:\path\to\Psycheros\source"

The selected root must contain packages\psycheros\deno.json and
packages\entity-loom.

## Verify

From the patched Psycheros source root:

    deno fmt --check packages/entity-loom/src/parsers/gemini.ts
    deno check packages/entity-loom/src/parsers/gemini.ts
    deno test -A packages/entity-loom/src/parsers/gemini.test.ts

Then open Entity Loom and upload a merged Gemini batch from Thread Exporter.

## Undo

Close Psycheros and restore the timestamped backup under
packages\entity-loom\.community-addon-backups. Updating or reinstalling
official Psycheros source also restores the stock files.
