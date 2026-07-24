[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string]$PackageDirectory,
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
    if (-not $childFull.StartsWith(
            $parentFull + [IO.Path]::DirectorySeparatorChar,
            [StringComparison]::OrdinalIgnoreCase
        )) {
        throw "Unsafe build path escaped its parent: $childFull"
    }
}

function Get-PayloadPaths {
    param([Parameter(Mandatory)] [string]$Root)
    return @(
        Get-ChildItem -LiteralPath $Root -Recurse -File |
            ForEach-Object {
                $_.FullName.Substring($Root.Length + 1).Replace('\', '/')
            } |
            Sort-Object
    )
}

$communityRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$packageRoot = (Resolve-Path -LiteralPath $PackageDirectory).Path
Assert-SafeChildPath -Parent $communityRoot -Child $packageRoot

$manifestPath = Join-Path $packageRoot "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Source package has no manifest.json: $packageRoot"
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.name -or -not $manifest.version -or -not $manifest.source_bridge) {
    throw "manifest.json must declare name, version, and source_bridge."
}
if ((Split-Path -Leaf $packageRoot) -ne $manifest.name) {
    throw "Package directory name must match name '$($manifest.name)'."
}

$filesRoot = Join-Path $packageRoot "files"
if (-not (Test-Path -LiteralPath $filesRoot -PathType Container)) {
    throw "Source package has no files payload: $packageRoot"
}
$declaredFiles = @(
    @($manifest.files) |
        ForEach-Object { ([string]$_).Replace('\', '/') } |
        Sort-Object
)
foreach ($relative in $declaredFiles) {
    if ([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|/)\.\.(/|$)') {
        throw "Unsafe manifest file path: $relative"
    }
}
$actualFiles = Get-PayloadPaths -Root $filesRoot
$payloadDiff = @(Compare-Object -ReferenceObject $declaredFiles -DifferenceObject $actualFiles)
if ($payloadDiff.Count -gt 0) {
    throw "manifest.json files do not exactly match the payload:`n$($payloadDiff | Out-String)"
}

$stockPaths = @(
    $manifest.source_bridge.stock_sha256.PSObject.Properties |
        ForEach-Object { ([string]$_.Name).Replace('\', '/') }
)
foreach ($relative in $stockPaths) {
    if ($relative -notin $declaredFiles) {
        throw "Stock hash is declared for a file outside the payload: $relative"
    }
}

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $communityRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $BuildRoot) {
    $BuildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-community-source-build"
}
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$buildParent = Split-Path -Parent $BuildRoot
Assert-SafeChildPath -Parent $buildParent -Child $BuildRoot
if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}

$stagePackage = Join-Path (Join-Path $BuildRoot "stage") $manifest.name
New-Item -ItemType Directory -Path $stagePackage -Force | Out-Null
Get-ChildItem -Force -LiteralPath $packageRoot | ForEach-Object {
    if ($_.Name -in @("state", ".env", "node_modules", "dist", "output")) {
        return
    }
    Copy-Item -LiteralPath $_.FullName -Destination $stagePackage -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") `
    -Destination (Join-Path $stagePackage "LICENSE") -Force

$managerPlugins = @()
if ($manifest.PSObject.Properties.Name -contains "suite" -and
    $null -ne $manifest.suite -and
    $manifest.suite.PSObject.Properties.Name -contains "manager_plugins") {
    $managerPlugins = @($manifest.suite.manager_plugins)
}
if ($managerPlugins.Count -gt 0) {
    $pluginOutput = Join-Path $stagePackage "plugins"
    New-Item -ItemType Directory -Path $pluginOutput -Force | Out-Null
    foreach ($component in $managerPlugins) {
        $componentPath = [IO.Path]::GetFullPath(
            (Join-Path $communityRoot ([string]$component.package_path))
        )
        Assert-SafeChildPath -Parent $communityRoot -Child $componentPath
        $componentManifestPath = Join-Path $componentPath "plugin.json"
        if (-not (Test-Path -LiteralPath $componentManifestPath -PathType Leaf)) {
            throw "Suite component has no plugin.json: $componentPath"
        }
        $componentManifest = Get-Content -LiteralPath $componentManifestPath -Raw |
            ConvertFrom-Json
        if ($componentManifest.id -ne $component.id -or
            $componentManifest.version -ne $component.version) {
            throw "Suite component mismatch for $($component.id): manifest is $($componentManifest.id) $($componentManifest.version)."
        }
        if ($component.PSObject.Properties.Name -contains "artifact") {
            $artifactName = [string]$component.artifact
            if ([IO.Path]::GetFileName($artifactName) -ne $artifactName) {
                throw "Suite artifact must be a filename: $artifactName"
            }
            $artifactPath = Join-Path $OutputDirectory $artifactName
            if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                $artifactPath = Join-Path (Join-Path $communityRoot "dist") $artifactName
            }
            if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                throw "Suite artifact is missing: $artifactName"
            }
            $artifactHash = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($component.PSObject.Properties.Name -notcontains "sha256" -or
                $artifactHash -ne ([string]$component.sha256).ToLowerInvariant()) {
                throw "Suite artifact hash mismatch: $artifactName"
            }
            Copy-Item -LiteralPath $artifactPath -Destination $pluginOutput -Force
            Set-Content -LiteralPath (Join-Path $pluginOutput "$artifactName.sha256") `
                -Value "$artifactHash  $artifactName" -Encoding ascii
        } else {
            $componentBuildRoot = Join-Path (Join-Path $BuildRoot "plugin-builds") `
                ([string]$component.id)
            & (Join-Path $PSScriptRoot "Build-PluginRelease.ps1") `
                -PluginDirectory $componentPath `
                -OutputDirectory $pluginOutput `
                -BuildRoot $componentBuildRoot
        }
    }
}

$safeVersion = ([string]$manifest.version) -replace '[^A-Za-z0-9._-]', '-'
$zipName = "$($manifest.name)-$safeVersion.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $stagePackage -DestinationPath $zipPath `
    -CompressionLevel Optimal

$verifyRoot = Join-Path $BuildRoot "verify"
New-Item -ItemType Directory -Path $verifyRoot -Force | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $verifyRoot -Force
$verifiedManifest = Join-Path (Join-Path $verifyRoot $manifest.name) "manifest.json"
if (-not (Test-Path -LiteralPath $verifiedManifest -PathType Leaf)) {
    throw "Built ZIP does not contain $($manifest.name)/manifest.json"
}

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
$hashPath = "$zipPath.sha256"
Set-Content -LiteralPath $hashPath -Value $hashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
