param(
  [string] $TaskName = "Psycheros ChatGPT Bridge",
  [string] $RuntimeRoot = "",
  [switch] $RemoveRuntime
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RuntimeRoot)) {
  $RuntimeRoot = Join-Path $env:APPDATA "Psycheros\addons\chatgpt-entity-core-private"
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed automatic startup task: $TaskName"
} else {
  Write-Host "Automatic startup task was not installed."
}

if ($RemoveRuntime -and (Test-Path -LiteralPath $RuntimeRoot)) {
  $allowedParent = [IO.Path]::GetFullPath(
    (Join-Path $env:APPDATA "Psycheros\addons")
  ).TrimEnd("\")
  $fullRuntimeRoot = [IO.Path]::GetFullPath($RuntimeRoot).TrimEnd("\")
  if (-not $fullRuntimeRoot.StartsWith("$allowedParent\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove a runtime outside $allowedParent"
  }

  Remove-Item -LiteralPath $fullRuntimeRoot -Recurse -Force
  Write-Host "Removed runtime copy: $fullRuntimeRoot"
}

Write-Host "Your saved OAuth settings and logs were left in AppData."
