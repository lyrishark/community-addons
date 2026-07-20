# Psycheros Everything Together

- Version: `0.2.0`
- Compatible with Psycheros: `0.9.2`

> **Psycheros 0.9.2 status:** Compatible. Every included source feature was
> rebased onto pristine upstream 0.9.2, then composed and tested together. This
> remains a manual source bundle; the plugin/add-on manager does not install it.

This is the combined community bundle for the upgrades that touch the same chat,
voice, and settings surfaces.

## Included

- More uploads: multiple images, documents, and common music formats in chat, with
  streamed uploads up to 512 MB.
- HTF Music Listener 0.1.3 legacy: on Windows x64, the bundle installs the complete
  local listening organ, Entity view toggle, packaged HTF worker, and verified FFmpeg
  bootstrap after applying the source files.
- Voice/Yin Yang uploads: typed voice mode can attach the same supported files.
- Resizable voice text box: drag horizontally, vertically, or from the corner;
  if you never resize it manually, it still grows with longer text.
- Accessible font controls: larger UI text and reading-friendly font presets.
- Windows shell fix: shell tool commands run through the host platform shell.
- Screen presence alpha: optional chat/voice screen context sharing.
- Expression sprites: hybrid stream-and-settle detection, sprite pack import,
  chat display, voice-call sprite display, and the bundled Ember sprite seed
  pack. The face can move naturally during long responses, then settles on one
  hidden entity-selected final expression and intensity.
- Expression reload persistence: reopening a conversation restores the final
  face that was shown instead of reclassifying old text.
- Voice expression fix: expression state from voice responses is forwarded to
  the voice overlay.

The bundle intentionally excludes the old experimental missing-response
regeneration button, voice-started auto-titling, and queued typed-turn draining.
Those changes were never part of these add-ons and are no longer carried in the
package or current documentation.

## Expression Toggle

Expressions are the one major feature someone might reasonably want off. After
installing, open `Settings > Vision > Expressions` and use the promoted
`Show Expression Display` switch as the master toggle. Sprite images and
subtitle controls are detail settings below that switch.

## Install

Quit Psycheros fully first.

On Windows PowerShell:

```powershell
.\install.ps1 -PsycherosRoot "C:\path\to\Psycheros\source"
```

On macOS/Linux:

```bash
./install.sh "/path/to/Psycheros/source"
```

If the installer can find exactly one compatible Psycheros `0.9.2` source
folder, the path argument can be omitted. Existing files are backed up under
`packages/psycheros/_everything_together_backup_<timestamp>`.

The installer records a marker in `packages/psycheros/.addon-installs/` and also
checks for older backup folders. It warns when replacing More Uploads, Voice
Text Resize, or their combo package, then removes those narrower markers after a
successful install. Reinstalling Everything Together over itself is allowed.

## Dependency Note

This bundle adds `pngjs` through `packages/psycheros/deno.json` and `deno.lock`.
It is used only for optional PNG checkerboard cleanup when importing expression
sprites with fake baked-in transparency backgrounds.

The HTF listening organ is currently bundled only in the Windows x64 release. The
macOS/Linux installer still applies the other source features, including music file
types, but does not claim to provide the compiled listener runtime.

## Music-listener compatibility

Everything Together 0.2.0 already includes both layers required on plain
Psycheros: music-capable uploads and HTF Music Listener 0.1.3 legacy. Do not install
standalone More Uploads, the upload/resize combo, or another HTF listener over it.

This bundle targets plain upstream Psycheros 0.9.2. Do not install it over the
Rae/Ember trusted-plugin fork; that fork already contains the merged source features
and should use the normal HTF plugin package instead.

## Undo

On Windows x64, remove the bundled listening organ first by running
`bundled\htf-music-listener\tools\Uninstall-Legacy.ps1`. Then restore the source
backup named by the installer, or update Psycheros from a clean upstream checkout.
The music listener's uninstall preserves generated HTF bundles unless explicitly
asked to remove them.

## Verification

Run from `packages/psycheros` after installation if you want to verify the
source tree:

```bash
deno check src/server/server.ts src/entity/loop.ts src/db/client.ts src/db/schema.ts src/voice/pipeline.ts src/voice/session-manager.ts tests/expression_sprites_test.ts tests/expression_persistence_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts
deno lint src/server/routes.ts src/server/templates.ts src/db/client.ts src/db/schema.ts src/voice/pipeline.ts src/voice/session-manager.ts tests/expression_sprites_test.ts tests/expression_persistence_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts
deno test -A tests/expression_sprites_test.ts tests/expression_persistence_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts tests/screen_presence_test.ts tests/llm_errors_test.ts
```
