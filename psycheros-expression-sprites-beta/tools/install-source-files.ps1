param(
  [string]$PsycherosRoot
)

$ErrorActionPreference = "Stop"

$SupportedVersions = @("0.8.21")
$PatchRoot = Split-Path -Parent $PSScriptRoot
$FilesRoot = Join-Path $PatchRoot "files"
$AddonName = "Expression Sprites Beta"

function Resolve-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Test-PsycherosSourceRoot {
  param([string]$Path)
  if (-not $Path) {
    return $false
  }
  $DenoJson = Join-Path $Path "packages\psycheros\deno.json"
  return Test-Path -LiteralPath $DenoJson
}

function Add-Candidate {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Path
  )
  if (-not $Path) {
    return
  }
  try {
    $Resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
    if (-not $List.Contains($Resolved)) {
      [void]$List.Add($Resolved)
    }
  } catch {
    # Missing candidate paths are expected during auto-detect.
  }
}

function Resolve-PsycherosSourceRoot {
  param([string]$ExplicitRoot)

  if ($ExplicitRoot) {
    $Resolved = (Resolve-Path -LiteralPath $ExplicitRoot -ErrorAction Stop).Path
    if (-not (Test-PsycherosSourceRoot $Resolved)) {
      throw "Could not find packages\psycheros\deno.json under $Resolved. Point -PsycherosRoot at the Psycheros source checkout."
    }
    return $Resolved
  }

  $Candidates = [System.Collections.Generic.List[string]]::new()
  Add-Candidate $Candidates $env:PSYCHEROS_ROOT

  $Here = (Get-Location).Path
  while ($Here) {
    Add-Candidate $Candidates $Here
    $Parent = Split-Path -Parent $Here
    if (-not $Parent -or $Parent -eq $Here) {
      break
    }
    $Here = $Parent
  }

  Add-Candidate $Candidates (Join-Path $HOME "AppData\Roaming\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "AppData\Local\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Documents\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Code\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Source\Psycheros")
  Add-Candidate $Candidates "H:\Psycheros"
  Add-Candidate $Candidates "H:\Cathedral Revamp - Psycheros"
  Add-Candidate $Candidates "H:\Cathedral Current - Psycheros"

  $Matches = @()
  foreach ($Candidate in $Candidates) {
    if (Test-PsycherosSourceRoot $Candidate) {
      $Matches += $Candidate
    }
  }

  if ($Matches.Count -eq 1) {
    return $Matches[0]
  }

  if ($Matches.Count -gt 1) {
    $List = ($Matches | ForEach-Object { "  - $_" }) -join [Environment]::NewLine
    throw "Multiple Psycheros source folders were found:$([Environment]::NewLine)$List$([Environment]::NewLine)Run again with -PsycherosRoot ""C:\path\to\Psycheros""."
  }

  throw "Could not auto-detect a Psycheros source folder. Run again with -PsycherosRoot ""C:\path\to\Psycheros""."
}

if (-not (Test-Path -LiteralPath $FilesRoot)) {
  throw "Could not find add-on files at $FilesRoot"
}

$ResolvedRoot = Resolve-PsycherosSourceRoot $PsycherosRoot
$RootFull = (Resolve-Path -LiteralPath $ResolvedRoot).Path
$RootFullForCompare = (Resolve-FullPath $RootFull).TrimEnd("\", "/")
$FilesRootFull = (Resolve-Path -LiteralPath $FilesRoot).Path
$DenoJson = Join-Path $RootFull "packages\psycheros\deno.json"

$InstalledVersion = (Get-Content -LiteralPath $DenoJson -Raw | ConvertFrom-Json).version
if ($InstalledVersion -notin $SupportedVersions) {
  $SupportedList = $SupportedVersions -join ", "
  throw "This add-on supports Psycheros $SupportedList; found $InstalledVersion. No files were changed."
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$PsycherosPackageDir = Join-Path $RootFull "packages\psycheros"
$BackupRoot = Join-Path $PsycherosPackageDir "_expression_sprites_beta_backup_$Timestamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$Files = Get-ChildItem -LiteralPath $FilesRootFull -Recurse -File
$Patched = 0
$BackedUp = 0

foreach ($File in $Files) {
  $Relative = $File.FullName.Substring($FilesRootFull.Length).TrimStart("\", "/")
  $Destination = Resolve-FullPath (Join-Path $RootFull $Relative)
  $BackupDestination = Resolve-FullPath (Join-Path $BackupRoot $Relative)

  $InsideRoot = $Destination.StartsWith(
    "$RootFullForCompare\",
    [System.StringComparison]::OrdinalIgnoreCase
  ) -or $Destination.Equals($RootFullForCompare, [System.StringComparison]::OrdinalIgnoreCase)
  if (-not $InsideRoot) {
    throw "Refusing to write outside Psycheros root: $Destination"
  }

  if (Test-Path -LiteralPath $Destination) {
    New-Item -ItemType Directory -Force -Path (Split-Path $BackupDestination -Parent) | Out-Null
    Copy-Item -LiteralPath $Destination -Destination $BackupDestination -Force
    $BackedUp++
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $File.FullName -Destination $Destination -Force
  Write-Host "Patched $Relative"
  $Patched++
}

Write-Host ""
Write-Host "$AddonName installed for Psycheros $InstalledVersion."
Write-Host "Patched files: $Patched"
Write-Host "Backed-up existing files: $BackedUp"
Write-Host "Backup folder: $BackupRoot"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Restart Psycheros."
Write-Host "2. Open Settings > Vision > Expressions."
Write-Host "3. Import a SillyTavern-style ZIP pack or upload sprites per emotion."
Write-Host ""
Write-Host "This installer does not add sprite images. It only adds the expression display system."
