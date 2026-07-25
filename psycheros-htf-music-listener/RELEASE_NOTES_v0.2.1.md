# HTF Music Listener 0.2.1

This patch keeps Windows Now Playing quiet and stable when no media app owns the
current Global System Media Transport Controls session.

Windows can represent that ordinary no-session state as a null interface with a
successful HRESULT. Version 0.2.0 treated the resulting projection error as a
failure and wrote "The operation completed successfully" to the daemon log every
750 milliseconds. Version 0.2.1 treats it as a normal closed state and rate-limits
any genuine repeated watcher failure to once per minute.

One-click updates from 0.2.0 also retain the listener's selected library and
Share Now Playing choice. Psycheros keeps the replaced addon in its managed
backup directory; 0.2.1 restores the newest valid settings file on first start
without overwriting settings that already exist in the new installation.

Playing and paused sessions are unchanged. The helper continues to report local
title, artist, album, position, duration, and play/pause state without capturing
or uploading audio.
