# Psycheros More Uploads + Voice Text Resize

This community add-on combines the More Uploads package with the Yin Yang typed
voice resize package so both changes can live in the same replaced UI files.

It is not an official Psycheros release.

## What changes

- Adds multiple attachments to the main chat composer.
- Supports image and document uploads plus MP3, MP4/MPEG audio, WAV, FLAC,
  M4A, AAC, AIFF, OGG, Opus, and WebM music files.
- Streams large uploads to disk with a 512 MB attachment ceiling.
- Adds file attachments to Yin Yang typed voice mode.
- Lets the Yin Yang typed voice input be resized horizontally, vertically, or
  both.
- Keeps the typed voice input auto-growing for longer text until the user
  manually resizes that dimension.
- Holds a manually chosen width or height across voice calls.
- Adds a double-click reset on the resize handles to return to adaptive sizing.
- Renders uploaded images, audio players, and file chips cleanly in chat history.
- Sends extractable document text to the entity for supported document types.
- Refreshes the app shell asset/cache stamp so the embedded desktop view loads
  the updated upload and voice UI files.

This package intentionally does not include expression sprites or screen
presence changes.

## Why this exists

The standalone More Uploads and Voice Text Resize packages both replace
`templates.ts`, `voice.js`, `voice.css`, and `sw.js`. Installing both
standalones separately can cause the last installed package to overwrite part of
the first. Use this combo package when you want both behaviors at the same time.

The installer records a marker in `packages/psycheros/.addon-installs/` and
also checks for older backup folders. It warns when it is replacing either
standalone package, removes their markers after a successful install, and
refuses to install over Everything Together.

## Compatibility

Version 0.1.1 is tested for **Psycheros 0.8.23**. The installer refuses other
versions before changing files.

This package replaces chat/voice UI, server route, service-worker, and focused
test files. Close Psycheros and back up local source edits before installing it.

For HTF Music Listener on plain upstream Psycheros, install this combo first and the
**HTF Music Listener 0.1.2 legacy** package second. Version 0.1.0 rejects audio; update
before trying music. Do not install this upstream file-replacement package over the
Rae/Ember trusted-plugin fork, which already contains these upload features.

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
- Type a long Yin Yang message before dragging anything: the box should grow
  taller.
- Drag the right handle: width should stay at the chosen size.
- Drag the bottom or corner handle: height should stay at the chosen size and
  long text should scroll.
- Double-click a resize handle: the box should return to adaptive sizing.

Developers can run:

```powershell
deno fmt --check packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/web/js/psycheros.js packages/psycheros/web/js/voice.js packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno lint packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/web/js/psycheros.js packages/psycheros/web/js/voice.js packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno check --node-modules-dir=none packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno test -A --node-modules-dir=none packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
```

## Undo

Close Psycheros and restore the timestamped backup folder created inside
`packages\psycheros`, or update/reinstall the official source. Do not delete
Psycheros identity, memory, database, or state folders.

Official source updates replace tracked mod files. Reinstall a compatible
version of this add-on after an official update.
