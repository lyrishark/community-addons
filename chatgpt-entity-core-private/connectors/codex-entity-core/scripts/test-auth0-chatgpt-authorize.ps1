param(
  [Parameter(Mandatory = $true)]
  [string] $Auth0Domain,

  [Parameter(Mandatory = $true)]
  [string] $ClientId,

  [Parameter(Mandatory = $true)]
  [string] $CallbackUrl,

  [Parameter(Mandatory = $true)]
  [string] $PublicBaseUrl,

  [string] $Scopes = "offline_access entity:read memory:write"
)

$ErrorActionPreference = "Stop"

$domain = $Auth0Domain.Trim().TrimEnd("/")
if ($domain.StartsWith("https://")) {
  $issuer = $domain
} else {
  $issuer = "https://$domain"
}

$resource = $PublicBaseUrl.Trim().TrimEnd("/")
if ($resource.EndsWith("/mcp")) {
  throw "PublicBaseUrl should be the base URL only, without /mcp."
}

function New-QueryString([hashtable] $Values) {
  ($Values.GetEnumerator() | ForEach-Object {
    "$([Uri]::EscapeDataString([string] $_.Key))=$([Uri]::EscapeDataString([string] $_.Value))"
  }) -join "&"
}

function Get-QueryValue([Uri] $Uri, [string] $Name) {
  $query = $Uri.Query.TrimStart("?")
  if ([string]::IsNullOrWhiteSpace($query)) {
    return $null
  }

  foreach ($part in $query.Split("&")) {
    $pieces = $part.Split("=", 2)
    if ($pieces.Count -eq 2 -and [Uri]::UnescapeDataString($pieces[0]) -eq $Name) {
      return [Uri]::UnescapeDataString($pieces[1])
    }
  }

  return $null
}

$authorizeUrl = "$issuer/authorize?" + (New-QueryString @{
  client_id = $ClientId
  redirect_uri = $CallbackUrl
  response_type = "code"
  scope = $Scopes
  state = "psycheros-bridge-smoke"
  code_challenge = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  code_challenge_method = "S256"
  resource = $resource
})

Write-Host "Testing Auth0 authorize URL without following redirects..."
$response = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $authorizeUrl -MaximumRedirection 0 -ErrorAction SilentlyContinue
$location = $response.Headers.Location

if (-not $location) {
  Write-Warning "Auth0 did not return a redirect. Status: $($response.StatusCode)"
  exit 1
}

$absoluteLocation = [Uri]::new([Uri] $issuer, $location)
$errorCode = Get-QueryValue $absoluteLocation "error"
$errorDescription = Get-QueryValue $absoluteLocation "error_description"

if ($errorCode) {
  Write-Host "[fail] Auth0 rejected the request." -ForegroundColor Red
  Write-Host "Error: $errorCode"
  Write-Host "Description: $errorDescription"
  Write-Host ""
  Write-Host "Common fix:"
  Write-Host "- Auth0 Dashboard > Applications > APIs > Psycheros Entity Core"
  Write-Host "- Identifier must exactly equal: $resource"
  Write-Host "- Permissions must include: entity:read and memory:write"
  Write-Host "- Settings > Application Access Policy > User-delegated Access should allow this app"
  exit 1
}

if ($absoluteLocation.AbsolutePath -like "/u/login*") {
  Write-Host "[ok] Auth0 accepted the client/resource/scopes and redirected to login." -ForegroundColor Green
  exit 0
}

Write-Host "[ok] Auth0 redirected without an OAuth error." -ForegroundColor Green
Write-Host "Redirect path: $($absoluteLocation.AbsolutePath)"
