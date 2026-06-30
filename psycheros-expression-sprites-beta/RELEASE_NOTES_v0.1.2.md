# Psycheros Expression Sprites Beta v0.1.2

Beta package for Psycheros 0.8.22.

## What changed

- Rebased the sprite addon payload onto Psycheros 0.8.22.
- Added desktop and mobile side settings for the visual-novel-style sprite
  stage.
- Added an entity-only hidden expression directive. If the detected expression
  is wrong, the entity can override it without showing a correction prompt to
  the human.
- Improved the expression classifier around recent tone, romantic/charged
  intent, tenderness, reassurance, fear words inside comfort, project
  excitement, and long reflective messages.
- Kept expression display as UI state only. It is not written into companion
  memory.
- Added a macOS/Linux shell installer alongside the Windows PowerShell
  installer.

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
folder path to the installer.

## Verify

After installing, restart Psycheros and open:

```text
Settings > Vision > Expressions
```

Import a SillyTavern-style sprite ZIP or upload sprites per emotion, then send a
chat message. The entity header should show the current expression label, and
configured sprites should appear in the chat stage.
