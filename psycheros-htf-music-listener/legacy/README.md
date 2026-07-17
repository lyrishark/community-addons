# HTF Music Listener 0.1.1 - legacy Psycheros package

Use this package only when **Settings > Plugins does not exist**.

1. Extract this zip fully.
2. Double-click `Install Legacy HTF Music Listener.bat`.
3. Restart Psycheros.
4. Open **Settings > Tools > Custom**.
5. Confirm `listen_to_music` is enabled and choose whether to display Entity view.
6. Attach a song and explicitly ask the entity to listen to the music.

The first listening turn can download about 109 MB of FFmpeg if it is not already
installed. The download is pinned and SHA-256 verified. Python is not required.

This bridge uses upstream Psycheros's existing Custom Tools loader. It appends one
clearly marked browser block to `packages/psycheros/web/js/psycheros.js` because old
Psycheros has no native way for a custom tool to register browser assets. A source
update can replace that block; rerun the installer if the panel disappears.

Before moving to the normal trusted-plugin package, run
`Uninstall Legacy HTF Music Listener.bat`, restart, and then install the normal plugin
zip. The uninstaller preserves generated listening artifacts unless the advanced
PowerShell script is run with `-RemoveGeneratedArtifacts`.

Lyrics are not inferred. Paste words manually or attach timestamped `.lrc` text; synced
lyrics from https://lrclib.net are ideal when they match the exact recording.
