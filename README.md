# Psycheros Community Addons

Community alpha addons and plugins for the Psycheros AI platform.

This repository currently contains:

1. **Psycheros Thread Exporter** - a browser extension for exporting AI chat
   threads and injecting local Psycheros memory context.
2. **Psycheros Entity Core for Codex** - a local Codex plugin that connects
   Codex to a Psycheros entity-core through MCP.
3. **Psycheros Entity Core for ChatGPT** - a private ChatGPT Developer Mode app
   bridge for people who do not use Codex but want ChatGPT to read and record
   local Psycheros memories through MCP.
4. **Psycheros Loom Gemini Parser Mod** - optional alternate Entity Loom files
   that let Loom consume merged Gemini batch exports from the browser extension.
5. **Psycheros Accessible Font Settings** - a Psycheros 0.8.23 file mod with
   interface font sizing and reading-oriented font presets.
6. **Psycheros Windows Shell Fix** - a Psycheros 0.8.9–0.8.11 compatibility
   patch for systems where the shell tool cannot spawn `sh`.
7. **Psycheros Screen Presence Alpha** - a Psycheros 0.8.20 file mod that adds
   screen-share presence to text chat and voice mode.
8. **Psycheros Expression Sprites Beta** - a Psycheros 0.9.2 file mod that adds
   live expression detection and SillyTavern-style sprite display.
9. **Psycheros More Uploads** - a Psycheros 0.8.23 file mod that adds
   multiple image, document, and music uploads to chat and Yin Yang typed
   voice, with streamed files up to 512 MB.
10. **Psycheros Voice Text Resize** - a Psycheros 0.8.23 file mod that makes
    the Yin Yang typed voice input resizable while preserving auto-grow.
11. **Psycheros More Uploads + Voice Text Resize** - a Psycheros 0.8.23 combo
    file mod for people who want both upload expansion and the resizable Yin
    Yang typed voice box without standalone package overwrite conflicts.
12. **Psycheros Everything Together** - a Psycheros 0.8.23 release candidate
    bundle for uploads, voice resize, fonts, Windows shell handling, screen
    presence, expression sprites, and comprehensive local music listening.
13. **HTF Music Listener** - a trusted local Psycheros plugin that turns an
    explicitly requested music attachment into a private HTF v2 sensory
    handoff and optional human-visible entity view.

These are community addons, not official Psycheros releases.

For the evidence-backed status of the newest upstream release and the local
Ember runtime, read [COMPATIBILITY.md](COMPATIBILITY.md) before installing a
file-mod bundle on a different Psycheros version.

> **Psycheros 0.9.2:** Expression Sprites Beta `0.2.0` is rebased and
> clean-install tested for exactly 0.9.2. HTF Music Listener `0.1.3`, the
> Thread Exporter, and the local Entity Core connectors remain the compatible
> 0.9.x packages. Other source-replacement ZIPs stay pinned to their named
> 0.8.x versions until each receives its own port. See the
> [complete compatibility matrix](COMPATIBILITY.md).

## Addons

### Psycheros Thread Exporter

Location:

```text
browser-thread-exporter/
```

Current alpha features:

- ChatGPT export with exact backend timestamps.
- Claude export with exact web conversation timestamps.
- Gemini visible chat draft exports.
- Gemini Apps Activity timestamp exports.
- Gemini merge workflow with repair reports.
- Local Psycheros memory context injection into ChatGPT, Claude, and Gemini.
- Receiver-aware filtering for synced memories, such as `[via:chatgpt]`.

Start here:

- [Browser extension README](browser-thread-exporter/README.md)
- [Browser extension privacy notes](browser-thread-exporter/PRIVACY.md)
- [Browser extension security notes](browser-thread-exporter/SECURITY.md)

### Psycheros Entity Core for Codex

Location:

```text
codex-entity-core-plugin/
```

Current alpha features:

