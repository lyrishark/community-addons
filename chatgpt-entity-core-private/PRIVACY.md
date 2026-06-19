# Privacy Policy - Psycheros Entity Core for ChatGPT Private Bridge

Effective date: 2026-06-18

Psycheros Entity Core for ChatGPT Private Bridge is a local-first community
alpha addon. It connects a private ChatGPT Developer Mode app to the user's
local Psycheros entity-core data directory through MCP.

This is not an official Psycheros release.

## Data The Bridge Can Access

The bridge can read local Psycheros entity-core data, including:

- identity files
- relationship/user/self context
- memories
- knowledge graph nodes

When memory writes are enabled, it can write ordinary daily or significant
memory files.

## Data The Bridge Does Not Access

The bridge does not intentionally access unrelated files. It uses the configured
entity-core data directory.

It does not expose direct identity/core editing tools.

It does not expose memory deletion tools.

## Data The Bridge Sends

The bridge does not send data to a developer-owned server.

It sends tool results to ChatGPT when the user invokes the private ChatGPT app.
Those results may include private entity-core data.

ChatGPT and OpenAI process data according to the user's active ChatGPT account,
settings, and product behavior. Do not connect private entity-core data to a
ChatGPT account or workspace where you do not want that data processed.

## OAuth Provider Data

The setup uses an OAuth provider such as Auth0. The OAuth provider handles login
and token issuance. The bridge validates access tokens but does not need the
user's Auth0 password.

Do not publish:

- OAuth client secrets
- Auth0 tenant admin credentials
- private entity-core files
- local logs containing personal data

## No Analytics or Ads

The bridge does not include:

- analytics
- ads
- telemetry
- tracking pixels
- third-party data sales

## Contact

Questions or issues:

```text
https://github.com/lyrishark/community-addons/issues
```

