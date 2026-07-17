param(
  [string]$PsycherosRoot
)

$ErrorActionPreference = "Stop"

$SupportedVersions = @("0.8.23")
$PatchRoot = Split-Path -Parent $PSScriptRoot
$FilesRoot = Join-Path $PatchRoot "files"
$AddonName = "Everything Together"
$AddonId = "psycheros-everything-together"
$AddonVersion = "0.1.0-rc.3"
$SupersededAddonIds = @("psycheros-more-uploads", "psycheros-voice-text-resize", "psycheros-more-uploads-voice-resize")

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

function Get-PsycherosSourceVersion {
  param([string]$Path)
  $DenoJson = Join-Path $Path "packages\psycheros\deno.json"
  try {
    return (Get-Content -LiteralPath $DenoJson -Raw | ConvertFrom-Json).version
  } catch {
    return "unknown"
  }
}

function Format-PsycherosSourceMatches {
  param([array]$Matches)
  return ($Matches | ForEach-Object { "  - $($_.Path) (version $($_.Version))" }) -join [Environment]::NewLine
}

function Get-KnownAddonName {
  param([string]$Id)
  switch ($Id) {
    "psycheros-more-uploads" { return "More Uploads" }
    "psycheros-voice-text-resize" { return "Voice Text Resize" }
    "psycheros-more-uploads-voice-resize" { return "More Uploads + Voice Text Resize" }
    "psycheros-everything-together" { return "Everything Together" }
    default { return $Id }
  }
}

function Get-LegacyAddonBackupPattern {
  param([string]$Id)
  switch ($Id) {
    "psycheros-more-uploads" { return "_more_uploads_backup_*" }
    "psycheros-voice-text-resize" { return "_voice_text_resize_backup_*" }
    "psycheros-more-uploads-voice-resize" { return "_more_uploads_voice_resize_backup_*" }
    "psycheros-everything-together" { return "_everything_together_backup_*" }
    default { return $null }
  }
}

function Get-AddonInstallRecords {
  param([string]$PsycherosPackageDir)

  $Records = @()
  $MarkerDir = Join-Path $PsycherosPackageDir ".addon-installs"
  if (Test-Path -LiteralPath $MarkerDir) {
    foreach ($Marker in Get-ChildItem -LiteralPath $MarkerDir -Filter "*.json" -File -ErrorAction SilentlyContinue) {
      try {
        $Json = Get-Content -LiteralPath $Marker.FullName -Raw | ConvertFrom-Json
        if ($Json.id) {
          $Id = [string]$Json.id
          $Name = if ($Json.name) { [string]$Json.name } else { Get-KnownAddonName $Id }
          $Records += [pscustomobject]@{
            Id = $Id
            Name = $Name
            Source = "install marker"
            Path = $Marker.FullName
          }
        }
      } catch {
        Write-Warning "Ignoring unreadable add-on install marker: $($Marker.FullName)"
      }
    }
  }

  foreach ($KnownId in @("psycheros-more-uploads", "psycheros-voice-text-resize", "psycheros-more-uploads-voice-resize", "psycheros-everything-together")) {
    $Pattern = Get-LegacyAddonBackupPattern $KnownId
    $Backup = Get-ChildItem -LiteralPath $PsycherosPackageDir -Directory -Filter $Pattern -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($Backup) {
      $Records += [pscustomobject]@{
        Id = $KnownId
        Name = Get-KnownAddonName $KnownId
        Source = "legacy backup folder"
        Path = $Backup.FullName
      }
    }
  }

  return $Records
}

function Format-AddonRecord {
  param($Record)
  return "  - $($Record.Name) ($($Record.Id), $($Record.Source): $($Record.Path))"
}

function Assert-AddonInstallCompatible {
  param([string]$PsycherosPackageDir)

  $Records = @(Get-AddonInstallRecords $PsycherosPackageDir)
  $OtherRecords = @($Records | Where-Object { $_.Id -ne $AddonId })
  $Blocking = @($OtherRecords | Where-Object { $SupersededAddonIds -notcontains $_.Id })
  $Superseded = @($OtherRecords | Where-Object { $SupersededAddonIds -contains $_.Id })

  if ($Blocking.Count -gt 0) {
    $List = ($Blocking | ForEach-Object { Format-AddonRecord $_ }) -join [Environment]::NewLine
    throw "Cannot install $AddonName because another overlapping Psycheros source add-on is already present:$([Environment]::NewLine)$List$([Environment]::NewLine)Restore the official Psycheros 0.8.23 source before installing this bundle."
  }

  if ($Superseded.Count -gt 0) {
    $List = ($Superseded | ForEach-Object { Format-AddonRecord $_ }) -join [Environment]::NewLine
    Write-Warning "$AddonName will replace these earlier overlapping add-on installs:$([Environment]::NewLine)$List"
  }
}

