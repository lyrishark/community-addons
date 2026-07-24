# Everything Together 0.3.0-rc.1

- Rebuilt the overlapping uploads, expression, and screen-presence source
  features together on stock Psycheros 0.10.0.
- Moved typography, voice resizing, Windows shell selection, and HTF listening
  to manager-native API-v1 plugins.
- Removed bundled character art, personalized lexical rules, unrelated provider
  error changes, and obsolete workflow guidance.
- Added exact-version/hash preflight, timestamped backups, and atomic refusal of
  unknown local edits.
- Verified 42 combined source tests, Deno formatting/type checks, and JavaScript
  syntax.

The suite contains one source bridge and three plugin-manager ZIPs because
Psycheros 0.10 does not auto-install dependencies from a meta-plugin.
