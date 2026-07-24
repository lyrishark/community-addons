# Psycheros Screen Presence Alpha

Consent-based browser screen sharing for Psycheros text chat and voice.

## Compatibility

Version 0.3.0-rc.1 is rebuilt and tested against stock Psycheros 0.10.0. It is
a guarded source bridge, not an API-v1 manager plugin: Psycheros 0.10 does not
yet expose an asynchronous pre-turn freshness barrier, host vision captioning,
or voice-turn screen-presence hooks to plugins.

The installer checks the exact Psycheros version and normalized SHA-256 of every
stock file it will replace, creates timestamped backups, and refuses unknown
local edits before writing anything.

## What it adds

- Explicit screen-share controls in chat and voice.
- Browser-mediated selection of a screen, window, or tab.
- Transient frame captioning through the configured vision provider.
- A bounded journal of distinct visual states since the previous turn.
- A forced fresh frame before text or voice turns while sharing is active.
- Text summaries in entity context; raw frames are not persisted.

The previous unrelated provider-error overlay is no longer bundled because it
is outside this add-on's scope and overlaps current host behavior.

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

## Configure and verify

Configure a low-latency vision model in Psycheros. Start a screen share, select
the intended source, change to a visibly different view, and ask the entity to
look at the current screen. Repeat once in voice mode.

Developers can run:

    deno fmt --check packages/psycheros/src/server/screen-presence.ts packages/psycheros/tests/screen_presence_test.ts
    deno check packages/psycheros/src/server/screen-presence.ts packages/psycheros/src/server/server.ts packages/psycheros/src/entity/loop.ts packages/psycheros/src/pulse/engine.ts
    deno test -A packages/psycheros/tests/screen_presence_test.ts
    node --check packages/psycheros/web/js/psycheros.js
    node --check packages/psycheros/web/js/voice.js

## Privacy

Sharing starts only after the browser's source-selection prompt. Raw frames are
transient and sent only to the configured captioning provider; entity context
receives compact text summaries. Stop sharing from either browser or Psycheros
controls whenever observation is no longer wanted.

## Undo

Close Psycheros and restore the timestamped backup recorded under
`packages/psycheros/.community-addon-backups`, or reinstall official Psycheros
source. Do not delete identity, memory, database, or state folders.
