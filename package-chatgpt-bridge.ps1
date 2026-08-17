param(
  [string] $Version = "0.3.0",
  [string] $OutputDir = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$addonRoot = Join-Path $root "chatgpt-entity-core-private"

function Resolve-FirstExisting([string[]] $Paths, [string] $Label) {
  foreach ($path in $Paths) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "Could not find $Label. Checked: $($Paths -join ', ')"
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $root "dist"
}

$stage = Join-Path $OutputDir "psycheros-entity-core-chatgpt-private-$Version"
$zipPath = Join-Path $OutputDir "psycheros-entity-core-chatgpt-private-$Version.zip"

if (Test-Path -LiteralPath $stage) {
  Remove-Item -LiteralPath $stage -Recurse -Force
}
New-Item -ItemType Directory -Force $stage | Out-Null

$connectorSource = Resolve-FirstExisting @(
  (Join-Path $repoRoot "connectors\codex-entity-core"),
  (Join-Path $addonRoot "connectors\codex-entity-core")
) "codex entity-core connector"

$entityCoreSource = Resolve-FirstExisting @(
  (Join-Path $repoRoot "packages\entity-core"),
  (Join-Path $addonRoot "packages\entity-core")
) "entity-core package"

$pluginApiSource = Resolve-FirstExisting @(
  (Join-Path $repoRoot "packages\plugin-api"),
  (Join-Path $addonRoot "packages\plugin-api")
) "plugin-api package"

Get-ChildItem -LiteralPath $addonRoot -Force |
  Where-Object { $_.Name -notin @("connectors", "packages") } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $stage -Recurse -Force
  }

$connectorTarget = Join-Path $stage "connectors\codex-entity-core"
New-Item -ItemType Directory -Force (Split-Path -Parent $connectorTarget) | Out-Null
Copy-Item -LiteralPath $connectorSource -Destination $connectorTarget -Recurse

$entityCoreTarget = Join-Path $stage "packages\entity-core"
New-Item -ItemType Directory -Force $entityCoreTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $entityCoreSource "deno.json") -Destination $entityCoreTarget
Copy-Item -LiteralPath (Join-Path $entityCoreSource "src") -Destination (Join-Path $entityCoreTarget "src") -Recurse

$pluginApiTarget = Join-Path $stage "packages\plugin-api"
New-Item -ItemType Directory -Force $pluginApiTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $pluginApiSource "deno.json") -Destination $pluginApiTarget
Copy-Item -LiteralPath (Join-Path $pluginApiSource "src") -Destination (Join-Path $pluginApiTarget "src") -Recurse

$logDir = Join-Path $stage "connectors\codex-entity-core\logs"
if (Test-Path -LiteralPath $logDir) {
  Remove-Item -LiteralPath $logDir -Recurse -Force
}

Get-ChildItem -LiteralPath $stage -Recurse -File -Force |
  Where-Object {
    $_.Name -eq "bridge.env" -or
    $_.Name -eq ".env" -or
    $_.Name -like ".env.*"
  } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }

Get-ChildItem -LiteralPath $stage -Recurse -Directory |
  Where-Object { $_.Name -in @(".git", "node_modules") } |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $stage -DestinationPath $zipPath -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archiveEntries = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entryNames = @($archiveEntries.Entries | ForEach-Object FullName)
  if (-not ($entryNames | Where-Object { $_ -like "*.command" })) {
    throw "Release archive is missing the macOS .command helpers."
  }
  if (-not ($entryNames | Where-Object { $_ -like "*/scripts/*.sh" })) {
    throw "Release archive is missing the macOS/Linux shell helpers."
  }
  if ($entryNames | Where-Object { $_ -match '\.(dll|dylib|so)$' }) {
    throw "Universal release archive unexpectedly contains a platform-specific native library."
  }
} finally {
  $archiveEntries.Dispose()
}

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$sumPath = Join-Path $OutputDir "SHA256SUMS-chatgpt-bridge.txt"
Set-Content -LiteralPath $sumPath -Value "$($hash.Hash.ToLowerInvariant())  $(Split-Path -Leaf $zipPath)" -Encoding ascii

Write-Host "Created:"
Write-Host $zipPath
Write-Host $sumPath
