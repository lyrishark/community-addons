@echo off
setlocal
title Psycheros ChatGPT Bridge - Check Setup
cd /d "%~dp0connectors\codex-entity-core"
echo Checking this computer for the Psycheros ChatGPT bridge...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\check-chatgpt-bridge-prereqs.ps1" -RunDenoCheck
echo.
echo If you see red [fail] lines, fix those before continuing.
echo If you only see yellow [warn] lines, the guide will tell you what to do.
echo.
pause
