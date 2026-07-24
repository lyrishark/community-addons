# Psycheros Expression Sprites Beta

Live expression state and optional user-supplied character sprites for
Psycheros chat and voice.

## Compatibility

Version 0.3.0-rc.1 is rebuilt and tested against stock Psycheros 0.10.0. It is
a guarded source bridge, not an API-v1 manager plugin: Psycheros 0.10 does not
yet expose streamed-response transformation, final-message metadata, settings
surface, or voice-overlay hooks to plugins.

The installer verifies the exact Psycheros version and normalized SHA-256 of
every stock file it will replace. It accepts pristine 0.10.0 files or an
identical 0.3.0-rc.1 payload, makes timestamped backups, and refuses unknown
local edits before changing anything.

## What it adds

- Tracks expression changes during streamed text.
- Lets the responding entity settle the final expression through a hidden,
  stripped control directive.
- Persists the final display state with the assistant message.
- Adds Settings > Vision > Expressions.
- Imports SillyTavern-style sprite ZIPs or individual expression images.
- Supports missing-sprite fallbacks and checkerboard-background cleanup.
- Shows the configured sprite in chat and the live voice overlay.

No character art or personalized classifier rules are bundled. A fresh profile
starts empty and only uses sprites the user imports.

## Install

Fully close Psycheros, extract the release ZIP, then run one of the following
from the extracted directory.

Windows:

    Set-ExecutionPolicy -Scope Process Bypass
    .\install.ps1 -PsycherosRoot "D:\path\to\Psycheros\source"

macOS or Linux:

    chmod +x ./install.sh ./tools/install-source-files.sh
    ./install.sh "/path/to/Psycheros/source"

The selected root must contain `packages/psycheros/deno.json` and report
version 0.10.0. Restart Psycheros after installation.

## Add sprites

Open Settings > Vision > Expressions. Import a ZIP with filenames such as
`joy.png`, `embarrassment.webp`, or `anger.gif`, or upload images one slot at a
time. Transparent PNG and WebP images work best.

## Verify

From the patched Psycheros source root:

    deno fmt --check packages/psycheros/src/expression packages/psycheros/tests/expression_*_test.ts
    deno check packages/psycheros/src/expression/mod.ts
    deno test -A packages/psycheros/tests/expression_checkerboard_test.ts packages/psycheros/tests/expression_classifier_test.ts packages/psycheros/tests/expression_persistence_test.ts packages/psycheros/tests/expression_settings_nav_test.ts packages/psycheros/tests/expression_sprites_test.ts
    node --check packages/psycheros/web/js/psycheros.js
    node --check packages/psycheros/web/js/voice.js

Then open a chat and a voice session with at least one configured sprite.

## Privacy and state

Expression state is a display signal derived from visible output plus the
entity's final selected label. It is not written to companion memory. Imported
sprite files remain in the local Psycheros data folder.

## Undo

Close Psycheros and restore the timestamped backup recorded under
`.community-addon-backups`, or reinstall official Psycheros source. Do not
delete identity, memory, database, or state folders.
