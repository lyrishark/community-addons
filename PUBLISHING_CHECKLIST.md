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
  site/
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

Release assets to upload:

- `psycheros-thread-exporter-0.3.2.zip`
- `psycheros-entity-core-codex-plugin-0.2.1.zip`
- `psycheros-entity-core-chatgpt-private-0.1.1.zip`
- `psycheros-more-uploads-0.1.0.zip`
- `psycheros-voice-text-resize-0.1.0.zip`
- `psycheros-more-uploads-voice-resize-0.1.0.zip`
- `psycheros-everything-together-0.1.0-rc.2.zip`
- `SHA256SUMS.txt`

Generate checksums on Windows:

```powershell
Get-FileHash .\psycheros-thread-exporter-0.3.2.zip -Algorithm SHA256
Get-FileHash .\psycheros-entity-core-codex-plugin-0.2.1-share.zip -Algorithm SHA256
Get-FileHash .\psycheros-entity-core-chatgpt-private-0.1.1.zip -Algorithm SHA256
```

For Psycheros source-file add-ons that replace overlapping UI files, smoke-test
the installer conflict guard before uploading:

- standalone More Uploads blocks Voice Text Resize, the combo package, and
  Everything Together markers
- standalone Voice Text Resize blocks More Uploads, the combo package, and
  Everything Together markers
- More Uploads + Voice Text Resize warns when superseding either standalone
  package and blocks Everything Together
- Everything Together warns when superseding the narrower upload/voice packages

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