function Write-AddonInstallMarker {
  param(
    [string]$PsycherosPackageDir,
    [string]$SourceRoot,
    [string]$InstalledVersion
  )

  $MarkerDir = Join-Path $PsycherosPackageDir ".addon-installs"
  New-Item -ItemType Directory -Force -Path $MarkerDir | Out-Null
  foreach ($SupersededId in $SupersededAddonIds) {
    Remove-Item -LiteralPath (Join-Path $MarkerDir "$SupersededId.json") -Force -ErrorAction SilentlyContinue
  }

  $MarkerPath = Join-Path $MarkerDir "$AddonId.json"
  $Marker = [ordered]@{
    schema_version = 1
    id = $AddonId
    name = $AddonName
    version = $AddonVersion
    psycheros_version = $InstalledVersion
    installed_at = (Get-Date).ToUniversalTime().ToString("o")
    source_root = $SourceRoot
    replaces = @($SupersededAddonIds)
  }
  $Marker | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $MarkerPath -Encoding UTF8
  return $MarkerPath
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

  Add-Candidate $Candidates (Join-Path $HOME "AppData\Roaming\Psycheros\source")
  Add-Candidate $Candidates (Join-Path $HOME "AppData\Roaming\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "AppData\Local\Psycheros\source")
  Add-Candidate $Candidates (Join-Path $HOME "AppData\Local\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Documents\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Code\Psycheros")
  Add-Candidate $Candidates (Join-Path $HOME "Source\Psycheros")

  $Matches = @()
  foreach ($Candidate in $Candidates) {
    if (Test-PsycherosSourceRoot $Candidate) {
      $Matches += [pscustomobject]@{
        Path = $Candidate
        Version = Get-PsycherosSourceVersion $Candidate
      }
    }
  }

  $SupportedMatches = @($Matches | Where-Object { $_.Version -in $SupportedVersions })

  if ($SupportedMatches.Count -eq 1) {
    return $SupportedMatches[0].Path
  }

  if ($SupportedMatches.Count -gt 1) {
    $List = Format-PsycherosSourceMatches $SupportedMatches
    throw "Multiple compatible Psycheros source folders were found:$([Environment]::NewLine)$List$([Environment]::NewLine)Run again with -PsycherosRoot ""C:\path\to\Psycheros\source""."
  }

  if ($Matches.Count -gt 0) {
    $SupportedList = $SupportedVersions -join ", "
    $List = Format-PsycherosSourceMatches $Matches
    throw "Found Psycheros source folder(s), but none match supported version ${SupportedList}:$([Environment]::NewLine)$List$([Environment]::NewLine)If Psycheros itself reports $SupportedList, this installer is seeing a stale or different source folder. Run again with -PsycherosRoot pointed at the launcher source folder, usually ""$HOME\AppData\Roaming\Psycheros\source""."
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
  throw "This add-on supports Psycheros $SupportedList, but $RootFull reports $InstalledVersion. No files were changed. If the running app reports $SupportedList, this is probably not the source folder your launcher is using; rerun with -PsycherosRoot pointed at the launcher source folder."
}

$PsycherosPackageDir = Join-Path $RootFull "packages\psycheros"
Assert-AddonInstallCompatible $PsycherosPackageDir

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $PsycherosPackageDir "_everything_together_backup_$Timestamp"
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

$MarkerPath = Write-AddonInstallMarker $PsycherosPackageDir $RootFull $InstalledVersion

Write-Host ""
Write-Host "$AddonName installed for Psycheros $InstalledVersion."
Write-Host "Patched files: $Patched"
Write-Host "Backed-up existing files: $BackedUp"
Write-Host "Backup folder: $BackupRoot"
Write-Host "Install marker: $MarkerPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Fully quit and relaunch Psycheros."
Write-Host "2. In chat, attach multiple images or a supported document."
Write-Host "3. In voice chat, try Yin Yang typed input, screen presence, and expression sprites."
Write-Host "   The bundled Ember sprite pack will seed missing sprite slots automatically."
Write-Host "4. If you do not want expression sprites, open Settings > Vision > Expressions and turn off Show Expression Display."
