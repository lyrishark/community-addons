param(
  [string] $RepoUrl = "https://github.com/lyrishark/community-addons",
  [string] $PagesUrl = "https://lyrishark.github.io/community-addons/",
  [string] $BrowserReleaseUrl = "https://github.com/lyrishark/community-addons/releases/tag/browser-thread-exporter-v0.3.2",
  [string] $CodexReleaseUrl = "https://github.com/lyrishark/community-addons/releases/tag/codex-entity-core-plugin-v0.2.1",
  [string] $ChromeWebStoreUrl = "https://github.com/lyrishark/community-addons/releases",
  [string] $ContactOrIssuesUrl = "https://github.com/lyrishark/community-addons/issues"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$replacements = @{
  "{{REPO_URL}}" = $RepoUrl
  "{{PAGES_URL}}" = $PagesUrl
  "{{BROWSER_RELEASE_URL}}" = $BrowserReleaseUrl
  "{{CODEX_RELEASE_URL}}" = $CodexReleaseUrl
  "{{CHROME_WEB_STORE_URL}}" = $ChromeWebStoreUrl
  "{{CONTACT_OR_ISSUES_URL}}" = $ContactOrIssuesUrl
}

Get-ChildItem -LiteralPath $root -Recurse -File |
  Where-Object { $_.Extension -in @(".md", ".html", ".txt") -and $_.Name -ne "fill-placeholders.ps1" } |
  ForEach-Object {
    $text = Get-Content -LiteralPath $_.FullName -Raw
    foreach ($key in $replacements.Keys) {
      $text = $text.Replace($key, $replacements[$key])
    }
    Set-Content -LiteralPath $_.FullName -Value $text -Encoding utf8
  }

Write-Host "Filled placeholders under $root"
Write-Host "Remaining placeholders:"
rg "\{\{[A-Z_]+\}\}" $root

