param(
  [Parameter(Mandatory = $true)]
  [string]$PsycherosRoot
)

$ErrorActionPreference = "Stop"

$SupportedVersions = @("0.8.9", "0.8.10", "0.8.11")
$PatchRoot = Split-Path -Parent $PSScriptRoot
$ReplaceRoot = Join-Path $PatchRoot "files\packages\entity-loom"
$LoomDir = Join-Path $PsycherosRoot "packages\entity-loom"
$DenoJson = Join-Path $PsycherosRoot "packages\psycheros\deno.json"

if (-not (Test-Path -LiteralPath $ReplaceRoot)) {
  throw "Could not find mod files at $ReplaceRoot"
}

if (-not (Test-Path -LiteralPath $LoomDir)) {
  throw "Could not find packages\entity-loom under $PsycherosRoot"
}

if (-not (Test-Path -LiteralPath $DenoJson)) {
  throw "Could not find packages\psycheros\deno.json under $PsycherosRoot"
}

$InstalledVersion = (Get-Content -LiteralPath $DenoJson -Raw | ConvertFrom-Json).version
if ($InstalledVersion -notin $SupportedVersions) {
  $SupportedList = $SupportedVersions -join ", "
  throw "This mod supports Psycheros $SupportedList; found $InstalledVersion. No files were changed."
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $LoomDir "_gemini_parser_mod_backup_$Timestamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$Files = Get-ChildItem -LiteralPath $ReplaceRoot -Recurse -File
foreach ($File in $Files) {
  $Relative = $File.FullName.Substring($ReplaceRoot.Length).TrimStart("\", "/")
  $Destination = Join-Path $LoomDir $Relative
  $BackupDestination = Join-Path $BackupRoot $Relative

  if (Test-Path -LiteralPath $Destination) {
    New-Item -ItemType Directory -Force -Path (Split-Path $BackupDestination -Parent) | Out-Null
    Copy-Item -LiteralPath $Destination -Destination $BackupDestination
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $File.FullName -Destination $Destination -Force
  Write-Host "Patched $Relative"
}

Write-Host ""
Write-Host "Gemini parser mod installed for Psycheros $InstalledVersion."
Write-Host "Backup of replaced files: $BackupRoot"
