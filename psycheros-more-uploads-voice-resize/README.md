# More Uploads + Voice Text Controls

A Psycheros 0.10 release suite combining expanded chat/voice attachments with
plugin-managed typography and resizable Yin Yang text controls.

## Compatibility

Version 0.3.0-rc.1 targets stock Psycheros 0.10.0. The attachment layer remains
a guarded source bridge because API v1 does not expose multimodal turn,
attachment persistence, or message-rendering hooks. Voice resizing and font
controls are now provided by the manager-native Accessibility Controls plugin.

## Included

- Multiple image, document, and common audio attachments in chat.
- The same attachments in typed Yin Yang voice mode.
- Streamed uploads up to 512 MB and local document-text extraction.
- A plugin-manager ZIP for persistent typography controls and resizable voice
  text input.

## Install

1. Fully close Psycheros.
2. Install the source bridge from the extracted suite:

       .\install.ps1 -PsycherosRoot "D:\path\to\Psycheros\source"

   On macOS or Linux:

       chmod +x ./install.sh ./tools/install-source-files.sh
       ./install.sh "/path/to/Psycheros/source"

3. Restart Psycheros.
4. Open Settings > Plugins > Add plugin and select the included
   `psycheros-accessibility-controls-0.1.0-rc.1.zip`.

The source installer checks the exact 0.10.0 version and normalized hashes of
stock files, makes timestamped backups, and refuses unknown local edits.

## Verify

- Attach multiple images, a document, and an audio file in chat.
- Attach a file in typed Yin Yang mode.
- Resize the Yin Yang text box, double-click its handle to reset, and change the
  typography setting added by Accessibility Controls.

Developers can run the attachment tests in the patched source and the plugin
tests from the standalone `psycheros-accessibility-controls` package.

## Undo

Disable or remove Accessibility Controls in the plugin manager. Close Psycheros
and restore the timestamped source backup under
`packages/psycheros/.community-addon-backups`, or reinstall official source.
