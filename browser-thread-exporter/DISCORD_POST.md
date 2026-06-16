# Discord Post - Psycheros Thread Exporter

Hi! I wanted to share an early community addon we have been testing:

**Psycheros Thread Exporter**

It is a browser extension for exporting AI chat histories into Psycheros-friendly
JSON and for injecting local Psycheros memory context back into ChatGPT, Claude,
or Gemini.

Current alpha features:

- ChatGPT export with timestamps
- Claude export with timestamps
- Gemini draft export plus Gemini Activity timestamp merge
- Gemini merge repair reports
- local Psycheros memory injection
- receiver-aware filtering, so ChatGPT does not get its own `[via:chatgpt]`
  memories re-injected as fresh context

Important notes:

- This is a community alpha, not an official Psycheros release.
- It does not use analytics or remote telemetry.
- It does not press Send.
- Memory injection talks only to local Psycheros on localhost.
- Gemini is still the experimental path because Google exposes Activity
  timestamps separately from chat threads.

Source/docs:

```text
https://github.com/lyrishark/community-addons
```

Release:

```text
https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2
```

I would love testing, especially from people with long Claude or Gemini history.



