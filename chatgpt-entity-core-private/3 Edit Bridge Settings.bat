@echo off
setlocal
title Psycheros ChatGPT Bridge - Edit Settings
set "ENV_FILE=%~dp0connectors\codex-entity-core\bridge.env"
set "EXAMPLE_FILE=%~dp0bridge.env.example"

if not exist "%ENV_FILE%" (
  copy "%EXAMPLE_FILE%" "%ENV_FILE%" >nul
)

echo Opening bridge.env in Notepad.
echo Fill in the public URL and Auth0 issuer, then save the file.
echo.
notepad "%ENV_FILE%"
