# Psycheros More Uploads

This community add-on expands Psycheros chat uploads beyond the original
single-image flow.

It is not an official Psycheros release.

> **Psycheros 0.9.0 status:** Not compatible. Version `0.1.1` is an exact
> Psycheros 0.8.23 source-replacement package. Do not force it onto 0.9.0 or
> install it through either 0.9 manager; a separately rebased package is needed.

## What changes

- Adds multiple attachments to the main chat composer.
- Supports image and document uploads plus MP3, MP4/MPEG audio, WAV, FLAC,
  M4A, AAC, AIFF, OGG, Opus, and WebM music files.
- Streams large uploads to disk instead of buffering the whole song in server memory;
  the attachment limit is 512 MB.
- Adds file attachments to Yin Yang typed voice mode.
- Renders uploaded images, audio players, and file chips cleanly in chat history.
- Sends extractable document text to the entity for supported document types.
- Refreshes the app shell asset/cache stamp so the embedded desktop view loads
  the updated upload UI files.

This package intentionally does not include the resizable voice text box,
expression sprites, or screen presence changes.

## Compatibility

Version 0.1.1 is tested for **Psycheros 0.8.23**. The installer refuses other
versions before changing files.

This package replaces chat/voice UI, server route, service-worker, and focused
test files. Close Psycheros and back up local source edits before installing it.

The installer records a marker in `packages/psycheros/.addon-installs/` and
also checks for older backup folders. It refuses to install over Voice Text
Resize, the More Uploads + Voice Text Resize combo, or Everything Together,
because those packages replace overlapping full UI files. Use the combo package
when you want uploads and voice resize together, or restore the official
Psycheros 0.8.23 source before switching back to this standalone package.

### HTF Music Listener compatibility

On plain upstream Psycheros, install **More Uploads 0.1.1 first**, then install the
**HTF Music Listener 0.1.2 legacy** package. The listener's marked browser bridge must
be applied last because this source-file mod replaces `web/js/psycheros.js`.

Do not use More Uploads 0.1.0 for music: its browser filter rejects audio and its 10 MB
limit is too small for many WAV files. On the Rae/Ember trusted-plugin fork, do not
install this upstream file-replacement mod; that fork already contains the expanded
upload path, so install only the normal HTF plugin.

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
- Attach an MP3, M4A, FLAC, or WAV music file.
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
