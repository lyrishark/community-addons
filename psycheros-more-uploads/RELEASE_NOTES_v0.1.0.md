# Psycheros More Uploads v0.1.0

Community alpha add-on for Psycheros 0.8.23.

## Added

- Multiple uploads in the main chat composer.
- Image and document attachment support for:
  `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.svg`, `.txt`, `.md`,
  `.csv`, `.json`, `.pdf`, `.docx`, and `.xlsx`.
- Yin Yang typed voice attachments using the same upload endpoint.
- Mixed image/file rendering in chat history.
- File marker handling that strips upload metadata from visible chat text while
  preserving raw message content for editing.
- Focused tests for parser behavior, main chat upload wiring, and Yin Yang
  upload wiring.

## Notes

- Verified against upstream Psycheros `0.8.23` at commit `7c40d42`; upstream
  still has only the original single-image chat attachment path, so this add-on
  is not duplicating an already-shipped upstream feature.
- This package intentionally does not include the resizable voice text box,
  expression sprites, or screen presence changes.
- The add-on includes a service-worker cache stamp so the desktop app reloads
  updated JS/CSS after install.

## Verification

Passed:

```powershell
deno test -A --node-modules-dir=none packages/psycheros/tests/chat_attachments_test.ts
deno check --node-modules-dir=none packages/psycheros/src/server/routes.ts packages/psycheros/src/server/templates.ts packages/psycheros/src/server/chat-attachments.ts packages/psycheros/src/voice/session-manager.ts packages/psycheros/tests/chat_attachments_test.ts
```

Release asset:

- `psycheros-more-uploads-0.1.0.zip`

