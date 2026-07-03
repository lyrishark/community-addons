# Psycheros Expression Sprites Beta v0.1.5

Current standalone expression-sprites package for Psycheros 0.8.23.

## What changed

- Rebased the Expression Sprites Beta payload onto Psycheros 0.8.23.
- Adds the voice-call expression overlay fix, so expression state emitted during
  voice turns reaches the browser and can render configured sprites in the live
  voice window.
- Promotes Settings > Vision > Expressions > Show Expression Display into a
  clearer master toggle above the sprite-specific settings.
- Refreshes the add-on web asset stamp to `expression-sprites-beta-0.1.5` so
  embedded launcher/webview caches pick up the updated UI.
- Keeps this package expression-only. It does not include More Uploads, Voice
  Text Resize, screen presence, accessible font settings, or shell fixes.

## Compatibility

This package checks for Psycheros 0.8.23 and refuses other versions before
install. Use v0.1.4 for Psycheros 0.8.22.

Official Psycheros updates can replace modded source files. After updating
Psycheros, reinstall the expression-sprites package that matches the installed
Psycheros version.

## Verification

- `deno fmt --check` on the affected TypeScript/test files.
- `deno lint` on the affected TypeScript/test files.
- `deno check` on the affected server/entity/voice/test entry points.
- `deno test -A` for the expression sprite, checkerboard, classifier, and
  settings navigation tests.
- `node --check` for `web/js/psycheros.js` and `web/js/voice.js`.

## Dependency note

No new external dependency was added in this release. The existing `pngjs`
dependency is still used by the checkerboard-cleanup upload path.
