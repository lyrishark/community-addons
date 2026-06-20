param(
  [string] $EnvFile = "",
  [string] $TaskName = "Psycheros ChatGPT Bridge",
  [string] $RuntimeRoot = "",
  [string] $LogFile = ""
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$connectorRoot = Split-Path -Parent $scriptRoot
$addonRoot = Split-Path -Parent (Split-Path -Parent $connectorRoot)

if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $connectorRoot "bridge.env"
}
if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Bridge settings were not found: $EnvFile"
}

$appDataRoot = Join-Path $env:APPDATA "Psycheros"
$allowedRuntimeParent = Join-Path $appDataRoot "addons"
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
  $RuntimeRoot = Join-Path $allowedRuntimeParent "chatgpt-entity-core-private"
}
if ([string]::IsNullOrWhiteSpace($LogFile)) {
  $LogFile = Join-Path $appDataRoot "logs\chatgpt-bridge.log"
}

$fullRuntimeRoot = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd("\")
$fullAllowedParent = [IO.Path]::GetFullPath($allowedRuntimeParent).TrimEnd("\")
if (-not $fullRuntimeRoot.StartsWith("$fullAllowedParent\", [StringComparison]::OrdinalIgnoreCase)) {
  throw "RuntimeRoot must stay under $fullAllowedParent"
}

$entityCoreSource = Join-Path $addonRoot "packages\entity-core"
if (-not (Test-Path -LiteralPath (Join-Path $entityCoreSource "src"))) {
  throw "Could not find the packaged entity-core source at $entityCoreSource"
}

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

$settings = Read-BridgeEnv $EnvFile
$port = 3006
if ($settings.ContainsKey("ENTITY_CONNECTOR_HTTP_PORT")) {
  if (-not [int]::TryParse($settings["ENTITY_CONNECTOR_HTTP_PORT"], [ref] $port)) {
    throw "ENTITY_CONNECTOR_HTTP_PORT must be a number."
  }
}
$publicBaseUrl = [string] $settings["ENTITY_CONNECTOR_PUBLIC_BASE_URL"]
if ([string]::IsNullOrWhiteSpace($publicBaseUrl)) {
  throw "ENTITY_CONNECTOR_PUBLIC_BASE_URL is missing from $EnvFile"
}
$publicBaseUrl = $publicBaseUrl.TrimEnd("/")

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

$existingListener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($existingListener) {
  $health = $null
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/healthz" -TimeoutSec 5
  } catch {}

  if (-not $health -or $health.connector -ne "codex-entity-core-connector") {
    throw "Port $port is already used by another application. Stop it or choose another port."
  }

  Stop-Process -Id $existingListener.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}

if (Test-Path -LiteralPath $fullRuntimeRoot) {
  Remove-Item -LiteralPath $fullRuntimeRoot -Recurse -Force
}

$runtimeConnector = Join-Path $fullRuntimeRoot "connectors\codex-entity-core"
$runtimeEntityCore = Join-Path $fullRuntimeRoot "packages\entity-core"
New-Item -ItemType Directory -Force $runtimeConnector | Out-Null
New-Item -ItemType Directory -Force $runtimeEntityCore | Out-Null

foreach ($name in @("deno.json", "deno.lock", "src", "scripts")) {
  $source = Join-Path $connectorRoot $name
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $runtimeConnector -Recurse -Force
  }
}
foreach ($name in @("deno.json", "src", "lib")) {
  $source = Join-Path $entityCoreSource $name
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination $runtimeEntityCore -Recurse -Force
  }
}

$configDirectory = Join-Path $appDataRoot "config"
$stableEnvFile = Join-Path $configDirectory "chatgpt-bridge.env"
New-Item -ItemType Directory -Force $configDirectory | Out-Null
$sourceEnvPath = [IO.Path]::GetFullPath($EnvFile)
$stableEnvPath = [IO.Path]::GetFullPath($stableEnvFile)
if (-not $sourceEnvPath.Equals($stableEnvPath, [StringComparison]::OrdinalIgnoreCase)) {
  Copy-Item -LiteralPath $EnvFile -Destination $stableEnvFile -Force
}
New-Item -ItemType Directory -Force (Split-Path -Parent $LogFile) | Out-Null

$runtimeSupervisor = Join-Path $runtimeConnector "scripts\supervise-chatgpt-bridge.ps1"
$taskArguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runtimeSupervisor`" -EnvFile `"$stableEnvFile`" -LogFile `"$LogFile`""
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument $taskArguments `
  -WorkingDirectory $runtimeConnector
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal `
  -UserId $currentUser `
  -LogonType Interactive `
  -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0)

$task = New-ScheduledTask `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $taskSettings `
  -Description "Keeps the private Psycheros Entity Core MCP bridge available to ChatGPT."
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

$healthy = $false
for ($attempt = 1; $attempt -le 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/healthz" -TimeoutSec 3
    if ($health.ok -and $health.connector -eq "codex-entity-core-connector") {
      $healthy = $true
      break
    }
  } catch {}
}
if (-not $healthy) {
  $taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
  throw "The task was installed but the bridge did not become healthy. Last task result: $($taskInfo.LastTaskResult). Check $LogFile"
}

$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if ($tailscale) {
  & $tailscale.Source funnel --bg --yes $port | Out-Null
}

$publicHealth = $null
try {
  $publicHealth = Invoke-RestMethod -Uri "$publicBaseUrl/healthz" -TimeoutSec 15
} catch {}

Write-Host "Automatic startup is installed and running."
Write-Host "Task: $TaskName"
Write-Host "Local health: http://127.0.0.1:$port/healthz"
Write-Host "Public health: $publicBaseUrl/healthz"
Write-Host "Runtime: $fullRuntimeRoot"
Write-Host "Settings: $stableEnvFile"
Write-Host "Log: $LogFile"
if (-not $publicHealth -or -not $publicHealth.ok) {
  Write-Warning "The local bridge is healthy, but the public health check did not succeed. Check Tailscale Funnel."
}
