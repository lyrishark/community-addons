param(
  [string]$PsycherosRoot = "",
  [string]$LoomDir = "",
  [string]$PackageName = ""
)

$ErrorActionPreference = "Stop"

if (-not $LoomDir) {
  if (-not $PsycherosRoot) {
    throw "Pass -PsycherosRoot, for example: -PsycherosRoot `"G:\Psycheros-main`""
  }
  $LoomDir = Join-Path $PsycherosRoot "packages\entity-loom"
}

$ExportsDir = Join-Path $LoomDir ".loom-exports"
if (-not (Test-Path -LiteralPath $ExportsDir)) {
  throw "Could not find .loom-exports at $ExportsDir"
}

if (-not $PackageName) {
  $Packages = Get-ChildItem -LiteralPath $ExportsDir -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "checkpoint.json") }

  if ($Packages.Count -eq 1) {
    $PackageName = $Packages[0].Name
    Write-Host "Using only package found: $PackageName"
  } else {
    $Names = ($Packages | Select-Object -ExpandProperty Name) -join ", "
    throw "Pass -PackageName. Packages found: $Names"
  }
}

$CheckpointPath = Join-Path $ExportsDir "$PackageName\checkpoint.json"
if (-not (Test-Path -LiteralPath $CheckpointPath)) {
  throw "Could not find checkpoint at $CheckpointPath"
}

$BackupPath = "$CheckpointPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $CheckpointPath -Destination $BackupPath

$Checkpoint = Get-Content -LiteralPath $CheckpointPath -Raw | ConvertFrom-Json
$Recovered = @()

foreach ($Stage in @("significant", "daily", "graph")) {
  if ($Checkpoint.stages.$Stage.status -eq "running") {
    $Checkpoint.stages.$Stage.status = "aborted"
    $Checkpoint.stages.$Stage.completed = $false
    $Recovered += $Stage
  }
}

if ($Recovered.Count -gt 0) {
  $Checkpoint | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $CheckpointPath -Encoding UTF8
  Write-Host "Recovered stale running stage(s): $($Recovered -join ', ')"
} else {
  Write-Host "No stale running stage found. Checkpoint left unchanged except for backup."
}

Write-Host "Checkpoint backup: $BackupPath"
Write-Host "Resume the package in Entity Loom. If a stage says Aborted (resumable), click its Start/Continue button."