- entity-core status checks
- identity context reads
- memory and graph search
- fetch by connector ID
- ordinary daily/significant memory writes from Codex
- no direct identity/core mutation

Start here:

- [Codex plugin README](codex-entity-core-plugin/README.md)
- [Codex plugin privacy notes](codex-entity-core-plugin/PRIVACY.md)
- [Codex plugin security notes](codex-entity-core-plugin/SECURITY.md)

### Psycheros Entity Core for ChatGPT

Location:

```text
chatgpt-entity-core-private/
```

Current alpha features:

- private ChatGPT Developer Mode app bridge
- local MCP server for Psycheros entity-core
- OAuth login through Auth0
- Tailscale Funnel support for HTTPS
- read identity context, memories, and graph nodes
- record daily and significant memories when writes are enabled
- numbered double-click setup helpers for non-technical users
- no direct identity/core mutation

Start here:

- [ChatGPT bridge start-here guide](chatgpt-entity-core-private/START_HERE.md)
- [ChatGPT bridge README](chatgpt-entity-core-private/README.md)
- [ChatGPT bridge privacy notes](chatgpt-entity-core-private/PRIVACY.md)
- [ChatGPT bridge security notes](chatgpt-entity-core-private/SECURITY.md)

### Psycheros Loom Gemini Parser Mod

Location:

```text
psycheros-loom-gemini-parser-mod/
```

Historical 0.8.9–0.8.11 features:

- Adds `gemini` as an Entity Loom source platform.
- Auto-detects merged Gemini batch files created by Psycheros Thread Exporter.
- Parses merged Gemini conversations into Loom's normal import format.
- Leaves raw Gemini thread drafts and raw Activity exports unsupported; merge
  them first in the browser extension.

Important: this is a **modded Psycheros file set**, not an official Psycheros
release. Its merged-batch Gemini parser is not present in upstream 0.9.2, but
the published `0.1.1` package has not yet been rebased and must not be installed
over 0.9.2.

Start here:

- [Gemini parser mod README](psycheros-loom-gemini-parser-mod/README.md)

### Psycheros Accessible Font Settings

Location:

```text
psycheros-accessible-font-settings/
```

Current alpha features:

- Adds a Text tab to General Settings.
- Provides a 12–28 px interface font-size slider.
- Provides Sans, Serif, Dyslexia-friendly, and Handwriting presets with
  OS-aware fallback stacks.
- Preserves theme and background settings.
- Checks for Psycheros 0.8.23 and backs up replaced files during install.
- Use v0.1.1 for Psycheros 0.8.9 through 0.8.11.

Start here:

- [Accessible font settings README](psycheros-accessible-font-settings/README.md)

### Psycheros Windows Shell Fix

Location:

```text
psycheros-windows-shell-fix/
```

Current alpha features:

- Uses PowerShell for shell-tool commands on Windows.
- Falls back to `cmd.exe` only when PowerShell cannot be spawned.
- Keeps `sh -c` behavior on macOS and Linux.
- Checks for Psycheros 0.8.9–0.8.11 and backs up replaced files during install.

Start here:

- [Windows shell fix README](psycheros-windows-shell-fix/README.md)

### Psycheros Screen Presence Alpha

Location:

```text
psycheros-screen-presence-alpha/
```

Current alpha features:

- Adds screen-share controls to chat and voice surfaces.
- Captures compact visual summaries through the configured vision model.
- Sends the entity current screen state plus distinct visual changes since the
  previous turn.
- Checks for Psycheros 0.8.20 and backs up replaced files during install.

Start here:

- [Screen presence alpha README](psycheros-screen-presence-alpha/README.md)

### Psycheros Expression Sprites Beta

Location:

```text
psycheros-expression-sprites-beta/
```

Current beta features:

