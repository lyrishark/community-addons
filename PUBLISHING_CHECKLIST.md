# Publishing Checklist

This is the practical path from "local alpha zip" to "safe enough to share in a
community Discord."

## 1. Create A Public Repository

Repository:

```text
https://github.com/lyrishark/community-addons
```

Suggested structure:

```text
/
  README.md
  browser-thread-exporter/
  codex-entity-core-plugin/
  chatgpt-entity-core-private/
  docs/
```

Public docs and source are now in the repo. Keep this checklist as a release
runbook for future versions.

## 2. Add Trust Files

Recommended public files:

- `README.md`
- `PRIVACY.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `LICENSE`
- release notes per version
- screenshots or short GIFs

For the browser extension, keep the privacy language aligned with the requested
permissions and browser-store data disclosure forms.

## 3. Create Release Assets

Current Psycheros 0.10 manager-addon release:

- `psycheros-htf-music-listener-0.2.0-windows-x64.zip`
- `psycheros-htf-music-listener-0.2.0-windows-x64.zip.sha256`

Do not build a new legacy HTF or source-overlay bundle for 0.10. Older
Psycheros 0.8/0.9 release assets stay attached to their existing tags. The
browser extension and Entity Core bridge/plugin projects use their own
versioned release runs; do not silently relabel their bundled runtime snapshots
as Psycheros 0.10 or Entity Core 0.6.

Generate checksums on Windows:

```powershell
Get-FileHash .\psycheros-htf-music-listener-0.2.0-windows-x64.zip -Algorithm SHA256
```

Before uploading, inspect the exact zip through Psycheros 0.10 Settings >
Plugins, install it, restart, verify the official settings page, and exercise an
update check against its declared repository/package path. Confirm the package
contains no credentials, local music, generated library state, or personal
runtime paths.

## 4. Publish GitHub Release

Use GitHub Releases for alpha builds. GitHub release assets are versioned and
can include release notes plus downloadable files.

Official docs:

- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

## 5. Publish GitHub Pages

Use `docs/index.html` as the first simple landing page.

Official docs:

- https://pages.github.com/

## 6. Browser Store Path

Recommended:

1. Start with Chrome Web Store as Unlisted.
2. Use the GitHub Pages privacy URL.
3. Fill out permission justifications.
4. Share the unlisted URL in Discord once approved.

Official docs:

- Chrome publishing: https://developer.chrome.com/docs/webstore/publish
- Chrome distribution visibility: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- Chrome user data disclosures: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq

Later:

- Firefox AMO or signed self-distribution:
  https://extensionworkshop.com/documentation/publish/self-distribution/
- Edge Add-ons:
  https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

## 7. Discord Announcement

Post the shorter `DISCORD_POST.md` text first, with:

- GitHub repo link
- release link
- store link if available
- "community alpha, not official Psycheros" note
- clear testing ask

Do not post raw zip attachments as the main install path. Point people to the
public source/release page.

## 8. ChatGPT Private Bridge Path

Before publishing the ChatGPT bridge:

1. Run `.\package-chatgpt-bridge.ps1`.
2. Confirm the zip includes:

```text
START_HERE.md
1 Check Setup.bat
2 Start Tailscale Funnel.bat
3 Edit Bridge Settings.bat
4 Start ChatGPT Bridge.bat
5 Keep Bridge Running Automatically.bat
6 Stop Automatic Bridge.bat
connectors/codex-entity-core/
packages/entity-core/
```

3. Confirm the zip does not include:

```text
bridge.env
.env
.env.*
```

4. Test the exact release zip on a clean folder before announcing.
5. In Discord, tell users this is a private ChatGPT Developer Mode bridge, not
   a public ChatGPT app.



