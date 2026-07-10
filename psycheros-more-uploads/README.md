# Psycheros More Uploads

This community add-on expands Psycheros chat uploads beyond the original
single-image flow.

It is not an official Psycheros release.

## What changes

- Adds multiple attachments to the main chat composer.
- Supports image uploads plus `.txt`, `.md`, `.csv`, `.json`, `.pdf`, `.docx`,
  and `.xlsx` files.
- Adds file attachments to Yin Yang typed voice mode.
- Renders uploaded images and file chips cleanly in chat history.
- Sends extractable document text to the entity for supported document types.
- Refreshes the app shell asset/cache stamp so the embedded desktop view loads
  the updated upload UI files.

This package intentionally does not include the resizable voice text box,
expression sprites, or screen presence changes.

## Compatibility

Version 0.1.0 is tested for **Psycheros 0.8.23**. The installer refuses other
versions before changing files.

This package replaces chat/voice UI, server route, service-worker, and focused
test files. Close Psycheros and back up local source edits before installing it.

The installer records a marker in `packages/psycheros/.addon-installs/` and
also checks for older backup folders. It refuses to install over Voice Text
Resize, the More Uploads + Voice Text Resize combo, or Everything Together,
because those packages replace overlapping full UI files. Use the combo package
when you want uploads and voice resize together, or restore the official
Psycheros 0.8.23 source before switching back to this standalone package.

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
checks for Psycheros 0.8.23 and creates a timestamped backup before replacing
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

Start Psycheros and try:

- Attach two images to a normal chat message.
- Attach a supported document, such as a `.txt`, `.pdf`, or `.docx` file.
- Open a voice call, switch to Yin Yang mode, attach a file, and send typed
  text.

Developers can run:

```powershell
deno test -A --node-modules-dir=none packages/psycheros/tests/chat_attachments_test.ts
deno check --node-modules-dir=none packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/tests/chat_attachments_test.ts
```

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update.
