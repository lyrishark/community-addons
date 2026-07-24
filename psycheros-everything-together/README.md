# Psycheros Everything Together

The complete Psycheros 0.10 community suite, split along the boundary the host
actually supports: one coherent source bridge for deep chat/voice hooks and
three ordinary plugin-manager packages for public API-v1 features.

## Compatibility

Version 0.3.0-rc.1 targets stock Psycheros 0.10.0. The source bridge combines
the overlapping host changes once, with exact-version and normalized-hash
preflight, timestamped backups, and refusal of unknown local edits.

## Included

Source bridge:

- Multiple image, document, and audio attachments in chat and typed voice.
- Expression state, user-supplied sprites, persistence, chat display, and voice
  overlay. No character art or personalized classifier rules are bundled.
- Consent-based screen presence with transient frame captioning and a bounded
  visual-state journal.

Plugin-manager ZIPs:

- Accessibility Controls 0.1.0-rc.1.
- Windows Shell Fix 0.3.0-rc.1.
- HTF Music Listener 0.2.0.

The old source overlays for typography, voice resizing, and Windows shell
selection are gone because API v1 now supports those features cleanly. The
unrelated provider-error overlay is also removed.

## Install

1. Fully close Psycheros.
2. Extract the suite and install its source bridge:

       .\install.ps1 -PsycherosRoot "D:\path\to\Psycheros\source"

   On macOS or Linux:

       chmod +x ./install.sh ./tools/install-source-files.sh
       ./install.sh "/path/to/Psycheros/source"

3. Restart Psycheros.
4. In Settings > Plugins > Add plugin, install each desired ZIP from the
   suite's `plugins` directory.

Psycheros 0.10 can validate each manager plugin, but it does not automatically
install a meta-package's declared dependencies. That is why the suite contains
separate ready-to-install plugin ZIPs.

## Verify

Run the focused source tests:

    deno test -A packages/psycheros/tests/chat_attachments_test.ts packages/psycheros/tests/expression_checkerboard_test.ts packages/psycheros/tests/expression_classifier_test.ts packages/psycheros/tests/expression_persistence_test.ts packages/psycheros/tests/expression_settings_nav_test.ts packages/psycheros/tests/expression_sprites_test.ts packages/psycheros/tests/screen_presence_test.ts

Then verify the plugin manager shows each installed plugin as active. Test a
multi-file message, a typed-voice attachment, a configured expression sprite,
screen presence in chat and voice, typography/resize controls, a Windows shell
command where applicable, and HTF listening.

## Undo

Disable or remove the manager plugins in Settings > Plugins. Close Psycheros
and restore the timestamped source backup under `.community-addon-backups`, or
reinstall official source. Do not delete identity, memory, database, or state
folders.
