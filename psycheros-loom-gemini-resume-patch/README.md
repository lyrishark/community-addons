# Psycheros Loom Gemini Resume Patch

> **Release status: blocked.** Do not publish or install the current 0.1.0 file
> set over Psycheros 0.8.9. The package type-checks, but its `db-writer.ts`
> predates 0.8.9 voice-message schema support and would remove `is_voice` from
> newly created Loom databases. The update/reimport paths also need focused
> database and checkpoint tests before release.

> **Psycheros 0.9.0 status:** Superseded and still unpublished. Psycheros 0.9.0
> now includes stale-stage recovery, updated-thread replacement, voice-schema
> safety, and focused tests for these paths. Do not install this package.

This is an optional modded Entity Loom file set for people testing Gemini imports
with Psycheros Thread Exporter.

It is not an official Psycheros release. It replaces a small set of local
`packages/entity-loom` files. Back up first.

## What This Fixes

- Entity Loom can get stuck after a restart if a long background stage was
  interrupted while its checkpoint still says `running`.
- On resume, this patch marks stale background stages as `aborted` /
  resumable when no stage is actually active.
- Updated same-ID thread exports are treated as updates instead of ignored
  duplicates.
- Updated threads replace old messages in `chats.db`.
- Significant, daily, and graph checkpoints are reset only where updated
  conversations require reprocessing.
- Empty memory edits can be saved.
- If a provider says a specific temperature is required, Entity Loom retries
  once with that temperature and remembers it for the current session.

This is intended to be used after the Gemini parser mod:

- [Psycheros Loom Gemini Parser Mod](../psycheros-loom-gemini-parser-mod/README.md)

## Files Included

Copy these paths into the matching paths in your Psycheros checkout:

```text
packages/entity-loom/src/llm/client.ts
packages/entity-loom/src/stages/convert-stage.ts
packages/entity-loom/src/stages/daily-stage.ts
packages/entity-loom/src/stages/setup-stage.ts
packages/entity-loom/src/stages/significant-stage.ts
packages/entity-loom/src/stages/staging-stage.ts
packages/entity-loom/src/writers/db-writer.ts
packages/entity-loom/src/writers/staging-writer.ts
```

## Install On Windows

1. Close Entity Loom if it is running.
2. Extract this patch somewhere easy to find.
3. Find your Psycheros checkout folder. It should contain:

```text
deno.json
packages\entity-loom\
packages\psycheros\
```

4. Open PowerShell in this patch folder.
5. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\tools\install-source-files.ps1 -PsycherosRoot "G:\Psycheros-main"
```

Use your actual Psycheros checkout path instead of `G:\Psycheros-main`.

If a package is already stuck on a running Significant/Daily/Graph stage, also
run:

```powershell
.\tools\repair-checkpoint.ps1 -PsycherosRoot "G:\Psycheros-main" -PackageName "Your-import-package"
```

If there is only one package in `.loom-exports`, `-PackageName` can be omitted.

6. Start Entity Loom again.
7. Resume the package. If the stage says `Aborted (resumable)`, click
   Start/Continue.

## Undo

The install script creates a backup folder inside `packages\entity-loom`, named
like:

```text
_gemini_resume_patch_backup_YYYYMMDD-HHMMSS
```

The checkpoint repair script creates:

```text
checkpoint.json.bak-YYYYMMDD-HHMMSS
```

Restore those files or reinstall/update Psycheros to undo the patch.

## Important Notes

- This patch does not include memories, databases, uploads, API keys, or
  `.loom-exports`.
- The checkpoint repair only changes stale `running` background stages to
  `aborted` / resumable. It does not clear processed item lists.
- If a package says `platform: "chatgpt"` in `checkpoint.json` but the upload
  manifest says the uploaded file is Gemini, the upload/platform parsing may
  still be fine. The setup platform field can be stale or defaulted.
