# Psycheros Expression Sprites Beta v0.1.4

Patch package for Psycheros 0.8.22.

## What changed

- Adds add-on-specific web asset versioning for the Psycheros app shell.
- Adds add-on-specific service-worker cache names so the embedded desktop
  webview does not keep an old `0.8.22` app shell after the sprite add-on
  changes UI files.
- Stops offline-caching the root app shell as a static asset.
- Clears Psycheros offline caches once when the expression-sprites client asset
  version changes.
- Keeps the v0.1.3 fix for `Settings > Vision > Expressions`.

## Compatibility

This package checks for Psycheros 0.8.22 and refuses other versions before
changing files.

This add-on intentionally does not include screen sharing.

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

After installing, fully quit and relaunch Psycheros, then open:

```text
Settings > Vision > Expressions
```

The `Expressions` tab should be visible alongside `Generators`, `Anchors`, and
`Gallery` in the embedded app and in an external browser.
