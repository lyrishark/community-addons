param(
  [string]$PsycherosRoot,
  [string]$DataRoot = (Join-Path $env:APPDATA "Psycheros\data")
)

$Script = Join-Path $PSScriptRoot "tools\install-source-files.ps1"
& $Script @PSBoundParameters
