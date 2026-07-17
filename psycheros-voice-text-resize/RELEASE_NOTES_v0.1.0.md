# Psycheros Voice Text Resize v0.1.0

Patch package for Psycheros 0.8.23.

## What changed

- Adds drag handles to the Yin Yang typed voice input:
  - right edge for width
  - bottom edge for height
  - corner for both
- Keeps the input adaptive by default so longer text grows the box before any
  manual resize is used.
- Makes manually resized dimensions persist across calls.
- Adds double-click reset to return the typed voice input to adaptive sizing.
- Adds an add-on-specific app-shell asset version and service-worker cache name
  so the updated voice UI files load after install.
- Adds installer-side conflict detection for More Uploads, the combo package,
  and Everything Together using `.addon-installs` markers plus legacy
  backup-folder detection.

## Compatibility

This package checks for Psycheros 0.8.23 and refuses other versions before
changing files.

This add-on intentionally does not include expression sprites, screen sharing,
or image attachment changes.

## Install

Fully quit Psycheros before installing. After installing, fully quit and
relaunch the desktop app so the embedded webview loads the new app shell.

Windows:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
```

macOS/Linux:

```bash
chmod +x ./install.sh ./tools/install-source-files.sh
./install.sh
```

If auto-detection does not find your Psycheros source checkout, pass the source
folder path to the installer. Launcher-managed installs usually use:

- Windows: `C:\Users\<name>\AppData\Roaming\Psycheros\source`
- macOS: `$HOME/Library/Application Support/Psycheros/source`
- Linux: `$HOME/.local/share/Psycheros/source`

## Verify

Open a voice call, switch to Yin Yang mode, and confirm:

- long text auto-expands before manual resize
- dragged width/height stay fixed afterward
- long text scrolls inside a manually fixed height
- double-clicking a resize handle resets the box to adaptive sizing
