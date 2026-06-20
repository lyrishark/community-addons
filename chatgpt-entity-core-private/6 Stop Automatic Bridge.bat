@echo off
setlocal
title Psycheros ChatGPT Bridge - Remove Automatic Startup
cd /d "%~dp0connectors\codex-entity-core"

echo Stopping the automatic bridge and removing its startup task...
echo Your OAuth settings and logs will be kept.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\remove-chatgpt-bridge-autostart.ps1"
echo.
pause
