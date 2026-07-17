[CmdletBinding()]
param(
    [string]$OutputDirectory = "",
    [string]$WorkerExecutable = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $repoRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $WorkerExecutable) {
    $WorkerExecutable = Join-Path $env:APPDATA "Psycheros\data\.psycheros\plugins\psycheros-htf-music-listener\vendor\windows-x86_64\htf-worker.exe"
}
$WorkerExecutable = (Resolve-Path -LiteralPath $WorkerExecutable).Path

$buildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-music-release-suite"
$buildParent = Split-Path -Parent $buildRoot
if (Test-Path -LiteralPath $buildRoot) {
    $resolved = [IO.Path]::GetFullPath($buildRoot)
    if (-not $resolved.StartsWith([IO.Path]::GetFullPath($buildParent) + [IO.Path]::DirectorySeparatorChar)) {
        throw "Unsafe release staging path: $resolved"
    }
    Remove-Item -LiteralPath $buildRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

function Write-ReleaseHash {
    param([Parameter(Mandatory)] [string]$Path)
    $hash = Get-FileHash -LiteralPath $Path -Algorithm SHA256
    $line = "$($hash.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($Path))"
    Set-Content -LiteralPath "$Path.sha256" -Value $line -Encoding ascii
    return $hash.Hash.ToLowerInvariant()
}

function Compress-Package {
    param(
        [Parameter(Mandatory)] [string]$PackageName,
        [Parameter(Mandatory)] [string]$Version,
        [string]$BundledLegacyPath = ""
    )
    $source = Join-Path $repoRoot $PackageName
    $stageParent = Join-Path $buildRoot "stage-$PackageName"
    $stagePackage = Join-Path $stageParent $PackageName
    New-Item -ItemType Directory -Path $stageParent -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $stagePackage -Recurse -Force

    if ($BundledLegacyPath) {
        $bundleTarget = Join-Path $stagePackage "bundled\htf-music-listener"
        New-Item -ItemType Directory -Path $bundleTarget -Force | Out-Null
        Copy-Item -Path (Join-Path $BundledLegacyPath "*") -Destination $bundleTarget -Recurse -Force
    }

    $zipName = "$PackageName-$Version.zip"
    $zipPath = Join-Path $OutputDirectory $zipName
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -LiteralPath $stagePackage -DestinationPath $zipPath -CompressionLevel Optimal
    $hash = Write-ReleaseHash -Path $zipPath
    Write-Output "$zipName  $hash"
}

try {
    & (Join-Path $repoRoot "psycheros-htf-music-listener\scripts\Build-Release.ps1") `
        -OutputDirectory $OutputDirectory `
        -BuildRoot (Join-Path $buildRoot "htf-build") `
        -WorkerExecutable $WorkerExecutable

    $legacyZip = Join-Path $OutputDirectory "psycheros-htf-music-listener-0.1.2-legacy-windows-x64.zip"
    $legacyExpanded = Join-Path $buildRoot "legacy-expanded"
    Expand-Archive -LiteralPath $legacyZip -DestinationPath $legacyExpanded -Force
    $legacyRoot = Get-ChildItem -LiteralPath $legacyExpanded -Directory |
        Where-Object { $_.Name -like "psycheros-htf-music-listener-legacy-*" } |
        Select-Object -First 1
    if (-not $legacyRoot) { throw "Could not locate the expanded legacy listener package." }

    Compress-Package -PackageName "psycheros-more-uploads" -Version "0.1.1"
    Compress-Package -PackageName "psycheros-more-uploads-voice-resize" -Version "0.1.1"
    Compress-Package `
        -PackageName "psycheros-everything-together" `
        -Version "0.1.0-rc.4" `
        -BundledLegacyPath $legacyRoot.FullName
} finally {
    if (Test-Path -LiteralPath $buildRoot) {
        Remove-Item -LiteralPath $buildRoot -Recurse -Force
    }
}
