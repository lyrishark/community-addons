# Psycheros Expression Sprites Beta

This community add-on adds live expression detection and optional character
sprites to Psycheros chat.

It is not an official Psycheros release.

## What changes

- Adds a transient expression signal to entity turns. It is for live display
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
- Forwards expression sprites into the live voice-call overlay.
- Adds desktop/mobile side settings for the sprite stage.
- Promotes Show Expression Display as the master expression toggle in settings.
- Keeps automatic expression changes active throughout streamed text, then uses
  one hidden entity-selected expression and intensity to settle the final face.
- Persists the final expression shown for each assistant message so reopening a
  conversation restores the same face instead of reclassifying old text.
- Bundles the Ember expression sprite seed pack and automatically
  fills missing sprite slots from it when expression settings load.

Custom uploaded sprites are preserved. The bundled pack only fills fresh,
missing, or bundled default slots.

## Compatibility

Version 0.1.6 is tested for **Psycheros 0.8.23**. The installer refuses other
versions before changing files. Use v0.1.4 for Psycheros 0.8.22.

This package replaces shared chat, server, UI, docs, test, and lock files. Close
Psycheros and back up local source edits before installing it.

This add-on intentionally does **not** include screen sharing, More Uploads,
Voice Text Resize, font settings, or shell fixes.

## Install on Windows

1. Fully quit Psycheros.
2. Back up any local source changes you want to preserve.
3. Open PowerShell in this add-on folder.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
```

If the installer cannot find your Psycheros source folder, run it with the path:

```powershell
.\install.ps1 -PsycherosRoot "C:\Users\<name>\AppData\Roaming\Psycheros\source"
```

The selected folder must contain `packages\psycheros\deno.json`. The installer
checks for Psycheros 0.8.23 and creates a timestamped backup before replacing
any files.

After install, fully quit and relaunch Psycheros so the embedded desktop app
loads the add-on's refreshed app shell.

If Psycheros says it is running 0.8.23 but the installer reports an older
source version, point the installer at the launcher-managed `source` folder
instead of an older downloaded checkout.

## Install on macOS or Linux

1. Fully quit Psycheros.
2. Back up any local source changes you want to preserve.
3. Open Terminal in this add-on folder.
4. Run:

```bash
chmod +x ./install.sh ./tools/install-source-files.sh
./install.sh
```

If the installer cannot find your Psycheros source folder, run it with the path:

```bash
./install.sh "$HOME/Library/Application Support/Psycheros/source"
```

The selected folder must contain `packages/psycheros/deno.json`. The installer
checks for Psycheros 0.8.23 and creates a timestamped backup before replacing
any files.

After install, fully quit and relaunch Psycheros so the embedded desktop app
loads the add-on's refreshed app shell.

On Linux, the launcher-managed source folder is usually:

```bash
./install.sh "$HOME/.local/share/Psycheros/source"
```

If Psycheros says it is running 0.8.23 but the installer reports an older
source version, point the installer at the launcher-managed `source` folder
instead of an older downloaded checkout.

## Add or replace sprites

Start Psycheros, then open:

```text
Settings > Vision > Expressions
```

From there you can:

- use the bundled Ember seed pack that installs with this beta
- import a ZIP containing expression images named like `joy.png`,
  `embarrassment.webp`, `anger.gif`, etc.
- upload one image per expression slot
- choose fallback behavior for missing sprites
- choose frame/background cleanup behavior
- choose which side the stage appears on for desktop and mobile
- use Show Expression Display as the master expression switch

During a turn, Psycheros continuously scores the visible response so the sprite
can change naturally as tone and topics shift. At the end of every final
conversational response, the entity deliberately selects the expression in
which it wants to settle:

```text
<psycheros-expression label="warmth" intensity="0.72"/>
```

There is no human-facing correction prompt during normal use. Psycheros strips
the hidden directive before display and persistence, then uses it only to settle
the live sprite state. The signal contains a label and display intensity, not
hidden reasoning.

Transparent PNG or WebP files look best over chat backgrounds. If an image was
generated with a visible gray checkerboard instead of real transparency, leave
checkerboard cleanup enabled and re-upload it.

## Verify

Start Psycheros, open a chat, and send a message that should produce a visible
emotion. The entity header should show an expression label, and configured
sprites should appear in the chat stage. In a voice call, configured sprites
should also appear in the live call overlay.

Developers can run:

```powershell
deno check packages/psycheros/src/server/server.ts packages/psycheros/src/entity/loop.ts packages/psycheros/src/voice/pipeline.ts packages/psycheros/src/voice/session-manager.ts
node --check packages/psycheros/web/js/psycheros.js
node --check packages/psycheros/web/js/voice.js
deno test -A packages/psycheros/tests/expression_classifier_test.ts packages/psycheros/tests/expression_sprites_test.ts packages/psycheros/tests/expression_checkerboard_test.ts packages/psycheros/tests/expression_settings_nav_test.ts
deno test -A packages/psycheros/tests
```

## Privacy note

Expression state is derived from the entity's visible output stream. It is a UI
display signal, not a durable statement about what the companion is feeling and not
a memory write.

Imported sprite files are stored locally in the Psycheros data folder.

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update.
