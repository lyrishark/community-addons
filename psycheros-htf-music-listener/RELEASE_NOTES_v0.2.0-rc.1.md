# HTF Music Listener 0.2.0-rc.1

This preview adds the first complete shared-listening path: a durable local HTF library,
conservative synchronized-lyrics preparation and review, Windows Now Playing timing, and
a bounded per-turn sensory handoff.

It is intentionally an RC for Rae/Ember testing before a public 0.2.0 release. The
normal trusted-plugin package contains the new background organ. The legacy package
remains a one-off upload listener for older Psycheros builds and does not gain shared
Now Playing.

No Spotify credential is required for same-PC playback. Cross-device Spotify tracking is
not part of this RC; the local Windows media session must expose the current track and
clock.
