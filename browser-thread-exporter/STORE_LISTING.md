# Browser Store Listing Draft

## Name

Psycheros Thread Exporter

## Short Description

Export AI chat threads and inject local Psycheros memory context.

## Full Description

Psycheros Thread Exporter is a community alpha browser extension for
companion-AI users who want to move their own chat histories into Psycheros and
bring local Psycheros memory context back into active chat sessions.

Features:

- Export ChatGPT conversations with timestamps.
- Export Claude conversations with timestamps.
- Export Gemini chat drafts and Gemini Apps Activity timestamps.
- Merge Gemini thread drafts with Activity exports.
- Generate repair reports for Gemini exports that need more timestamp evidence.
- Fetch local Psycheros memory context from `localhost`.
- Insert memory context into ChatGPT, Claude, or Gemini composers for manual
  review and sending.

The extension never presses Send. You remain in control of exports, inserted
context, and shared files.

This is not an official Psycheros release.

## Category

Productivity

## Permissions Justification

- `storage`: saves local extension preferences such as the Psycheros localhost
  URL.
- `clipboardWrite`: copies memory context to the clipboard if composer
  insertion fails.
- ChatGPT, Claude, Gemini, and Gemini Apps Activity host permissions: needed to
  read the user's own active conversation or activity page when the user clicks
  export.
- `localhost` / `127.0.0.1`: needed to fetch read-only memory context from the
  user's local Psycheros daemon.

## Data Disclosure Summary

The extension reads conversation content only on supported chat pages and only
to provide user-triggered export or memory-injection features. It does not send
data to developer-owned servers, does not include analytics, and does not sell
or share user data.



