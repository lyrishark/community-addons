# Psycheros Everything Together v0.1.0-rc.1

Status: release candidate prerelease.  
Target Psycheros: `0.8.23`.

## What Changed

- Combined the upload, voice resize, font, Windows shell, screen presence, and
  expression sprite addon work into one installable package.
- Added multi-image and document uploads to chat and Yin Yang typed voice mode.
- Kept the voice text box adaptive by default, with manual drag resize when the
  user wants a fixed width or height.
- Promoted `Show Expression Display` in Vision settings so expression sprites
  have an obvious master toggle.
- Forwarded expression state through voice sessions so voice replies can update
  the voice overlay sprite stage.
- Added the missing-response regenerate button for latest user messages with no
  assistant reply.
- Kept Mac voice capture on the native mic-capture path while Windows/Linux use
  browser `getUserMedia` fallback instead of hitting the Mac-only Tauri ACL.
- Removed `/` from the service worker pre-cache so WebView does not keep a stale
  app shell after addon updates.

## External Dependency

- Added `pngjs` for optional expression sprite checkerboard cleanup. The core
  expression display path does not depend on image rewriting; this dependency is
  used only when cleaning fake PNG transparency backgrounds during sprite import.

## Verification Run

- `deno fmt --check` passed for affected source, test, web, and package files.
- `deno lint` passed for affected TypeScript source and tests.
- `deno check` passed for server, entity, voice, and addon test entry points.
- Focused tests passed: `63 passed | 0 failed`.
- Windows installer smoke test patched all 42 payload files into a disposable
  Psycheros `0.8.23` mock source folder and created the expected backup folder.

## Upstream Check

Upstream `PsycherosAI/Psycheros` `origin/main` was refreshed before packaging
and still points at `psycheros-v0.8.23` (`7c40d4298a5650eadcda5e3c5af8f11a5c69e913`).
The upstream files did not contain the bundle feature markers checked during
packaging.
