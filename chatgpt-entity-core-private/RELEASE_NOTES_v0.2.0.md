# ChatGPT Entity-Core Private Bridge v0.2.0

## Cross-platform local bridge

- Added native Entity Core discovery for Windows, macOS, and Linux.
- Added `.command` helpers for macOS and portable shell helpers for macOS and
  Linux.
- Added a macOS user LaunchAgent and a Linux systemd user service for automatic
  startup and crash recovery. Windows Task Scheduler support remains intact.
- Added platform-native config, runtime, and log locations.
- Release packaging no longer assumes the Windows sqlite-vec DLL. The existing
  loader obtains the correct macOS, Linux, or Windows native asset on first use.
- Added a dedicated macOS/Linux setup guide.

## Long ChatGPT thread hardening

- The `/mcp-lite` tools no longer return the same payload in both text and
  structured-content channels, reducing invisible conversation ballast.
- Lite `fetch` now defaults to a 4,000-character slice and accepts a bounded
  `maxChars` override up to 6,000.
- Access logs now record the RPC method/tool, verified-auth state, and request
  and response byte counts without recording tokens, prompts, or tool arguments.
- Added clearer diagnostics for distinguishing a local bridge failure from a
  browser thread that never sent a request.

The bridge itself remains stateless between HTTP calls. ChatGPT's own maximum
conversation context cannot be removed by a local connector, but this release
reduces connector-added context and makes that boundary easier to diagnose.
