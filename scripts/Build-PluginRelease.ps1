[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$PluginDirectory,
    [string]$OutputDirectory = "",
    [string]$BuildRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-SafeChildPath {
    param(
        [Parameter(Mandatory)] [string]$Parent,
        [Parameter(Mandatory)] [string]$Child
    )
    $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\', '/')
    $childFull = [IO.Path]::GetFullPath($Child).TrimEnd('\', '/')
    if (-not $childFull.StartsWith($parentFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe build path escaped its parent: $childFull"
    }
}

$communityRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$pluginRoot = (Resolve-Path -LiteralPath $PluginDirectory).Path
Assert-SafeChildPath -Parent $communityRoot -Child $pluginRoot

$manifestPath = Join-Path $pluginRoot "plugin.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Plugin package has no plugin.json: $pluginRoot"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.id -or -not $manifest.version) {
    throw "plugin.json must declare id and version."
}
if ((Split-Path -Leaf $pluginRoot) -ne $manifest.id) {
    throw "Plugin directory name must match id '$($manifest.id)'."
}

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $communityRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $BuildRoot) {
    $BuildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-community-plugin-build"
}
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$buildParent = Split-Path -Parent $BuildRoot
Assert-SafeChildPath -Parent $buildParent -Child $BuildRoot
if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}
$stagePlugin = Join-Path (Join-Path $BuildRoot "stage") $manifest.id
New-Item -ItemType Directory -Path $stagePlugin -Force | Out-Null

Get-ChildItem -Force -LiteralPath $pluginRoot | ForEach-Object {
    if ($_.Name -in @("state", ".env", "node_modules")) { return }
    Copy-Item -LiteralPath $_.FullName -Destination $stagePlugin -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") -Destination (Join-Path $stagePlugin "LICENSE") -Force

$safeVersion = $manifest.version -replace '[^A-Za-z0-9._-]', '-'
$zipName = "$($manifest.id)-$safeVersion.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $stagePlugin -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
$hashPath = "$zipPath.sha256"
Set-Content -LiteralPath $hashPath -Value $hashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
