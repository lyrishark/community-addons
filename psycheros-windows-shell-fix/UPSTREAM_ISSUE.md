# Upstream issue draft

Suggested title:

```text
[bug] Shell tool should use the host shell on Windows instead of hardcoding sh
```

## Summary

The Psycheros shell tool always starts `sh -c`. A standard Windows installation
may not provide `sh`, so valid shell calls fail before the requested command can
run:

```text
Failed to spawn sh: entity not found
```

## Expected behavior

- Windows should use PowerShell, with `cmd.exe` as a missing-executable fallback.
- macOS and Linux should continue to use `sh -c`.
- A non-zero command result should not trigger a fallback to another shell.
- Existing timeout and output-capture behavior should remain intact.

## Verification

The patch is rebased onto Psycheros 0.8.9. `deno check` passes, and the focused
tests execute a successful command plus a non-zero exit on Windows.
