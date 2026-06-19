@echo off
setlocal
title Psycheros ChatGPT Bridge - Local MCP Server
cd /d "%~dp0connectors\codex-entity-core"

if not exist ".\bridge.env" (
  echo bridge.env was not found.
  echo Double-click "3 Edit Bridge Settings.bat" first, fill in the file, and save it.
  echo.
  pause
  exit /b 1
)

echo Starting the local Psycheros MCP bridge...
echo Keep this window open while ChatGPT is connected.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-chatgpt-bridge.ps1" -EnvFile ".\bridge.env"
echo.
echo The bridge stopped.
pause
