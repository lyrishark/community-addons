[CmdletBinding()]
param(
    [string]$PsycherosRoot = (Join-Path $env:APPDATA "Psycheros\source"),
    [string]$DataRoot = (Join-Path $env:APPDATA "Psycheros\data")
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$packageRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$browserSource = Join-Path $packageRoot "browser\htf-music-listener-legacy.js"
$toolSource = Join-Path $packageRoot "custom-tool\htf-music-listener.js"
$bundleSource = Join-Path $packageRoot "custom-tool\htf-music-listener"
$browserTarget = Join-Path $PsycherosRoot "packages\psycheros\web\js\psycheros.js"
$customToolsRoot = Join-Path $DataRoot ".psycheros\custom-tools"
$toolTarget = Join-Path $customToolsRoot "htf-music-listener.js"
$bundleTarget = Join-Path $customToolsRoot "htf-music-listener"
$beginMarker = "// BEGIN HTF MUSIC LISTENER LEGACY 0.1.1"
$endMarker = "// END HTF MUSIC LISTENER LEGACY 0.1.1"

foreach ($required in @($browserSource, $toolSource, $bundleSource, $browserTarget)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required file is missing: $required"
    }
}

New-Item -ItemType Directory -Path $customToolsRoot -Force | Out-Null
Copy-Item -LiteralPath $toolSource -Destination $toolTarget -Force
if (Test-Path -LiteralPath $bundleTarget) {
    Remove-Item -LiteralPath $bundleTarget -Recurse -Force
}
Copy-Item -LiteralPath $bundleSource -Destination $bundleTarget -Recurse -Force

$browserCode = Get-Content -LiteralPath $browserSource -Raw
$targetCode = Get-Content -LiteralPath $browserTarget -Raw
$block = "$beginMarker`r`n$browserCode`r`n$endMarker"
$pattern = "(?ms)\r?\n?" + [regex]::Escape($beginMarker) + ".*?" + [regex]::Escape($endMarker) + "\r?\n?"
if ($targetCode.Contains($beginMarker)) {
    $targetCode = [regex]::Replace($targetCode, $pattern, "`r`n$block`r`n")
} else {
    $targetCode = $targetCode.TrimEnd() + "`r`n`r`n$block`r`n"
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($browserTarget, $targetCode, $utf8NoBom)

Write-Host "HTF Music Listener legacy bridge installed." -ForegroundColor Green
Write-Host "Restart Psycheros, then open Settings > Tools > Custom."
Write-Host "If a Launcher update replaces the browser source before trusted plugins arrive, run this installer again."
