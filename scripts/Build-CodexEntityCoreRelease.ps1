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

$communityRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = Join-Path $communityRoot "codex-entity-core-plugin\plugin"
$manifestPath = Join-Path $sourceRoot ".codex-plugin\plugin.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $communityRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $BuildRoot) {
    $BuildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-entity-core-codex-build"
}
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$buildParent = Split-Path -Parent $BuildRoot
Assert-SafeChildPath -Parent $buildParent -Child $BuildRoot
if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}

$stageRoot = Join-Path $BuildRoot "stage"
$stagePlugin = Join-Path $stageRoot $manifest.name
New-Item -ItemType Directory -Path $stagePlugin -Force | Out-Null
Get-ChildItem -Force -LiteralPath $sourceRoot | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stagePlugin -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") -Destination (Join-Path $stagePlugin "LICENSE") -Force

# sqlite-vec is selected and downloaded by the existing cross-platform loader.
# Shipping one Windows DLL makes the universal package look Windows-only.
$nativeLibDirectory = Join-Path $stagePlugin "packages\entity-core\lib"
if (Test-Path -LiteralPath $nativeLibDirectory) {
    Remove-Item -LiteralPath $nativeLibDirectory -Recurse -Force
}

$safeVersion = $manifest.version -replace '[^A-Za-z0-9._-]', '-'
$zipName = "psycheros-entity-core-codex-plugin-$safeVersion.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $stagePlugin -DestinationPath $zipPath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveEntries = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $nativeEntries = @($archiveEntries.Entries | Where-Object {
        $_.FullName -match '\.(dll|dylib|so)$'
    })
    if ($nativeEntries.Count -gt 0) {
        throw "Universal release archive unexpectedly contains a platform-specific native library."
    }
} finally {
    $archiveEntries.Dispose()
}

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
Set-Content -LiteralPath "$zipPath.sha256" -Value $hashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
