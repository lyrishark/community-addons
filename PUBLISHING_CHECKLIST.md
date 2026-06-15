# Publishing Checklist

This is the practical path from "local alpha zip" to "safe enough to share in a
community Discord."

## 1. Create A Public Repository

Suggested repo name:

```text
psycheros-community-addons
```

Suggested structure:

```text
/
  README.md
  browser-thread-exporter/
  codex-entity-core-plugin/
  docs/
  site/
```

Copy the drafts from this folder into the repo, then replace all placeholders:

- `https://github.com/lyrishark/community-addons`
- `https://lyrishark.github.io/community-addons/`
- `https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2`
- `https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1`
- `https://github.com/lyrishark/community-addons/releases`
- `https://github.com/lyrishark/community-addons/issues`

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
- `psycheros-entity-core-codex-plugin-0.2.1-share.zip`
- `SHA256SUMS.txt`

Generate checksums on Windows:

```powershell
Get-FileHash .\psycheros-thread-exporter-0.3.2.zip -Algorithm SHA256
Get-FileHash .\psycheros-entity-core-codex-plugin-0.2.1-share.zip -Algorithm SHA256
```

## 4. Publish GitHub Release

Use GitHub Releases for alpha builds. GitHub release assets are versioned and
can include release notes plus downloadable files.

Official docs:

- https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

## 5. Publish GitHub Pages

Use `site/index.html` as a first simple landing page.

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



