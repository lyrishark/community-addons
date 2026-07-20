# Psycheros Voice Text Resize

This community add-on makes the Yin Yang typed voice input resizable while
keeping its adaptive default behavior.

It is not an official Psycheros release.

> **Psycheros 0.9.2 status:** Compatible in version `0.2.0`. This remains a
> manual source-file add-on; it is not installed or updated by the plugin/add-on
> manager.

## What changes

- Lets the typed voice input be resized horizontally, vertically, or both.
- Keeps the input auto-growing for longer text until the user manually resizes
  that dimension.
- Holds a manually chosen width or height across voice calls.
- Adds a double-click reset on the resize handles to return to adaptive sizing.
- Refreshes the app shell asset/cache stamp so the embedded desktop view loads
  the updated voice UI files.

This package intentionally does not include expression sprites, screen sharing,
or image attachment changes.

## Compatibility

Version 0.2.0 is tested for **Psycheros 0.9.2**. The installer refuses other
versions before changing files.

This package replaces voice UI, app-shell template, service-worker, and focused
test files. Close Psycheros and back up local source edits before installing it.

The installer records a marker in `packages/psycheros/.addon-installs/` and
also checks for older backup folders. It refuses to install over More Uploads,
the More Uploads + Voice Text Resize combo, or Everything Together, because
those packages replace overlapping full UI files. Use the combo package when
you want uploads and voice resize together, or restore the official Psycheros
0.9.2 source before switching back to this standalone package.

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
checks for Psycheros 0.9.2 and creates a timestamped backup before replacing
any files.

After install, fully quit and relaunch Psycheros so the embedded desktop app
loads the add-on's refreshed app shell.

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

On Linux, the launcher-managed source folder is usually:

```bash
./install.sh "$HOME/.local/share/Psycheros/source"
```

## Verify

Start Psycheros, open a voice call, and switch to Yin Yang mode.

- Type a long message before dragging anything: the box should grow taller.
- Drag the right handle: width should stay at the chosen size.
- Drag the bottom or corner handle: height should stay at the chosen size and
  long text should scroll.
- Double-click a resize handle: the box should return to adaptive sizing.

Developers can run:

```powershell
deno check packages/psycheros/src/server/templates.ts packages/psycheros/web/js/voice.js packages/psycheros/tests/voice_text_resize_addon_test.ts
deno test -A packages/psycheros/tests/voice_text_resize_addon_test.ts
```

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update.