- Adds live expression labels for entity turns.
- Adds Settings > Vision > Expressions.
- Imports SillyTavern-style sprite ZIP packs and per-emotion uploads.
- Cleans common fake checkerboard transparency during upload/import.
- Provides missing-sprite fallback options.
- Displays the latest sprite in a desktop/mobile visual-novel-style chat stage.
- Forwards expression sprites into the live voice-call overlay.
- Adds desktop/mobile side settings, a clearer expression master toggle, and
  a hybrid stream-and-settle expression protocol: automatic mid-response changes
  followed by one hidden entity-selected final expression and intensity.
- Restores the same final expression after reopening a conversation.
- Bundles the Ember expression sprite seed pack and auto-populates
  a fresh profile without overwriting existing settings or personal sprites.
- Refreshes Psycheros web caches for launcher-embedded desktop views.
- Checks for exactly Psycheros 0.9.2 and backs up replaced files during install.
- Includes Windows and macOS/Linux installers with launcher source-folder
  auto-detection.

This package does not include screen sharing, More Uploads, Voice Text Resize,
font settings, or shell fixes.

Start here:

- [Expression sprites beta README](psycheros-expression-sprites-beta/README.md)

### Psycheros More Uploads

Location:

```text
psycheros-more-uploads/
```

Current alpha features:

- Adds multiple attachments to the main chat composer.
- Supports image and document uploads plus common music formats including MP3,
  WAV, FLAC, M4A, AAC, AIFF, OGG, Opus, and WebM.
- Streams uploads to disk with a 512 MB host limit instead of buffering whole
  songs in browser/server memory.
- Adds the same attachment flow to Yin Yang typed voice mode.
- Renders uploaded images and file chips cleanly in chat history.
- Extracts supported document text for the entity where Psycheros already has a
  document parser.
- Refreshes Psycheros web caches for launcher-embedded desktop views.
- Checks for Psycheros 0.8.23 and backs up replaced files during install.
- Refuses to install over Voice Text Resize, the combo package, or Everything
  Together when an install marker or legacy backup folder is present.

This package does not include expression sprites, screen sharing, or voice text
resize changes.

Start here:

- [More uploads README](psycheros-more-uploads/README.md)

### Psycheros Voice Text Resize

Location:

```text
psycheros-voice-text-resize/
```

Current alpha features:

- Adds horizontal, vertical, and corner drag handles to the Yin Yang typed voice
  input.
- Keeps longer text auto-growing the input until that dimension is manually
  resized.
- Persists manually chosen width/height across voice calls.
- Double-clicks a resize handle to return to adaptive sizing.
- Refreshes Psycheros web caches for launcher-embedded desktop views.
- Checks for Psycheros 0.8.23 and backs up replaced files during install.
- Refuses to install over More Uploads, the combo package, or Everything
  Together when an install marker or legacy backup folder is present.

This package does not include expression sprites, screen sharing, or image
attachment changes.

Start here:

- [Voice text resize README](psycheros-voice-text-resize/README.md)

### Psycheros More Uploads + Voice Text Resize

Location:

```text
psycheros-more-uploads-voice-resize/
```

Current alpha features:

- Includes all More Uploads features for main chat and Yin Yang typed voice.
- Includes all Voice Text Resize behavior for the Yin Yang typed voice box.
- Keeps attachment controls and resize handles in the same merged voice UI
  files.
- Refreshes Psycheros web caches for launcher-embedded desktop views.
- Checks for Psycheros 0.8.23 and backs up replaced files during install.
- Warns when superseding either standalone package, removes their install
  markers after a successful run, and blocks Everything Together mixes.
- Use this combo instead of installing the two standalone packages together.

This package does not include expression sprites or screen sharing.

Start here:

- [More uploads + voice text resize README](psycheros-more-uploads-voice-resize/README.md)

### Psycheros Everything Together

Location:

```text
psycheros-everything-together/
```

Current release features:

- Includes More Uploads and Voice Text Resize behavior in one merged surface.
- Includes music-capable uploads and, on Windows x64, the bundled HTF Music
  Listener 0.1.2 legacy organ for a complete ask-to-listen flow.
