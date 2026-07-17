@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Install-Legacy.ps1"
if errorlevel 1 (
  echo.
  echo Installation failed. The error above explains what needs attention.
)
echo.
pause
