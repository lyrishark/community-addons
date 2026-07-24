# HTF Music Listener 0.2.0

This is the manager-native release for Psycheros 0.10.x. It adds a durable local HTF
library, conservative synchronized-lyrics preparation and review, Windows Now Playing
timing, and a bounded per-turn sensory handoff.

The plugin now exposes its configuration through Psycheros's official plugin settings
surface and declares its community-repository update channel. With the
compatibility-safe updater, later releases are selected from this package's tag stream
only when their manifest supports the installed Psycheros version.

This release is a trusted API-v1 plugin only. The older legacy/source packages remain
available under their historical tags for the Psycheros versions they target, but they
are not rebuilt or carried forward for 0.10.

No Spotify credential is required for same-PC playback. The local Windows media session
supplies timing metadata; music and HTF evidence remain local.
