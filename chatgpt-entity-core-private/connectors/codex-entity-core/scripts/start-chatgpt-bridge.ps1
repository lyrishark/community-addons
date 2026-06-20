param(
  [string] $EnvFile = "",

  [string] $PublicBaseUrl = "",

  [string] $OAuthIssuer = "",

  [string] $OAuthResource = "",
  [string] $DataDir = "",
  [string] $HostAddress = "",
  [int] $Port = 0,
  [string] $WriteEnabled = "",
  [string] $CorsOrigins = "",
  [string] $DenoPath = "",
  [string] $LogFile = ""
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$connectorRoot = Split-Path -Parent $scriptRoot

function Import-EnvFile([string] $Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) {
    return
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path"
  }

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not [string]::IsNullOrWhiteSpace($line) -and -not $line.StartsWith("#")) {
      $parts = $line.Split("=", 2)
      if ($parts.Count -eq 2) {
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ($name) {
          Set-Item -Path "env:$name" -Value $value
        }
      }
    }
  }
}

function Normalize-BaseUrl([string] $value, [string] $label) {
  $normalized = $value.Trim().TrimEnd("/")
  if (-not $normalized.StartsWith("https://")) {
    throw "$label must start with https://"
  }
  if ($normalized.EndsWith("/mcp")) {
    throw "$label should be the base URL only, without /mcp."
  }
  return $normalized
}

Import-EnvFile $EnvFile

if ([string]::IsNullOrWhiteSpace($PublicBaseUrl)) {
  $PublicBaseUrl = $env:ENTITY_CONNECTOR_PUBLIC_BASE_URL
}

if ([string]::IsNullOrWhiteSpace($OAuthIssuer)) {
  $OAuthIssuer = $env:ENTITY_CONNECTOR_OAUTH_ISSUER
}

if ([string]::IsNullOrWhiteSpace($OAuthResource)) {
  $OAuthResource = $env:ENTITY_CONNECTOR_OAUTH_RESOURCE
}

if ([string]::IsNullOrWhiteSpace($DataDir) -and $env:ENTITY_CONNECTOR_DATA_DIR) {
  $DataDir = $env:ENTITY_CONNECTOR_DATA_DIR
}

if ([string]::IsNullOrWhiteSpace($HostAddress)) {
  if ($env:ENTITY_CONNECTOR_HTTP_HOST) {
    $HostAddress = $env:ENTITY_CONNECTOR_HTTP_HOST
  } else {
    $HostAddress = "127.0.0.1"
  }
}

if ($Port -eq 0) {
  if ($env:ENTITY_CONNECTOR_HTTP_PORT) {
    [int] $parsedPort = 0
    if ([int]::TryParse($env:ENTITY_CONNECTOR_HTTP_PORT, [ref] $parsedPort)) {
      $Port = $parsedPort
    } else {
      throw "ENTITY_CONNECTOR_HTTP_PORT must be a number."
    }
  } else {
    $Port = 3006
  }
}

if ([string]::IsNullOrWhiteSpace($WriteEnabled)) {
  if ($env:ENTITY_CONNECTOR_WRITE_ENABLED) {
    $WriteEnabled = $env:ENTITY_CONNECTOR_WRITE_ENABLED
  } else {
    $WriteEnabled = "true"
  }
}

if ([string]::IsNullOrWhiteSpace($CorsOrigins)) {
  if ($env:ENTITY_CONNECTOR_CORS_ORIGINS) {
    $CorsOrigins = $env:ENTITY_CONNECTOR_CORS_ORIGINS
  } else {
    $CorsOrigins = "https://chatgpt.com,https://chat.openai.com"
  }
}

if ([string]::IsNullOrWhiteSpace($PublicBaseUrl)) {
  throw "PublicBaseUrl is required. Pass -PublicBaseUrl or set it in -EnvFile."
}

if ([string]::IsNullOrWhiteSpace($OAuthIssuer)) {
  throw "OAuthIssuer is required. Pass -OAuthIssuer or set ENTITY_CONNECTOR_OAUTH_ISSUER in -EnvFile."
}

$PublicBaseUrl = Normalize-BaseUrl $PublicBaseUrl "PublicBaseUrl"
$OAuthIssuer = Normalize-BaseUrl $OAuthIssuer "OAuthIssuer"
if ([string]::IsNullOrWhiteSpace($OAuthResource)) {
  $OAuthResource = $PublicBaseUrl
} else {
  $OAuthResource = Normalize-BaseUrl $OAuthResource "OAuthResource"
}

