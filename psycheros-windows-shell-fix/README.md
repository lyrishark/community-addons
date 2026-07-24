# Psycheros Windows Shell Fix

A trusted API-v1 plugin that makes Psycheros's existing shell tool use the host
platform shell. It fixes stock Psycheros 0.10 failures on Windows systems
without sh:

    Failed to spawn sh: entity not found

It does not replace Psycheros source files.

## Compatibility

Version 0.3.0-rc.1 supports Psycheros 0.10.x. The historical 0.1.x and 0.2.0
source overlays remain attached to their original releases.

## Install

1. Download psycheros-windows-shell-fix-0.3.0-rc.1.zip from GitHub Releases.
2. Open **Settings > Plugins** in Psycheros 0.10.
3. Preview the ZIP, review its trusted entrypoint and warnings, and install it.
4. Restart Psycheros when prompted and leave the plugin enabled.

The plugin exports a tool named shell. Psycheros 0.10 merges plugin tools after
stock tools, so this implementation replaces the stock registration without
patching the host.

## Behavior

- Windows uses powershell.exe, with cmd.exe only as a spawn fallback.
- macOS and Linux continue to use sh -c.
- Command timeouts, stdout/stderr capture, non-zero exits, and basic secret
  redaction are preserved.
- A normal command failure never changes shell languages.

## Verify from source

    deno task check
    deno task test

The test suite executes real success and failure commands through the selected
platform shell and checks output redaction.

## Security

This plugin does not grant new privileges. The shell tool already runs commands
with the Psycheros daemon user's permissions. Enable it only for an entity you
trust with those permissions.

The underlying stock defect is tracked in
[Psycheros #40](https://github.com/PsycherosAI/Psycheros/issues/40). When a
future Psycheros release includes an equivalent host fix, uninstall this plugin.
