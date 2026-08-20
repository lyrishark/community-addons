# Psycheros More Uploads

A guarded Psycheros 0.11.2 source bridge for multiple chat and Yin Yang typed
voice attachments.

## Compatibility

Version 0.4.0-rc.1 is rebuilt and tested against stock Psycheros 0.11.2. It is
not compatible with older or locally modified source trees.

Psycheros 0.11 added native Discord media and a stock single-image chat path,
but its main and typed-voice composers still keep one attachment at a time.
This bridge preserves those upstream media paths while restoring the missing
multi-attachment state, request, persistence, and rendering seams. Those seams
are not exposed through plugin API v2, so this remains a guarded source bridge.

The installer verifies Psycheros 0.11.2 and the normalized SHA-256 of every
stock file it replaces before writing. It accepts pristine stock files or its
own identical payload, creates timestamped backups, and refuses unknown local
edits before changing anything.

## What it adds

- Multiple attachments in the main chat composer.
- Images, text and office documents, PDF, JSON, and common audio formats.
- Streaming upload bodies with a 512 MB per-file limit.
- File attachments in Yin Yang typed voice mode.
- Image, audio-player, and file-chip rendering in chat history.
- Extractable document text in the model turn where supported.
- Drag-and-drop and pasted-file handling on both typed surfaces.

It does not include accessibility controls, expression sprites, or screen
presence.

## Install on Windows

1. Fully close Psycheros.
2. Extract the release ZIP.
3. Open PowerShell in the extracted directory.
4. Run:

    Set-ExecutionPolicy -Scope Process Bypass
    .\install.ps1 -PsycherosRoot "D:\path\to\Psycheros"

## Install on macOS or Linux

    chmod +x ./install.sh ./tools/install-source-files.sh
    ./install.sh "/path/to/Psycheros/source"

## Verify

From packages/psycheros in the patched source:

    deno fmt --check src/server/chat-attachments.ts tests/chat_attachments_test.ts
    deno check src/server/routes.ts src/server/templates.ts src/server/chat-attachments.ts src/voice/session-manager.ts
    deno test -A --node-modules-dir=none tests/chat_attachments_test.ts

Then attach two images, a document, and an audio file in ordinary chat, and
attach a file from Yin Yang typed voice mode.

Do not install this source bridge together with Expression Sprites, Screen
Presence, or Everything Together: those packages replace overlapping host
files. A future combined-suite release must merge the implementations first.

## Undo

Close Psycheros and restore the timestamped backup under
`packages/psycheros/.community-addon-backups`. Updating or reinstalling
official Psycheros source also restores stock files.
