# Security Notes - Psycheros Thread Exporter

Psycheros Thread Exporter is a browser extension. Browser extensions are
sensitive software because they run inside pages where private conversation data
may be visible.

This is not an official Psycheros release.

## Security Model

The extension is local-first:

- Exports are downloaded locally.
- Psycheros memory context is fetched from localhost.
- No developer-owned remote server is used.
- The extension never sends messages automatically.

## Permission Scope

Host permissions are limited to:

- ChatGPT
- Claude
- Gemini
- Gemini Apps Activity
- localhost / 127.0.0.1

The extension does not request all-site browsing access.

## Known Risks

- Chat providers can change their web apps without warning, which may break
  export logic.
- Gemini timestamp matching is best-effort because Google does not expose exact
  assistant-message timestamps in the normal chat page.
- Developer-mode browser extension installs are less user-friendly than store
  installs and require users to trust the source package.

## Recommended User Safety

- Install from the public source repository or official store listing only.
- Review permissions before installing.
- Do not install modified zips from private messages.
- Keep Psycheros bound to localhost unless you understand the network exposure.
- Review exported JSON before sharing it with anyone.

## Reporting Security Issues

Please do not post security-sensitive reports publicly.

Report privately through:

```text
https://github.com/lyrishark/community-addons/issues
```



