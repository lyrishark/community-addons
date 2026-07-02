param(
  [string]$PsycherosRoot
)

$Script = Join-Path $PSScriptRoot "tools\install-source-files.ps1"
& $Script @PSBoundParameters
