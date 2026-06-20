param(
  [Parameter(Mandatory = $true)]
  [string] $EnvFile,
  [string] $LogFile = "",
  [int] $RestartDelaySeconds = 3,
  [int] $HealthCheckSeconds = 5
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $scriptRoot "start-chatgpt-bridge.ps1"
if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Bridge settings were not found: $EnvFile"
}
if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Bridge start script was not found: $startScript"
}

if ([string]::IsNullOrWhiteSpace($LogFile)) {
  $LogFile = Join-Path $env:APPDATA "Psycheros\logs\chatgpt-bridge.log"
}
$supervisorLog = [IO.Path]::ChangeExtension($LogFile, ".supervisor.log")
New-Item -ItemType Directory -Force (Split-Path -Parent $supervisorLog) | Out-Null

function Read-BridgeEnv([string] $Path) {
  $values = @{}
  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if ($line -and -not $line.StartsWith("#")) {
      $parts = $line.Split("=", 2)
      if ($parts.Count -eq 2) {
        $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
      }
    }
  }
  return $values
}

function Write-SupervisorLog([string] $Message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
  Add-Content -LiteralPath $supervisorLog -Encoding utf8 -Value "[$timestamp] $Message"
}

function Test-LocalHealth([int] $Port) {
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/healthz" -TimeoutSec 4
    return $health.ok -and $health.connector -eq "codex-entity-core-connector"
  } catch {
    return $false
  }
}

function Ensure-Funnel([int] $Port) {
  $tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $tailscale) {
    Write-SupervisorLog "Tailscale CLI was not found; public Funnel was not refreshed."
    return
  }

  try {
    & $tailscale.Source funnel --bg --yes $Port 2>&1 | Out-Null
    Write-SupervisorLog "Tailscale Funnel points to local port $Port."
  } catch {
    Write-SupervisorLog "Tailscale Funnel refresh failed: $($_.Exception.Message)"
  }
}

function Stop-ProcessTree([int] $ProcessId) {
  & taskkill.exe /PID $ProcessId /T /F 2>&1 | Out-Null
}

$settings = Read-BridgeEnv $EnvFile
$port = 3006
if ($settings.ContainsKey("ENTITY_CONNECTOR_HTTP_PORT")) {
  if (-not [int]::TryParse($settings["ENTITY_CONNECTOR_HTTP_PORT"], [ref] $port)) {
    throw "ENTITY_CONNECTOR_HTTP_PORT must be a number."
  }
}
$publicBaseUrl = ([string] $settings["ENTITY_CONNECTOR_PUBLIC_BASE_URL"]).TrimEnd("/")

Write-SupervisorLog "Supervisor started for local port $port."
while ($true) {
  $argumentLine = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -EnvFile `"$EnvFile`" -LogFile `"$LogFile`""
  $bridgeProcess = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList $argumentLine `
    -WindowStyle Hidden `
    -PassThru
  Write-SupervisorLog "Started bridge process $($bridgeProcess.Id)."

  $healthy = $false
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($bridgeProcess.HasExited) {
      break
    }
    if (Test-LocalHealth $port) {
      $healthy = $true
      break
    }
  }

  if ($healthy) {
    Write-SupervisorLog "Local health check passed."
    Ensure-Funnel $port
    $failedHealthChecks = 0

    while (-not $bridgeProcess.HasExited) {
      Start-Sleep -Seconds $HealthCheckSeconds
      if (Test-LocalHealth $port) {
        $failedHealthChecks = 0
      } else {
        $failedHealthChecks++
        Write-SupervisorLog "Local health check failed ($failedHealthChecks of 3)."
        if ($failedHealthChecks -ge 3) {
          Write-SupervisorLog "Stopping an unhealthy bridge process tree."
          Stop-ProcessTree $bridgeProcess.Id
          break
        }
      }
    }
  } elseif (-not $bridgeProcess.HasExited) {
    Write-SupervisorLog "Bridge did not become healthy during startup; stopping it."
    Stop-ProcessTree $bridgeProcess.Id
  }

  if (-not $bridgeProcess.HasExited) {
    $bridgeProcess.WaitForExit()
  }
  Write-SupervisorLog "Bridge exited with code $($bridgeProcess.ExitCode); restarting in $RestartDelaySeconds seconds."
  Start-Sleep -Seconds $RestartDelaySeconds
}
