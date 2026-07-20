# HTF Music Listener 0.1.3

This is the compatibility release for Psycheros 0.9.x.

- The normal trusted-plugin package now declares `>=0.8.23 <0.10.0` and was
  validated against the official Psycheros 0.9.0 plugin API and manager.
- Its runtime surface is unchanged: one `listen_to_music` tool, four local API
  routes, one browser script, and one stylesheet.
- The plugin loaded active and non-degraded beside Saikiros Vision Capture in
  both an isolated manager test and Rae/Ember's live Psycheros 0.9.0 runtime.
- The legacy Windows package remains for stock Psycheros 0.8.23 only. Do not
  install that source-patch package over Psycheros 0.9.x.

Use the normal `psycheros-htf-music-listener-0.1.3-windows-x64.zip` package in
**Settings > Plugins** on Psycheros 0.9.x.
