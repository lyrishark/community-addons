# Privacy Policy - Psycheros Thread Exporter

Effective date: 2026-06-14

Psycheros Thread Exporter is a local-first community alpha browser extension.
It is designed to help users export their own AI chat conversations and inject
their own local Psycheros memory context into chat composers.

This is not an official Psycheros release.

## Data The Extension Can Access

The extension runs only on these sites:

- `chatgpt.com`
- `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `myactivity.google.com/product/gemini`
- `localhost` / `127.0.0.1` for local Psycheros memory context

On those pages, it may read conversation text, message metadata, timestamps,
page state, and Gemini Activity text needed to produce exports.

## Data The Extension Stores

The extension may store small local settings in browser extension storage, such
as:

- the local Psycheros URL
- extension workflow preferences

It does not store your exported conversations in extension storage. Exported
files are downloaded to your computer through your browser.

## Data The Extension Sends

The extension does not send your data to any developer-owned server.

The extension may make requests to:

- the chat provider you are already using, from your active logged-in browser
  session, to export your own current conversation
- your local Psycheros daemon on `localhost` or `127.0.0.1` for memory context

Memory injection is restricted to local Psycheros URLs in this alpha build.

## Clipboard

The extension may write generated memory context to your clipboard if direct
composer insertion fails. It does this only after you use the memory injection
feature.

## No Analytics or Ads

The extension does not include:

- analytics
- advertising
- tracking pixels
- remote telemetry
- third-party data sales

## User Control

You choose when to export a conversation.
You choose when to load Psycheros memory context.
You choose whether to send inserted memory context.

The extension never presses Send.

## Contact

Questions or issues:

```text
https://github.com/lyrishark/community-addons/issues
```



