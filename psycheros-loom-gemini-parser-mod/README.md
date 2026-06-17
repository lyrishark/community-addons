# Psycheros Loom Gemini Parser Mod

This is an alternate/modded Entity Loom file set that lets Psycheros Entity Loom
accept merged Gemini exports from the Psycheros Thread Exporter browser
extension.

It is not an official Psycheros release. It replaces a small set of
`packages/entity-loom` files in a local Psycheros source checkout.

## What This Adds

- Adds `gemini` as an Entity Loom source platform.
- Auto-detects merged Gemini batch files:
  - `gemini-merged-batch-draft`
  - `gemini-thread-activity-merged-draft`
- Parses merged Gemini conversations into Loom's normal conversation format.
- Keeps raw Gemini Activity exports and raw Gemini thread drafts out of Loom.
  Use the browser extension merger first.

## Files Included

Copy these paths into the matching paths in your Psycheros checkout:

```text
packages/entity-loom/src/types.ts
packages/entity-loom/src/parsers/gemini.ts
packages/entity-loom/src/parsers/gemini.test.ts
packages/entity-loom/src/parsers/mod.ts
packages/entity-loom/src/parsers/registry.ts
packages/entity-loom/web/wizard.html
```

## Install On Windows

1. Close Entity Loom if it is running.
2. Extract this mod package somewhere easy to find.
3. Find your Psycheros checkout folder. It should contain:

```text
deno.json
packages\entity-loom\
packages\psycheros\
```

4. Back up your Entity Loom files if you want an easy undo path.
5. From PowerShell, run this from the extracted mod folder, replacing the
   destination path with your Psycheros checkout:

```powershell
Copy-Item -Recurse -Force .\files\packages\entity-loom\* G:\Psycheros-main\packages\entity-loom\
```

If your checkout is `G:\Psycheros` instead, use:

```powershell
Copy-Item -Recurse -Force .\files\packages\entity-loom\* G:\Psycheros\packages\entity-loom\
```

6. Start Entity Loom again.
7. Upload your merged Gemini batch JSON, usually named like:

```text
gemini-merged-batch_2026-06-16.json
```

The upload queue should detect the platform as `gemini`.

## Important Workflow

Do not upload raw Gemini thread drafts or raw Gemini Activity exports directly
to Loom. The intended flow is:

1. Export Gemini thread draft(s) with Psycheros Thread Exporter.
2. Export Gemini Apps Activity with Psycheros Thread Exporter.
3. Merge them in the extension's Gemini Export Merger.
4. Upload the merged batch JSON to Entity Loom with this mod installed.

If a long import is interrupted and the Loom UI later looks stuck on a running
stage, see the companion resume/reimport patch:

- [Psycheros Loom Gemini Resume Patch](../psycheros-loom-gemini-resume-patch/README.md)

## Undo

To undo this mod, reinstall/update Psycheros or restore the backed-up files.

## Known Limits

Gemini does not expose exact assistant timestamps in the normal chat UI. The
browser extension merger infers assistant timestamps from visible thread order
after matching user prompts to Gemini Apps Activity timestamps. If the merger
report says a thread has missing timestamps, Entity Loom can still parse the
merged file, but those messages may be assigned inferred fallback times.