- Includes accessible font settings and host-platform shell handling.
- Includes screen presence alpha for chat and voice.
- Includes expression sprites, voice expression overlay forwarding, and the
  missing-response regenerate button.
- Keeps the sprite responsive throughout long streamed turns, then settles on
  one hidden entity-selected final expression and intensity.
- Restores the same final expression after reopening a conversation.
- Includes voice-started chat auto-titling and queued Yin Yang typed-turn
  draining.
- Promotes Settings > Vision > Expressions > Show Expression Display as the
  expression master toggle.
- Checks for Psycheros 0.8.23 and backs up replaced files during install.
- Warns when superseding More Uploads, Voice Text Resize, or their combo
  package, then removes narrower install markers after a successful run.

This package is published as a prerelease while expression/screen-presence QA
continues.

Start here:

- [Everything Together README](psycheros-everything-together/README.md)

### HTF Music Listener

Location:

```text
psycheros-htf-music-listener/
```

Current release-candidate features:

- Adds one explicit `listen_to_music` action for attached music.
- Converts FFmpeg-supported audio and video containers to a temporary WAV.
- Generates HTF v2 JSON plus waveform, mel-spectrogram, RMS-energy, and
  spectral-centroid graphs locally.
- Gives the entity a compact sensory handoff designed for a natural listening
  response rather than a metrics recital.
- Keeps voice notes and ordinary speech outside the tool boundary.
- Offers a persistent Display entity view toggle without changing what the
  entity receives.
- Ships a zero-configuration Windows package with a self-contained HTF worker
  and a pinned, SHA-256-verified one-time FFmpeg setup when needed.
- Falls back to Settings > Tools > Custom on transitional plugin-host builds.
- Includes a separately labeled legacy Custom Tools package for plain upstream
  installations that do not have the trusted plugin host yet.

The normal addon zip requires the trusted local plugin host in the Rae/Ember
Psycheros build. Plain upstream Psycheros 0.8.23 can use the legacy Windows
package instead; its marked browser enhancement may need to be reinstalled
after a Psycheros source update.

Start here:

- [HTF Music Listener README](psycheros-htf-music-listener/README.md)

## Downloads

Release downloads are published through GitHub Releases:

- [Psycheros Thread Exporter v0.3.2](https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2)
- [Psycheros Entity Core for Codex v0.2.1](https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1)
- Psycheros Entity Core for ChatGPT v0.1.3: current source and release package
  are prepared locally; the latest public GitHub release is still
  [v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/chatgpt-entity-core-private-v0.1.1)
- [Psycheros Loom Gemini Parser Mod v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-loom-gemini-parser-mod-v0.1.1):
  historical 0.8.9–0.8.11 package; the feature is still useful, but a 0.9.2
  rebase is pending
