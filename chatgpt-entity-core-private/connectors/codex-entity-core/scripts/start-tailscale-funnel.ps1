param(
  [int] $Port = 3006,
  [switch] $Background
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command tailscale -ErrorAction SilentlyContinue)) {
  throw "Tailscale CLI was not found on PATH. Install Tailscale or use another HTTPS tunnel."
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if (-not $listener) {
  Write-Warning "Nothing is listening on local port $Port yet."
  Write-Warning "This is okay if you are only starting Funnel to copy your public URL during setup."
}

Write-Host "Starting Tailscale Funnel for local port $Port..."
Write-Host "Copy the HTTPS URL Tailscale prints, then add /mcp for ChatGPT."
Write-Host "Example: https://your-machine.your-tailnet.ts.net/mcp"
Write-Host ""

if ($Background) {
  & tailscale funnel --bg $Port
} else {
  Write-Host "This runs in the foreground. Press Ctrl+C to stop the public tunnel."
  & tailscale funnel $Port
}
