# Windows Shell Fix 0.2.0

Compatibility release for **Psycheros 0.9.2**.

- Rebased the host-shell selection and PowerShell-to-`cmd.exe` spawn fallback
  onto pristine upstream 0.9.2.
- Preserved upstream timeout, output, and non-zero-exit behavior.
- Passed type checking and both focused shell-tool tests.
- The installer accepts only Psycheros 0.9.2.
