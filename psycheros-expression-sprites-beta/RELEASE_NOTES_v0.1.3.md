# Psycheros Expression Sprites Beta v0.1.3

Patch package for Psycheros 0.8.22.

## What changed

- Fixed the Vision settings tab bar so `Settings > Vision > Expressions` is
  visible immediately after install.
- Added a regression test for the initial Vision settings navigation, not just
  the direct expressions fragment route.
- Improved installer source detection for launcher-managed installs on Windows,
  macOS, and Linux, especially `.../Psycheros/source` folders.
- Improved installer version mismatch messages so stale source checkouts are
  clearly reported instead of looking like an add-on compatibility failure.
- Includes the v0.1.2 expression sprites beta features and the hidden
  entity-only expression directive refinements already staged on `main`.

## Compatibility

This package checks for Psycheros 0.8.22 and refuses other versions before
changing files.

This add-on intentionally does not include screen sharing.

## Install

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

After installing, restart Psycheros and open:

```text
Settings > Vision > Expressions
```

The `Expressions` tab should be visible alongside `Generators`, `Anchors`, and
`Gallery`.
