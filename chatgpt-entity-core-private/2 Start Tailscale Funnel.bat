@echo off
setlocal
title Psycheros ChatGPT Bridge - Tailscale Funnel
cd /d "%~dp0connectors\codex-entity-core"
echo Starting the public HTTPS tunnel for ChatGPT...
echo.
echo Copy the https:// URL that Tailscale prints.
echo Keep this window open while ChatGPT is connected.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-tailscale-funnel.ps1"
echo.
echo Tailscale Funnel stopped.
pause
