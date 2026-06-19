param(
  [int] $Port = 3006,
  [string] $DataDir = "",
  [string] $PublicBaseUrl = "",
  [string] $OAuthIssuer = "",
  [switch] $RunDenoCheck
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$connectorRoot = Split-Path -Parent $scriptRoot
$failures = 0
$warnings = 0

function Write-Ok([string] $message) {
  Write-Host "[ok] $message" -ForegroundColor Green
}

function Write-Warn([string] $message) {
  $script:warnings += 1
  Write-Host "[warn] $message" -ForegroundColor Yellow
}

function Write-Fail([string] $message) {
  $script:failures += 1
  Write-Host "[fail] $message" -ForegroundColor Red
}

function Test-HttpsBaseUrl([string] $value, [string] $label) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Warn "$label was not provided; skipping URL shape check."
    return
  }

  if (-not $value.StartsWith("https://")) {
    Write-Fail "$label must start with https://"
  } elseif ($value.EndsWith("/mcp")) {
    Write-Fail "$label should be the base URL only, without /mcp."
  } else {
    Write-Ok "$label looks like an HTTPS base URL."
  }
}

Write-Host "Checking Psycheros ChatGPT bridge prerequisites..."
Write-Host "Connector: $connectorRoot"

if (Test-Path -LiteralPath (Join-Path $connectorRoot "src\http.ts")) {
  Write-Ok "Connector HTTP entrypoint found."
} else {
  Write-Fail "Could not find src\http.ts. Run this script from the connector package."
}

$deno = Get-Command deno -ErrorAction SilentlyContinue
if ($deno) {
  Write-Ok "Deno found at $($deno.Source)."
  (& deno --version | Select-Object -First 1) | ForEach-Object {
    Write-Host "     $_"
  }
} else {
  Write-Fail "Deno was not found on PATH. Install Deno before running the bridge."
}

$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if ($tailscale) {
  Write-Ok "Tailscale CLI found at $($tailscale.Source)."
} else {
  Write-Warn "Tailscale CLI was not found. You can use another HTTPS tunnel, but the guide assumes Tailscale Funnel."
}

if ([string]::IsNullOrWhiteSpace($DataDir)) {
  $DataDir = Join-Path $env:APPDATA "Psycheros\data\entity-core"
}

if (Test-Path -LiteralPath $DataDir) {
  Write-Ok "Entity-core data directory exists: $DataDir"
} else {
  Write-Warn "Entity-core data directory was not found: $DataDir"
  Write-Warn "If Psycheros stores data somewhere else, pass -DataDir or set ENTITY_CONNECTOR_DATA_DIR."
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($listener) {
  Write-Warn "Port $Port is already in use by process $($listener.OwningProcess)."
} else {
  Write-Ok "Port $Port is free."
}

Test-HttpsBaseUrl $PublicBaseUrl "PublicBaseUrl"
Test-HttpsBaseUrl $OAuthIssuer "OAuthIssuer"

if ($RunDenoCheck) {
  if (-not $deno) {
    Write-Fail "Cannot run deno task check because Deno is missing."
  } else {
    Push-Location $connectorRoot
    try {
      Write-Host "Running deno task check..."
      & deno task check
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "deno task check passed."
      } else {
        Write-Fail "deno task check failed."
      }
    } finally {
      Pop-Location
    }
  }
}

Write-Host ""
Write-Host "Summary: $failures failure(s), $warnings warning(s)."
if ($failures -gt 0) {
  exit 1
}