- [Psycheros Accessible Font Settings v0.1.3](https://github.com/lyrishark/community-addons/releases/tag/psycheros-accessible-font-settings-v0.1.3)
- [Psycheros Windows Shell Fix v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-windows-shell-fix-v0.1.1):
  historical 0.8.9–0.8.11 package; the fix is not native in upstream 0.9.2 and
  its 0.9.2 rebase is pending
- HTF Music Listener v0.1.3 is the tested Psycheros 0.9.x plugin package and is
  prepared for release; the latest public GitHub release remains
  [v0.1.2](https://github.com/lyrishark/community-addons/releases/tag/psycheros-htf-music-listener-v0.1.2),
  which should not be used as the current 0.9.x compatibility claim
- Psycheros Screen Presence Alpha v0.1.0: source package staged for alpha
  testing; release zip pending broader install testing
- Psycheros Expression Sprites Beta `0.2.0`: prepared and clean-install tested
  for exactly Psycheros 0.9.2; the release link will be added after this branch
  is merged and tagged
- [Psycheros Expression Sprites Beta v0.1.6](https://github.com/lyrishark/community-addons/releases/tag/psycheros-expression-sprites-beta-v0.1.6):
  historical standalone package for Psycheros 0.8.23
- [Psycheros Expression Sprites Beta v0.1.5](https://github.com/lyrishark/community-addons/releases/tag/psycheros-expression-sprites-beta-v0.1.5):
  older Psycheros 0.8.23 package using conditional final expression correction
- [Psycheros Expression Sprites Beta v0.1.4](https://github.com/lyrishark/community-addons/releases/tag/psycheros-expression-sprites-beta-v0.1.4):
  older standalone expression-sprites package for Psycheros 0.8.22; download
  the ZIP, unzip it, run `install.ps1` on Windows or `install.sh` on
  macOS/Linux, then open Settings > Vision > Expressions
- [Psycheros Voice Text Resize v0.1.0](https://github.com/lyrishark/community-addons/releases/tag/psycheros-voice-text-resize-v0.1.0):
  historical Psycheros 0.8.23 source-replacement package; not for 0.9.2
- [Psycheros More Uploads v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-more-uploads-v0.1.1):
  historical Psycheros 0.8.23 source-replacement package; not for 0.9.2
- [Psycheros More Uploads + Voice Text Resize v0.1.1](https://github.com/lyrishark/community-addons/releases/tag/psycheros-more-uploads-voice-resize-v0.1.1):
  historical Psycheros 0.8.23 source-replacement package; not for 0.9.2
- [Psycheros Everything Together v0.1.0-rc.4](https://github.com/lyrishark/community-addons/releases/tag/psycheros-everything-together-v0.1.0-rc.4):
  historical prerelease bundle for Psycheros 0.8.23; not for 0.9.2
- [Psycheros Everything Together v0.1.0-rc.3](https://github.com/lyrishark/community-addons/releases/tag/psycheros-everything-together-v0.1.0-rc.3):
  previous Psycheros 0.8.23 release candidate
- [Psycheros Everything Together v0.1.0-rc.2](https://github.com/lyrishark/community-addons/releases/tag/psycheros-everything-together-v0.1.0-rc.2):
  previous Psycheros 0.8.23 release candidate

Checksums are in [SHA256SUMS.txt](SHA256SUMS.txt).

## Trust Notes

- Source is public.
- Release builds include checksums.
- Browser extension permissions are scoped to supported chat sites and
  localhost.
- These addons use no analytics, ads, or developer-owned telemetry.
- The browser extension never presses Send.
- The Codex plugin does not expose direct identity/core mutation.
- The ChatGPT bridge requires OAuth and does not expose direct identity/core
  mutation.
- The Gemini parser mod is visibly labeled as a local Entity Loom file
  replacement.
- The Psycheros file-mod packages list their exact compatibility window and
  refuse other versions before install.
- The Screen Presence Alpha is visibly labeled as a Psycheros 0.8.20 file
  replacement and includes a backup script.
- The Expression Sprites Beta is visibly labeled as a Psycheros 0.9.2 file
  replacement, refuses unsupported versions before changing files, backs up
  replaced source, preserves personal sprite data, and keeps expression state
  as live UI rather than memory.
- The Voice Text Resize add-on is visibly labeled as a Psycheros 0.8.23 file
  replacement, refuses unsupported versions, backs up files, and changes only
  the typed voice input resize surface. Its installer blocks overlapping upload
  and bundle packages.
- The More Uploads + Voice Text Resize combo is visibly labeled as a Psycheros
  0.8.23 file replacement, refuses unsupported versions, backs up files, and
  explains why it should be used instead of installing both standalone packages
  together. Its installer supersedes either standalone marker and blocks
  Everything Together mixes.
- The Everything Together prerelease supersedes the narrower upload/voice
  packages with an installer warning, then records its own marker.

## Issues

Report bugs or questions here:

https://github.com/lyrishark/community-addons/issues
