# Psycheros Everything Together

Release candidate: `0.1.0-rc.1`  
Compatible with Psycheros: `0.8.23`

This is the combined community bundle for the upgrades that touch the same chat,
voice, and settings surfaces. It is published as a release candidate so it can
be tested before a stable release.

## Included

- More uploads: multiple images plus supported non-image files in chat.
- Voice/Yin Yang uploads: typed voice mode can attach the same supported files.
- Resizable voice text box: drag horizontally, vertically, or from the corner;
  if you never resize it manually, it still grows with longer text.
- Accessible font controls: larger UI text and reading-friendly font presets.
- Windows shell fix: shell tool commands run through the host platform shell.
- Screen presence alpha: optional chat/voice screen context sharing.
- Expression sprites: expression detection, sprite pack import, chat display,
  and voice-call sprite display.
- Missing assistant turn recovery: latest user-only message can regenerate a
  missing response.
- Voice expression fix: expression state from voice responses is forwarded to
  the voice overlay.

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

If the installer can find exactly one compatible Psycheros `0.8.23` source
folder, the path argument can be omitted. Existing files are backed up under
`packages/psycheros/_everything_together_backup_<timestamp>`.

## Dependency Note

This bundle adds `pngjs` through `packages/psycheros/deno.json` and `deno.lock`.
It is used only for optional PNG checkerboard cleanup when importing expression
sprites with fake baked-in transparency backgrounds.

## Verification

Run from `packages/psycheros` after installation if you want to verify the
source tree:

```bash
deno check src/server/server.ts src/entity/loop.ts src/voice/pipeline.ts src/voice/session-manager.ts tests/expression_sprites_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts
deno lint src/server/routes.ts src/server/templates.ts src/voice/pipeline.ts src/voice/session-manager.ts tests/expression_sprites_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts
deno test -A tests/expression_sprites_test.ts tests/expression_checkerboard_test.ts tests/expression_classifier_test.ts tests/expression_settings_nav_test.ts tests/chat_attachments_test.ts tests/voice_text_resize_addon_test.ts tests/shell_tool_test.ts tests/theme_test.ts tests/screen_presence_test.ts tests/llm_errors_test.ts
```
