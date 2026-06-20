@echo off
setlocal
title Psycheros ChatGPT Bridge - Automatic Startup
cd /d "%~dp0connectors\codex-entity-core"

if not exist ".\bridge.env" (
  echo bridge.env was not found.
  echo Double-click "3 Edit Bridge Settings.bat" first, fill in the file, and save it.
  echo.
  pause
  exit /b 1
)

echo Installing automatic startup and crash recovery...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\install-chatgpt-bridge-autostart.ps1" -EnvFile ".\bridge.env"
echo.
if errorlevel 1 (
  echo Automatic startup was not installed. Read the error above.
) else (
  echo Done. You can close the old bridge and Funnel windows.
)
pause
