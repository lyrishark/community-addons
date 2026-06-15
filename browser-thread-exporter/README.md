# Psycheros Thread Exporter

Community alpha browser extension for exporting AI chat threads and injecting
Psycheros memory context into chat composers.

This is not an official Psycheros release.

## What It Does

Psycheros Thread Exporter helps companion-AI users move conversation history
between chat platforms and Psycheros.

Current features:

- Export ChatGPT conversations with exact backend timestamps.
- Export Claude conversations with exact web conversation timestamps.
- Export Gemini visible chat drafts.
- Export Gemini Apps Activity timestamps.
- Merge Gemini thread drafts with Gemini Activity exports.
- Generate repair reports for Gemini exports that need more timestamp evidence.
- Fetch read-only memory context from a local Psycheros daemon.
- Insert Psycheros memory context into ChatGPT, Claude, or Gemini composers.

The extension never presses Send. You always review the exported or inserted
content yourself.

## Current Status

Alpha.

- ChatGPT export: working and intended for Entity Loom import.
- Claude export: working and intended for Entity Loom import.
- Gemini export: draft workflow. Gemini does not expose exact assistant-message
  timestamps in the normal chat page, so the merger uses Gemini Apps Activity
  timestamps for user prompts and infers assistant response timestamps from
  visible chat order.
- Psycheros memory injection: working with local Psycheros daemon on localhost.

## Install

### Recommended Alpha Install

Use the latest release from:

```text
https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2
```

For Chrome/Chromium developer-mode testing:

1. Download the release zip.
2. Extract it into a normal folder.
3. Open `chrome://extensions`.
4. Turn on Developer mode.
5. Click Load unpacked.
6. Select the extracted folder that directly contains `manifest.json`.

If Chrome says it cannot find the manifest, you probably selected the zip file
or the parent folder. Select the folder that directly contains `manifest.json`.

### Future Store Install

Chrome Web Store alpha listing:

```text
https://github.com/lyrishark/community-addons/releases
```

## Export Workflows

### ChatGPT

1. Open a ChatGPT conversation.
2. Click Export ChatGPT.
3. Save the downloaded JSON.
4. Import it into Entity Loom.

The extension uses ChatGPT's conversation backend API from your active logged-in
browser session. It saves the export locally through your browser's download
flow.

### Claude

1. Open a Claude conversation.
2. Click Export Claude.
3. Save the downloaded JSON.
4. Import it into Entity Loom.

The extension uses Claude's web conversation API from your active logged-in
browser session and normalizes the result into a loom-compatible shape.

### Gemini

Gemini requires two kinds of exports:

1. Gemini chat thread draft exports from `gemini.google.com`.
2. Gemini Apps Activity exports from `myactivity.google.com/product/gemini`.

Then:

1. Open the extension options page.
2. Load all Gemini thread draft JSON files.
3. Load the Gemini Activity list JSON file.
4. Optionally load Activity Detail JSON files for stubborn unmatched prompts.
5. Click Merge and Download Batch.
6. Review the merge report.

The merged Gemini batch is still a draft format. It preserves exact Activity
timestamps for matched user prompts and marks assistant timestamps as inferred.

## Memory Injection Workflow

Requires Psycheros running locally, normally at:

```text
http://127.0.0.1:3000
```

1. Open ChatGPT, Claude, or Gemini.
2. Click Inject Memory.
3. Load the latest daily memory or choose a date range.
4. Review the preview.
5. Click Insert.
6. Edit or send manually.

When injecting into a platform, the extension filters out memory entries tagged
as coming from that same platform, for example `[via:chatgpt]`.

## Permissions

The extension requests:

- `storage` - remember local settings, such as the Psycheros localhost URL.
- `clipboardWrite` - copy memory context if a chat composer rejects insertion.
- Host permissions for ChatGPT, Claude, Gemini, Gemini Apps Activity, and
  localhost Psycheros.

The extension does not use analytics, ads, remote telemetry, or third-party
tracking services.

## Source and Issues

Source:

```text
https://github.com/lyrishark/community-addons
```

Issues:

```text
https://github.com/lyrishark/community-addons/issues
```



