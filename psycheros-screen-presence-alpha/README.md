# Psycheros Screen Presence Alpha

This community add-on adds browser screen-share presence to Psycheros text chat
and voice mode.

It is not an official Psycheros release.

> **Psycheros 0.9.0 status:** Not compatible and not publicly released.
> Version `0.1.0` is a staged Psycheros 0.8.20 source-replacement package; do
> not force it onto 0.9.0 or install it through either 0.9 manager.

## What changes

- Adds screen-share controls to chat and voice surfaces.
- Captures compact image captions through the configured vision model.
- Sends only text summaries into entity context, not raw screen frames.
- Forces a fresh caption before user text and voice turns when a share is active.
- Tracks a bounded journal of distinct visual states since the last turn.
- Includes clearer provider guidance for rate-limit and quota errors.

This is an alpha. The browser asks the user to choose the screen, window, or tab
to share. Psycheros does not silently browse the whole PC.

## Compatibility

Version 0.1.0 is tested for **Psycheros 0.8.20**. The installer refuses all
other versions before changing files.

This package replaces several shared chat, voice, server, and formatter files.
Close Psycheros and back up local source edits before installing it.

## Install on Windows

1. Close Psycheros.
2. Back up any local source changes you want to preserve.
3. Open PowerShell in this add-on folder.
4. Run the installer with the path to your Psycheros checkout:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\tools\install-source-files.ps1 -PsycherosRoot "C:\Users\<name>\AppData\Roaming\Psycheros"
```

The selected folder must contain `packages\psycheros\deno.json`. The installer
checks for Psycheros 0.8.20 and creates a timestamped backup before replacing
any files.

## Configure captioning

Screen presence works best with a low-latency vision model configured through
Psycheros provider settings. If captioning is not configured, the share can
still be active, but the entity receives only status metadata.

The alpha is designed for compact visual summaries, not full video streaming.
It records distinct visual-state changes and the latest state for each turn.

## Verify

Start Psycheros, then open chat or voice mode.

- Start screen sharing and choose a screen, window, or browser tab.
- Switch to a visibly different view.
- Send a message that asks the entity to look at the current screen.
- The response should reference the latest screen summary and may include
  distinct visual changes since the previous turn.

Developers can run:

```powershell
deno check packages/psycheros/src/main.ts
deno test -A packages/psycheros/tests/screen_presence_test.ts packages/psycheros/tests/llm_errors_test.ts
deno test -A packages/psycheros/tests/
```

## Privacy note

Raw frames are transient and are used only to request compact captions from the
configured vision provider. The entity context receives text summaries. Stop the
share from the browser or Psycheros controls when you do not want the screen to
be observed.

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update, or move to the Nyx channel once
this alpha is promoted there.
