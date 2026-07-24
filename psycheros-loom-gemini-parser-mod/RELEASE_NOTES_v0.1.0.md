# Release Notes: v0.1.0

Initial Gemini parser mod for Entity Loom.

The release files are based on Psycheros 0.8.9 and preserve its voice-message,
API-key masking, package-list, and memory-editor changes.

- Adds a new `GeminiParser`.
- Registers `gemini` in the Entity Loom parser registry.
- Adds `gemini` to the platform type and upload queue platform list.
- Includes a small parser unit test.
- Supports merged Gemini browser-extension formats:
  - `gemini-merged-batch-draft`
  - `gemini-thread-activity-merged-draft`

This release is intended for manual testing with Psycheros Thread Exporter
Gemini merged batch files.
