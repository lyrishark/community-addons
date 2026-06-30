# Psycheros Expression Sprites Beta

This community add-on adds live expression detection and optional character
sprites to Psycheros chat.

It is not an official Psycheros release.

## What changes

- Adds a transient expression signal to assistant turns. It is for live display
  only and is not written as companion memory.
- Adds Settings > Vision > Expressions.
- Supports SillyTavern-style sprite ZIP imports and per-emotion uploads.
- Covers the SillyTavern expression label set plus extra labels used by the
  Psycheros classifier.
- Cleans common fake checkerboard backgrounds during upload/import when that
  setting is enabled.
- Adds missing-sprite fallback modes: show emotion label, use closest configured
  sprite, or show nothing.
- Displays the latest sprite in a visual-novel-style chat stage that works on
  desktop and mobile.

No sprite images are bundled. You bring your own transparent PNG/WebP/GIF/JPEG
sprite set.

## Compatibility

Version 0.1.0 is tested for **Psycheros 0.8.21**. The installer refuses other
versions before changing files.

This package replaces shared chat, server, UI, docs, test, and lock files. Close
Psycheros and back up local source edits before installing it.

This add-on intentionally does **not** include screen sharing.

## Install on Windows

1. Close Psycheros.
2. Back up any local source changes you want to preserve.
3. Open PowerShell in this add-on folder.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
```

If the installer cannot find your Psycheros source folder, run it with the path:

```powershell
.\install.ps1 -PsycherosRoot "C:\Users\<name>\AppData\Roaming\Psycheros"
```

The selected folder must contain `packages\psycheros\deno.json`. The installer
checks for Psycheros 0.8.21 and creates a timestamped backup before replacing
any files.

## Add sprites

Start Psycheros, then open:

```text
Settings > Vision > Expressions
```

From there you can:

- import a ZIP containing expression images named like `joy.png`,
  `embarrassment.webp`, `anger.gif`, etc.
- upload one image per expression slot
- choose fallback behavior for missing sprites
- choose frame/background cleanup behavior

Transparent PNG or WebP files look best over chat backgrounds. If an image was
generated with a visible gray checkerboard instead of real transparency, leave
checkerboard cleanup enabled and re-upload it.

## Verify

Start Psycheros, open a chat, and send a message that should produce a visible
emotion. The assistant header should show an expression label, and configured
sprites should appear in the chat stage.

Developers can run:

```powershell
deno check packages/psycheros/src/main.ts
node --check packages/psycheros/web/js/psycheros.js
deno test -A packages/psycheros/tests/expression_classifier_test.ts packages/psycheros/tests/expression_sprites_test.ts packages/psycheros/tests/expression_checkerboard_test.ts
deno test -A packages/psycheros/tests
```

## Privacy note

Expression state is derived from the assistant's visible output stream. It is a
UI display signal, not a durable statement about what the companion "feels" and
not a memory write.

Imported sprite files are stored locally in the Psycheros data folder.

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update, or move to the Nyx channel once
this beta is promoted there.