if ([string]::IsNullOrWhiteSpace($DataDir)) {
  $DataDir = Join-Path $env:APPDATA "Psycheros\data\entity-core"
}

if ($Port -le 0 -or $Port -gt 65535) {
  throw "Port must be between 1 and 65535."
}

$writeEnabledNormalized = $WriteEnabled.Trim().ToLowerInvariant()
if ($writeEnabledNormalized -notin @("true", "false")) {
  throw "WriteEnabled must be true or false."
}

if (-not (Test-Path -LiteralPath (Join-Path $connectorRoot "src\http.ts"))) {
  throw "Could not find src\http.ts under $connectorRoot"
}

if ([string]::IsNullOrWhiteSpace($DenoPath)) {
  if ($env:ENTITY_CONNECTOR_DENO_PATH) {
    $DenoPath = $env:ENTITY_CONNECTOR_DENO_PATH
  } else {
    $bundledDeno = Join-Path $env:APPDATA "Psycheros\bin\deno.exe"
    if (Test-Path -LiteralPath $bundledDeno) {
      $DenoPath = $bundledDeno
    } else {
      $denoCommand = Get-Command deno -ErrorAction SilentlyContinue
      if ($denoCommand) {
        $DenoPath = $denoCommand.Source
      }
    }
  }
}

if ([string]::IsNullOrWhiteSpace($DenoPath) -or -not (Test-Path -LiteralPath $DenoPath)) {
  throw "Deno was not found. Install Deno or set ENTITY_CONNECTOR_DENO_PATH."
}

if (-not (Test-Path -LiteralPath $DataDir)) {
  Write-Warning "Entity-core data directory does not exist yet: $DataDir"
  Write-Warning "The bridge can start, but tool calls may report missing data until Psycheros initializes it."
}

$env:ENTITY_CONNECTOR_HTTP_AUTH_MODE = "oauth"
$env:ENTITY_CONNECTOR_PUBLIC_BASE_URL = $PublicBaseUrl
$env:ENTITY_CONNECTOR_OAUTH_RESOURCE = $OAuthResource
$env:ENTITY_CONNECTOR_OAUTH_ISSUER = $OAuthIssuer
$env:ENTITY_CONNECTOR_HTTP_HOST = $HostAddress
$env:ENTITY_CONNECTOR_HTTP_PORT = [string] $Port
$env:ENTITY_CONNECTOR_WRITE_ENABLED = $writeEnabledNormalized
$env:ENTITY_CONNECTOR_DATA_DIR = $DataDir
$env:ENTITY_CONNECTOR_CORS_ORIGINS = $CorsOrigins

Write-Host "Starting Psycheros ChatGPT MCP bridge..."
Write-Host "Local MCP URL: http://$HostAddress`:$Port/mcp"
Write-Host "Public MCP URL: $PublicBaseUrl/mcp"
Write-Host "OAuth issuer: $OAuthIssuer"
Write-Host "OAuth resource: $OAuthResource"
Write-Host "Entity-core data: $DataDir"
Write-Host "Writes enabled: $writeEnabledNormalized"
Write-Host ""
if ([string]::IsNullOrWhiteSpace($LogFile)) {
  Write-Host "Keep this terminal window open while ChatGPT is connected."
}

Push-Location $connectorRoot
try {
  if ([string]::IsNullOrWhiteSpace($LogFile)) {
    & $DenoPath run --node-modules-dir=none -A src/http.ts
  } else {
    $logDirectory = Split-Path -Parent $LogFile
    if ($logDirectory) {
      New-Item -ItemType Directory -Force $logDirectory | Out-Null
    }

    $errorLogFile = [IO.Path]::ChangeExtension($LogFile, ".error.log")
    $denoProcess = Start-Process `
      -FilePath $DenoPath `
      -ArgumentList @("run", "--node-modules-dir=none", "-A", "src/http.ts") `
      -WorkingDirectory $connectorRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $LogFile `
      -RedirectStandardError $errorLogFile `
      -Wait `
      -PassThru
    $global:LASTEXITCODE = $denoProcess.ExitCode
  }
  $denoExitCode = $LASTEXITCODE
  exit $denoExitCode
} finally {
  Pop-Location
}
