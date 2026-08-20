# Psycheros Everything Together

The complete Psycheros 0.11 community suite, split along the boundary the host
actually supports: one coherent source bridge for deep chat/voice hooks and
three ordinary plugin-manager packages for public API-v1 features.

## Compatibility

Version 0.4.0-rc.2 targets stock Psycheros 0.11.2 at upstream commit
`a1561f515fcb01327c52589b90f65595e5a0d064`. The source bridge combines the
overlapping host changes once, with exact-version and normalized-hash preflight,
timestamped backups, and refusal of unknown local edits.

## Included

Source bridge:

- Expression state, user-supplied sprites, persistence, chat display, and voice
  overlay. No character art or personalized classifier rules are bundled.
- Consent-based screen presence with transient frame captioning and a bounded
  visual-state journal.

Plugin-manager ZIPs:

- Accessibility Controls 0.1.0-rc.2.
- Windows Shell Fix 0.3.0-rc.2.
- HTF Music Listener 0.3.0-rc.2, including the cross-platform runtime selector.

This 0.4.0-rc.2 suite does not include the revived More Uploads 0.4.0-rc.1
bridge. Stock Psycheros 0.11.2 has Discord media and one-image chat, but not its
multi-attachment behavior; our earlier parity assumption was incorrect. Do not
install the standalone bridge over this suite because their guarded source
files overlap. A future suite release must merge them first. Typography, voice
resizing, and Windows shell selection remain manager plugins. The unrelated
provider-error overlay also remains excluded.

## Install

1. Fully close Psycheros.
2. Extract the suite and install its source bridge:

       .\install.ps1 -PsycherosRoot "D:\path\to\Psycheros\source"

   On macOS or Linux:

       chmod +x ./install.sh ./tools/install-source-files.sh
       ./install.sh "/path/to/Psycheros/source"

3. Restart Psycheros.
4. In Settings > Plugins > Add plugin, install each desired ZIP from the suite's
   `plugins` directory.

Psycheros 0.11 can validate each manager plugin, but it does not automatically
install a meta-package's declared dependencies. That is why the suite contains
separate ready-to-install plugin ZIPs.

## Verify

Run the focused source tests:

    deno test -A packages/psycheros/tests/expression_checkerboard_test.ts packages/psycheros/tests/expression_classifier_test.ts packages/psycheros/tests/expression_persistence_test.ts packages/psycheros/tests/expression_settings_nav_test.ts packages/psycheros/tests/expression_sprites_test.ts packages/psycheros/tests/screen_presence_test.ts

Then verify the plugin manager shows each installed plugin as active. Test a
stock multi-file message, a configured expression sprite, screen presence in
chat and voice, typography/resize controls, a Windows shell command where
applicable, and HTF listening.

## Undo

Disable or remove the manager plugins in Settings > Plugins. Close Psycheros and
restore the timestamped source backup under `.community-addon-backups`, or
reinstall official source. Do not delete identity, memory, database, or state
folders.
