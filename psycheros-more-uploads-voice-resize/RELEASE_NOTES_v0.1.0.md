# Psycheros More Uploads + Voice Text Resize v0.1.0

Community alpha add-on for Psycheros 0.8.23.

## Added

- Multiple uploads in the main chat composer.
- Image and document attachment support for:
  `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.txt`, `.md`,
  `.csv`, `.json`, `.pdf`, `.docx`, and `.xlsx`.
- Yin Yang typed voice attachments using the same upload endpoint.
- Horizontal, vertical, and corner resize handles for the Yin Yang typed voice
  input.
- Adaptive auto-grow behavior until the user manually resizes that dimension.
- Double-click reset to return the typed voice input to adaptive sizing.
- Mixed image/file rendering in chat history.
- File marker handling that strips upload metadata from visible chat text while
  preserving raw message content for editing.
- Focused tests for parser behavior, main chat upload wiring, Yin Yang upload
  wiring, and resize wiring.

## Notes

- Verified against upstream Psycheros `0.8.23` at commit `7c40d42`; upstream
  still does not include the multi-upload voice attachment hooks or the
  resizable Yin Yang typed voice input.
- This combo exists because the standalone More Uploads and Voice Text Resize
  packages replace several of the same full UI files. Installing this package is
  the safe path when both behaviors are wanted together.
- Installers warn when replacing either standalone package, remove superseded
  install markers after a successful run, and block Everything Together mixes.
- This package intentionally does not include expression sprites or screen
  presence changes.
- The add-on includes template and service-worker cache stamps so the desktop
  app reloads updated JS/CSS after install.
- No new external dependency was added.

## Verification

Passed:

```powershell
deno fmt --check packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/web/js/psycheros.js packages/psycheros/web/js/voice.js packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno lint packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/web/js/psycheros.js packages/psycheros/web/js/voice.js packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno check --node-modules-dir=none packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
deno test -A --node-modules-dir=none packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/voice_text_resize_addon_test.ts
```

Release asset:

- `psycheros-more-uploads-voice-resize-0.1.0.zip`
