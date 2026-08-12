# Everything Together 0.3.0-rc.2

- Rechecked every guarded stock-file hash against upstream Psycheros main at
  `de906658ea123802d3de20c6fb925434d2baf9e8` (`psycheros-v0.10.0`). No source
  rebase was needed because upstream main and the immutable release tag match.
- Replaced the stale Windows-only HTF Music Listener 0.2.0 bundle with the
  current cross-platform HTF Music Listener 0.3.0-rc.1 manager package.
- Advanced the suite and web-asset cache stamps to 0.3.0-rc.2 so browsers do
  not reuse RC1 assets after an upgrade.

The source bridge remains guarded and accepts only the audited Psycheros
0.10.0 stock files or its own identical payload.
