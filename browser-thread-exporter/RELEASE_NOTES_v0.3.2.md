# Psycheros Thread Exporter v0.3.2 - Alpha Release Notes

Community alpha release.

## Highlights

- ChatGPT export with exact backend timestamps.
- Claude export with exact web conversation timestamps.
- Gemini draft export workflow.
- Gemini Activity list/detail export.
- One-click Gemini merge page with repair report.
- Psycheros memory context injection into ChatGPT, Claude, and Gemini.
- Receiver-aware memory filtering so a platform does not receive its own
  `[via:<platform>]` memories as fresh context.

## Known Limitations

- Gemini assistant timestamps are inferred from thread order after matching user
  prompts to Gemini Apps Activity.
- Some long Gemini histories may need repair passes with additional Activity
  Details exports.
- Chat provider UI/API changes can break adapters.
- This release is intended for community testing, not polished end-user support.

## Release Assets

- `psycheros-thread-exporter-0.3.2.zip`
- `SHA256SUMS.txt`

## Install

See `README.md`.



