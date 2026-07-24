[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PsycherosRoot
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PackageRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$ManifestPath = Join-Path $PackageRoot "manifest.json"
$FilesRoot = Join-Path $PackageRoot "files"
$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
$Root = (Resolve-Path -LiteralPath $PsycherosRoot).Path
$DenoJson = Join-Path $Root "packages\psycheros\deno.json"
$TargetPackageRel = [string]$Manifest.source_bridge.backup_package
$TargetPackageDir = [IO.Path]::GetFullPath((Join-Path $Root $TargetPackageRel))

function Assert-SafeChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Parent,
    [Parameter(Mandatory = $true)][string]$Child
  )
  $ParentFull = [IO.Path]::GetFullPath($Parent).TrimEnd("\", "/")
  $ChildFull = [IO.Path]::GetFullPath($Child)
  if (-not $ChildFull.StartsWith(
      $ParentFull + [IO.Path]::DirectorySeparatorChar,
      [StringComparison]::OrdinalIgnoreCase
    )) {
    throw "Unsafe path escaped the selected Psycheros source root: $ChildFull"
  }
}

function Get-NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  $Text = [IO.File]::ReadAllText($Path)
  $Text = $Text.Replace(
    ([string][char]13 + [string][char]10),
    [string][char]10
  ).Replace([string][char]13, [string][char]10)
  $Bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $Sha = [Security.Cryptography.SHA256]::Create()
  try {
    return -join ($Sha.ComputeHash($Bytes) | ForEach-Object {
        $_.ToString("x2")
      })
  } finally {
    $Sha.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $DenoJson)) {
  throw "Could not find packages\psycheros\deno.json under $Root"
}
if (-not (Test-Path -LiteralPath $TargetPackageDir -PathType Container)) {
  throw "Could not find $TargetPackageRel under $Root"
}
if (-not (Test-Path -LiteralPath $FilesRoot -PathType Container)) {
  throw "Could not find source-bridge payload at $FilesRoot"
}

$InstalledVersion =
  (Get-Content -LiteralPath $DenoJson -Raw | ConvertFrom-Json).version
$SupportedVersions = @($Manifest.requires.compatible_psycheros_versions)
if ($InstalledVersion -notin $SupportedVersions) {
  throw "This source bridge supports Psycheros $($SupportedVersions -join ', '); found $InstalledVersion. No files were changed."
}

$StockHashes = @{}
foreach ($Property in $Manifest.source_bridge.stock_sha256.PSObject.Properties) {
  $StockHashes[[string]$Property.Name] = [string]$Property.Value
}

$PreflightErrors = [Collections.Generic.List[string]]::new()
foreach ($Relative in @($Manifest.files)) {
  $Payload = [IO.Path]::GetFullPath((Join-Path $FilesRoot $Relative))
  $Destination = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
  Assert-SafeChildPath -Parent $FilesRoot -Child $Payload
  Assert-SafeChildPath -Parent $Root -Child $Destination

  if (-not (Test-Path -LiteralPath $Payload -PathType Leaf)) {
    $PreflightErrors.Add("Missing payload file: $Relative")
    continue
  }

  $PayloadHash = Get-NormalizedSha256 $Payload
  if ($StockHashes.ContainsKey([string]$Relative)) {
    if (-not (Test-Path -LiteralPath $Destination -PathType Leaf)) {
      $PreflightErrors.Add("Required stock file is missing: $Relative")
      continue
    }
    $CurrentHash = Get-NormalizedSha256 $Destination
    $StockHash = $StockHashes[[string]$Relative]
    if ($CurrentHash -ne $StockHash -and $CurrentHash -ne $PayloadHash) {
      $PreflightErrors.Add("Refusing to overwrite a non-stock local edit: $Relative")
    }
  } elseif (Test-Path -LiteralPath $Destination) {
    $CurrentHash = Get-NormalizedSha256 $Destination
    if ($CurrentHash -ne $PayloadHash) {
      $PreflightErrors.Add("Refusing to replace an existing non-addon file: $Relative")
    }
  }
}

if ($PreflightErrors.Count -gt 0) {
  throw "Source-bridge preflight failed. No files were changed:" +
    [Environment]::NewLine +
    ($PreflightErrors | ForEach-Object { "  - $_" } | Out-String)
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $TargetPackageDir (
  ".community-addon-backups\$($Manifest.name)\$Timestamp"
)

foreach ($Relative in @($Manifest.files)) {
  $Payload = [IO.Path]::GetFullPath((Join-Path $FilesRoot $Relative))
  $Destination = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
  $Backup = [IO.Path]::GetFullPath((Join-Path $BackupRoot $Relative))
  Assert-SafeChildPath -Parent $Root -Child $Destination
  Assert-SafeChildPath -Parent $BackupRoot -Child $Backup

  if (Test-Path -LiteralPath $Destination -PathType Leaf) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Backup) |
      Out-Null
    Copy-Item -LiteralPath $Destination -Destination $Backup -Force
  }
  New-Item -ItemType Directory -Force -Path (
    Split-Path -Parent $Destination
  ) | Out-Null
  Copy-Item -LiteralPath $Payload -Destination $Destination -Force
  Write-Host "Installed $Relative"
}

$MarkerDir = Join-Path $TargetPackageDir ".addon-installs"
New-Item -ItemType Directory -Force -Path $MarkerDir | Out-Null
$Marker = [ordered]@{
  schema_version = 1
  id = [string]$Manifest.name
  version = [string]$Manifest.version
  psycheros_version = [string]$InstalledVersion
  base = [string]$Manifest.source_bridge.base
  installed_at = (Get-Date).ToUniversalTime().ToString("o")
  backup = $BackupRoot
}
$MarkerPath = Join-Path $MarkerDir "$($Manifest.name).json"
$Marker | ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath $MarkerPath -Encoding UTF8

Write-Host ""
Write-Host "$($Manifest.name) $($Manifest.version) installed."
Write-Host "Backup: $BackupRoot"
Write-Host "Restart Psycheros before testing this source bridge."
