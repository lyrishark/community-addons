# Psycheros Accessible Font Settings

This community add-on adds a **Text** tab to General Settings with:

- a 12–28 px interface font-size slider
- Sans, Serif, Dyslexia-friendly, and Handwriting presets
- a live text preview
- persistent settings that coexist with Psycheros theme and background settings

It is not an official Psycheros release.

> **Psycheros 0.9.0 status:** Not compatible. Version `0.1.3` is an exact
> Psycheros 0.8.23 source-replacement package. Do not force it onto 0.9.0 or
> install it through either 0.9 manager; a separately rebased package is needed.

## Compatibility

Version 0.1.3 is tested for **Psycheros 0.8.23**. It keeps the same font
feature as v0.1.2 and adds broader OS-aware font fallback stacks for Windows,
macOS/iOS, Android, and Linux. The installer refuses all other versions rather
than overwriting newer or locally modified source by accident.

Use v0.1.1 for Psycheros 0.8.9 through 0.8.11.

The Windows shell-tool fix previously bundled with the local prototype is not
part of this add-on. It now lives separately in
[`psycheros-windows-shell-fix`](../psycheros-windows-shell-fix/README.md).

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
checks for a supported version and creates a timestamped backup before replacing
any files.

## Verify

Start Psycheros, then open **Settings → General Settings → Text**.

- Moving the slider should update the displayed pixel value and interface text.
- Selecting a preset should update the preview and selected-button state.
- Reloading the app should preserve both choices.
- Theme accent and background settings should remain unchanged.

Developers can run:

```powershell
deno check packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/tests/theme_test.ts
deno test -A packages/psycheros/tests/theme_test.ts
```

## Font fallback behavior

This add-on does not download or bundle font files. The browser uses the first
installed font from each preset stack:

- Sans tries IBM Plex Sans or Inter, then Apple, Windows, Android, and Linux
  system sans fonts.
- Serif tries Iowan Old Style on Apple systems, Palatino/Cambria/Georgia on
  Windows and common desktops, then Times-style serif fallbacks.
- Dyslexia-friendly tries OpenDyslexic, Atkinson Hyperlegible, and Lexend, then
  readable Windows/macOS/Linux fallbacks such as Verdana, Trebuchet, Noto Sans,
  and DejaVu Sans.
- Handwriting tries Segoe Print on Windows, Bradley Hand or Apple Chancery on
  macOS/iOS, then Comic Sans/Comic Neue or the browser cursive fallback.

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update, or maintain the feature in a
private fork/update channel.
