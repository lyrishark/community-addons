# Psycheros Everything Together 0.1.0-rc.4

## Music is now actually included

- Common music formats are accepted in chat and Yin Yang typed voice.
- Large uploads stream to disk with a 512 MB ceiling.
- Audio persists as a distinct attachment with browser playback controls.
- The Windows x64 release bundles HTF Music Listener 0.1.2 legacy, including the HTF
  worker, Entity view, and verified FFmpeg bootstrap.
- The installer applies source files first and the listener bridge second so the two
  layers cannot overwrite one another.

Everything Together is the one-package choice for plain upstream Psycheros 0.8.23.
The Rae/Ember trusted-plugin fork should use its built-in source features plus the
normal HTF plugin instead.
