param(
  [string] $Version = "0.1.1",
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
Copy-Item -LiteralPath (Join-Path $entityCoreSource "lib") -Destination (Join-Path $entityCoreTarget "lib") -Recurse

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

$readme = @"
# Psycheros Entity Core for ChatGPT - Private Bridge

Start here:

1. Open START_HERE.md
2. Double-click the numbered .bat files when the guide tells you to
3. If anything fails, open TROUBLESHOOTING.md

This is a community alpha addon, not an official Psycheros release.
"@

Set-Content -LiteralPath (Join-Path $stage "README.md") -Value $readme -Encoding utf8

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $stage -DestinationPath $zipPath -Force

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$sumPath = Join-Path $OutputDir "SHA256SUMS-chatgpt-bridge.txt"
Set-Content -LiteralPath $sumPath -Value "$($hash.Hash.ToLowerInvariant())  $(Split-Path -Leaf $zipPath)" -Encoding ascii

Write-Host "Created:"
Write-Host $zipPath
Write-Host $sumPath
