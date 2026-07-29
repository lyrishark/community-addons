[CmdletBinding()]
param(
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

function Reset-BuildDirectory {
    param(
        [Parameter(Mandatory)] [string]$Parent,
        [Parameter(Mandatory)] [string]$Path
    )
    Assert-SafeChildPath -Parent $Parent -Child $Path
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

$pluginRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$communityRoot = (Resolve-Path -LiteralPath (Join-Path $pluginRoot "..")).Path
$manifest = Get-Content -LiteralPath (Join-Path $pluginRoot "plugin.json") -Raw | ConvertFrom-Json

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $communityRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $BuildRoot) {
    $BuildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-htf-music-listener-package"
}
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$buildParent = Split-Path -Parent $BuildRoot
if (-not $buildParent) { throw "BuildRoot must have a parent directory." }
New-Item -ItemType Directory -Path $buildParent -Force | Out-Null
Reset-BuildDirectory -Parent $buildParent -Path $BuildRoot

$stagePlugin = Join-Path $BuildRoot $manifest.id
New-Item -ItemType Directory -Path $stagePlugin -Force | Out-Null
$sourceItems = @(
    "plugin.json",
    "psycheros.ts",
    "deno.json",
    "runtime-manifest.json",
    "README.md",
    "PRIVACY.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "RELEASE_NOTES_v$($manifest.version).md",
    "THIRD_PARTY_NOTICES.md",
    "lib",
    "web",
    "worker"
)
foreach ($item in $sourceItems) {
    $source = Join-Path $pluginRoot $item
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Release input is missing: $source"
    }
    Copy-Item -LiteralPath $source -Destination $stagePlugin -Recurse -Force
}
$stageWatcher = Join-Path $stagePlugin "watcher"
New-Item -ItemType Directory -Path $stageWatcher -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $pluginRoot "watcher\macos") -Destination $stageWatcher -Recurse -Force
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") -Destination (Join-Path $stagePlugin "LICENSE") -Force

$safeVersion = $manifest.version -replace '[^A-Za-z0-9._-]', '-'
$zipName = "psycheros-htf-music-listener-$safeVersion.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -LiteralPath $stagePlugin -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
$hashPath = "$zipPath.sha256"
Set-Content -LiteralPath $hashPath -Value $hashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
Write-Output "Native runtimes: downloaded from the pinned release manifest on first need"
