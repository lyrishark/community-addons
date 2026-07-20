# Psycheros Windows Shell Fix

This community patch fixes Psycheros shell-tool failures on Windows when `sh` is
not installed:

```text
Failed to spawn sh: entity not found
```

It is not an official Psycheros release.

> **Psycheros 0.9.2 status:** Compatible in version `0.2.0`. This package was
> rebuilt from pristine upstream 0.9.2 and the installer refuses other source
> versions before changing files.

## What changes

- Windows uses `powershell.exe` as its command shell.
- If PowerShell itself cannot be spawned, the tool falls back to `cmd.exe`.
- macOS and Linux continue to use `sh -c`.
- Command timeouts, captured output, and non-zero exit reporting are preserved.

The fallback only occurs when the shell executable cannot be started. An
ordinary command failure remains a command failure and does not silently switch
shell languages.

## Compatibility

Version 0.2.0 is tested for **Psycheros 0.9.2**. Version 0.1.1 remains the
historical package for Psycheros 0.8.9 through 0.8.11.

## Install on Windows

Close Psycheros, open PowerShell in this patch folder, and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\tools\install-source-files.ps1 -PsycherosRoot "C:\Users\<name>\AppData\Roaming\Psycheros\source"
```

The installer creates a timestamped backup inside `packages\psycheros`.

## Verify

Developers can run:

```powershell
deno check packages/psycheros/src/tools/shell.ts packages/psycheros/tests/shell_tool_test.ts
deno test -A packages/psycheros/tests/shell_tool_test.ts
```

The test suite executes a real command through the Windows shell and confirms
that non-zero exits remain errors.

## Security note

This patch does not grant new privileges. The Psycheros shell tool already runs
commands with the daemon process's user permissions; only enable that tool for
an entity you trust with those permissions.

## Undo

Close Psycheros and restore the timestamped backup, or update/reinstall the
official source. Official source updates replace tracked mod files.
