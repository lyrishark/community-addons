[CmdletBinding()]
param(
    [string]$PsycherosRoot = (Join-Path $env:APPDATA "Psycheros\source"),
    [string]$DataRoot = (Join-Path $env:APPDATA "Psycheros\data"),
    [switch]$RemoveGeneratedArtifacts
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$browserTarget = Join-Path $PsycherosRoot "packages\psycheros\web\js\psycheros.js"
$customToolsRoot = Join-Path $DataRoot ".psycheros\custom-tools"
$toolTarget = Join-Path $customToolsRoot "htf-music-listener.js"
$bundleTarget = Join-Path $customToolsRoot "htf-music-listener"
$markerVersions = @("0.1.2", "0.1.1")

if (Test-Path -LiteralPath $browserTarget) {
    $targetCode = Get-Content -LiteralPath $browserTarget -Raw
    $updated = $targetCode
    foreach ($version in $markerVersions) {
        $beginMarker = "// BEGIN HTF MUSIC LISTENER LEGACY $version"
        $endMarker = "// END HTF MUSIC LISTENER LEGACY $version"
        $pattern = "(?ms)\r?\n?" + [regex]::Escape($beginMarker) + ".*?" + [regex]::Escape($endMarker) + "\r?\n?"
        $updated = [regex]::Replace($updated, $pattern, "`r`n")
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($browserTarget, $updated.TrimEnd() + "`r`n", $utf8NoBom)
}

if (Test-Path -LiteralPath $toolTarget) {
    Remove-Item -LiteralPath $toolTarget -Force
}
if (Test-Path -LiteralPath $bundleTarget) {
    Remove-Item -LiteralPath $bundleTarget -Recurse -Force
}

if ($RemoveGeneratedArtifacts) {
    $stateTarget = Join-Path $DataRoot ".psycheros\htf-music-listener"
    if (Test-Path -LiteralPath $stateTarget) {
        Remove-Item -LiteralPath $stateTarget -Recurse -Force
    }
    $attachments = Join-Path $DataRoot ".psycheros\chat-attachments"
    if (Test-Path -LiteralPath $attachments) {
        Get-ChildItem -LiteralPath $attachments -File -Filter "htf-music-*" |
            Remove-Item -Force
    }
}

Write-Host "HTF Music Listener legacy bridge removed." -ForegroundColor Green
Write-Host "Restart Psycheros to finish unloading the custom tool."
