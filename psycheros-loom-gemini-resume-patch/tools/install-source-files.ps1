param(
  [string]$PsycherosRoot = "",
  [string]$LoomDir = ""
)

$ErrorActionPreference = "Stop"

$PatchRoot = Split-Path -Parent $PSScriptRoot
$ReplaceRoot = Join-Path $PatchRoot "files\packages\entity-loom"

if (-not $LoomDir) {
  if (-not $PsycherosRoot) {
    throw "Pass -PsycherosRoot, for example: -PsycherosRoot `"G:\Psycheros-main`""
  }
  $LoomDir = Join-Path $PsycherosRoot "packages\entity-loom"
}

if (-not (Test-Path -LiteralPath $ReplaceRoot)) {
  throw "Could not find patch files at $ReplaceRoot"
}

if (-not (Test-Path -LiteralPath $LoomDir)) {
  throw "Could not find Entity Loom folder at $LoomDir"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $LoomDir "_gemini_resume_patch_backup_$Timestamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$Files = Get-ChildItem -LiteralPath $ReplaceRoot -Recurse -File
foreach ($File in $Files) {
  $Relative = $File.FullName.Substring($ReplaceRoot.Length)
  if ($Relative.StartsWith("\") -or $Relative.StartsWith("/")) {
    $Relative = $Relative.Substring(1)
  }

  $Destination = Join-Path $LoomDir $Relative
  $BackupDestination = Join-Path $BackupRoot $Relative

  New-Item -ItemType Directory -Force -Path (Split-Path $BackupDestination -Parent) | Out-Null
  if (Test-Path -LiteralPath $Destination) {
    Copy-Item -LiteralPath $Destination -Destination $BackupDestination
  }

  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $File.FullName -Destination $Destination -Force
  Write-Host "Patched $Relative"
}

Write-Host ""
Write-Host "Source files patched."
Write-Host "Backup of replaced files: $BackupRoot"
Write-Host "Next: run tools\\repair-checkpoint.ps1 if a Loom package is stuck on a running stage."
