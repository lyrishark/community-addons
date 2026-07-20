# Psycheros Expression Sprites Beta v0.2.0

Psycheros 0.9.2 compatibility release.

## What changed

- Rebased the complete expression-sprite feature onto pristine upstream
  Psycheros 0.9.2.
- Preserved 0.9.2 message metadata while adding expression-state persistence.
- Updated chat, settings, service-worker, and voice-call integration for the
  current server and web surfaces.
- Kept hidden expression directives out of displayed, persisted, and
  tool-iteration content.
- Preserved existing expression settings and personal sprite files. The
  bundled Ember starter pack seeds only a brand-new expression profile.
- Removed an unrelated assistant-response regeneration implementation that had
  traveled in the old development history; it is not part of this package.
- Refreshed the web asset/cache stamp to `expression-sprites-beta-0.2.0`.

## Compatibility

This package installs only on Psycheros 0.9.2 and refuses other versions before
changing files. It remains a guarded source-replacement package and creates a
timestamped backup before installation.

Use v0.1.6 for Psycheros 0.8.23 or v0.1.4 for Psycheros 0.8.22.
