[CmdletBinding()]
param(
    [string]$OutputDirectory = "",
    [string]$BuildRoot = "",
    [string]$PythonCommand = "python",
    [string]$WorkerExecutable = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-SafeChildPath {
    param(
        [Parameter(Mandatory)] [string]$Parent,
        [Parameter(Mandatory)] [string]$Child
    )
    $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\', '/')
    $childFull = [IO.Path]::GetFullPath($Child).TrimEnd('\', '/')
    if (-not $childFull.StartsWith($parentFull + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe build path escaped its parent: $childFull"
    }
}

function Reset-BuildDirectory {
    param(
        [Parameter(Mandatory)] [string]$Parent,
        [Parameter(Mandatory)] [string]$Path
    )
    Assert-SafeChildPath -Parent $Parent -Child $Path
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
}

function Copy-LicenseMatches {
    param(
        [Parameter(Mandatory)] [string[]]$SearchRoots,
        [Parameter(Mandatory)] [string[]]$PackagePrefixes,
        [Parameter(Mandatory)] [string]$Destination
    )
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    foreach ($root in $SearchRoots | Select-Object -Unique) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        foreach ($prefix in $PackagePrefixes) {
            $metadataDirs = Get-ChildItem -LiteralPath $root -Directory -Filter "$prefix*.dist-info" -ErrorAction SilentlyContinue
            foreach ($metadata in $metadataDirs) {
                $licenseFiles = Get-ChildItem -LiteralPath $metadata.FullName -File -Recurse -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -match '^(LICENSE|COPYING|NOTICE|AUTHORS)' }
                foreach ($license in $licenseFiles) {
                    $safePackage = $metadata.Name -replace '[^A-Za-z0-9._-]', '_'
                    $safeName = $license.Name -replace '[^A-Za-z0-9._-]', '_'
                    Copy-Item -LiteralPath $license.FullName -Destination (Join-Path $Destination "$safePackage-$safeName") -Force
                }
            }
        }
    }
}

$pluginRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$communityRoot = (Resolve-Path -LiteralPath (Join-Path $pluginRoot "..")).Path
$manifest = Get-Content -LiteralPath (Join-Path $pluginRoot "plugin.json") -Raw | ConvertFrom-Json

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $communityRoot "dist"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

if (-not $BuildRoot) {
    $BuildRoot = Join-Path ([IO.Path]::GetTempPath()) "psycheros-htf-music-listener-build"
}
$BuildRoot = [IO.Path]::GetFullPath($BuildRoot)
$buildParent = Split-Path -Parent $BuildRoot
if (-not $buildParent) { throw "BuildRoot must have a parent directory." }
New-Item -ItemType Directory -Path $buildParent -Force | Out-Null
Reset-BuildDirectory -Parent $buildParent -Path $BuildRoot

$workerOutput = Join-Path $BuildRoot "worker-dist"
New-Item -ItemType Directory -Path $workerOutput -Force | Out-Null
$buildPython = $PythonCommand

if ($WorkerExecutable) {
    $WorkerExecutable = (Resolve-Path -LiteralPath $WorkerExecutable).Path
} else {
    $venv = Join-Path $BuildRoot "pyinstaller-venv"
    & $PythonCommand -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw "Could not create the PyInstaller build environment." }
    $venvPython = Join-Path $venv "Scripts\python.exe"
    $buildPython = $venvPython
    & $venvPython -m pip install --disable-pip-version-check -r (Join-Path $pluginRoot "requirements-build.txt")
    if ($LASTEXITCODE -ne 0) { throw "Could not install the pinned release builder." }

    & $venvPython -m PyInstaller `
        --noconfirm `
        --clean `
        --onefile `
        --noupx `
        --name htf-worker `
        --distpath $workerOutput `
        --workpath (Join-Path $BuildRoot "pyinstaller-work") `
        --specpath (Join-Path $BuildRoot "pyinstaller-spec") `
        --exclude-module torch `
        --exclude-module torchvision `
        --exclude-module tensorflow `
        --exclude-module jax `
        --exclude-module cupy `
        (Join-Path $pluginRoot "worker\generate-htf.py")
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller could not build htf-worker.exe." }
    $WorkerExecutable = Join-Path $workerOutput "htf-worker.exe"
}

if (-not (Test-Path -LiteralPath $WorkerExecutable)) {
    throw "The HTF worker executable was not created: $WorkerExecutable"
}

$stageRoot = Join-Path $BuildRoot "stage"
$stagePlugin = Join-Path $stageRoot $manifest.id
Reset-BuildDirectory -Parent $BuildRoot -Path $stageRoot
New-Item -ItemType Directory -Path $stagePlugin -Force | Out-Null

$sourceItems = @(
    "plugin.json",
    "psycheros.ts",
    "deno.json",
    "README.md",
    "PRIVACY.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "THIRD_PARTY_NOTICES.md",
    "lib",
    "tests",
    "web",
    "worker"
)
foreach ($item in $sourceItems) {
    Copy-Item -LiteralPath (Join-Path $pluginRoot $item) -Destination $stagePlugin -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") -Destination (Join-Path $stagePlugin "LICENSE") -Force

$vendor = Join-Path $stagePlugin "vendor\windows-x86_64"
New-Item -ItemType Directory -Path $vendor -Force | Out-Null
Copy-Item -LiteralPath $WorkerExecutable -Destination (Join-Path $vendor "htf-worker.exe") -Force

$thirdParty = Join-Path $stagePlugin "third-party"
$pythonInfo = & $buildPython -c "import json, pathlib, site, sys; print(json.dumps({'prefix':sys.base_prefix,'sites':site.getsitepackages(),'version':sys.version}))"
if ($LASTEXITCODE -ne 0) { throw "Could not inspect the Python build runtime." }
$pythonMetadata = $pythonInfo | ConvertFrom-Json
$pythonLicense = Join-Path $pythonMetadata.prefix "LICENSE.txt"
if (Test-Path -LiteralPath $pythonLicense) {
    New-Item -ItemType Directory -Path (Join-Path $thirdParty "python") -Force | Out-Null
    Copy-Item -LiteralPath $pythonLicense -Destination (Join-Path $thirdParty "python\LICENSE.txt") -Force
}
Copy-LicenseMatches `
    -SearchRoots @($pythonMetadata.sites) `
    -PackagePrefixes @("numpy", "scipy", "matplotlib", "soundfile", "cffi", "pycparser") `
    -Destination (Join-Path $thirdParty "python-packages")

$workerHash = (Get-FileHash -LiteralPath $WorkerExecutable -Algorithm SHA256).Hash
$buildInfo = [ordered]@{
    plugin = $manifest.id
    version = $manifest.version
    builtAtUtc = [DateTime]::UtcNow.ToString("o")
    platform = "windows-x86_64"
    pyInstaller = "6.21.0"
    python = $pythonMetadata.version
    ffmpegBootstrap = [ordered]@{
        version = "8.1.1"
        archive = "ffmpeg-8.1.1-essentials_build.zip"
        url = "https://github.com/GyanD/codexffmpeg/releases/download/8.1.1/ffmpeg-8.1.1-essentials_build.zip"
        sha256 = "6f58ce889f59c311410f7d2b18895b33c03456463486f3b1ebc93d97a0f54541"
    }
    workerSha256 = $workerHash
}
$buildInfo | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $stagePlugin "build-info.json") -Encoding utf8

$legacyName = "$($manifest.id)-legacy-$($manifest.version)"
$legacyStage = Join-Path $stageRoot $legacyName
New-Item -ItemType Directory -Path $legacyStage -Force | Out-Null
foreach ($item in @(
    "README.md",
    "Install Legacy HTF Music Listener.bat",
    "Uninstall Legacy HTF Music Listener.bat",
    "tools",
    "browser"
)) {
    Copy-Item -LiteralPath (Join-Path $pluginRoot "legacy\$item") -Destination $legacyStage -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $communityRoot "LICENSE") -Destination (Join-Path $legacyStage "LICENSE") -Force
Copy-Item -LiteralPath (Join-Path $pluginRoot "PRIVACY.md") -Destination $legacyStage -Force
Copy-Item -LiteralPath (Join-Path $pluginRoot "SECURITY.md") -Destination $legacyStage -Force
Copy-Item -LiteralPath (Join-Path $pluginRoot "THIRD_PARTY_NOTICES.md") -Destination $legacyStage -Force
Copy-Item -LiteralPath $thirdParty -Destination (Join-Path $legacyStage "third-party") -Recurse -Force

$legacyCustomTools = Join-Path $legacyStage "custom-tool"
New-Item -ItemType Directory -Path $legacyCustomTools -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $pluginRoot "legacy\custom-tool\htf-music-listener.js") -Destination $legacyCustomTools -Force
$legacyBundle = Join-Path $legacyCustomTools "htf-music-listener"
New-Item -ItemType Directory -Path $legacyBundle -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $pluginRoot "psycheros.ts") -Destination $legacyBundle -Force
Copy-Item -LiteralPath (Join-Path $pluginRoot "lib") -Destination $legacyBundle -Recurse -Force
$legacyVendor = Join-Path $legacyBundle "vendor\windows-x86_64"
New-Item -ItemType Directory -Path $legacyVendor -Force | Out-Null
Copy-Item -LiteralPath $WorkerExecutable -Destination (Join-Path $legacyVendor "htf-worker.exe") -Force
$buildInfo | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $legacyBundle "build-info.json") -Encoding utf8

$safeVersion = $manifest.version -replace '[^A-Za-z0-9._-]', '-'
$zipName = "psycheros-htf-music-listener-$safeVersion-windows-x64.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -LiteralPath $stagePlugin -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
$hashPath = "$zipPath.sha256"
Set-Content -LiteralPath $hashPath -Value $hashLine -Encoding ascii

$legacyZipName = "psycheros-htf-music-listener-$safeVersion-legacy-windows-x64.zip"
$legacyZipPath = Join-Path $OutputDirectory $legacyZipName
if (Test-Path -LiteralPath $legacyZipPath) { Remove-Item -LiteralPath $legacyZipPath -Force }
Compress-Archive -LiteralPath $legacyStage -DestinationPath $legacyZipPath -CompressionLevel Optimal
$legacyHash = Get-FileHash -LiteralPath $legacyZipPath -Algorithm SHA256
$legacyHashLine = "$($legacyHash.Hash.ToLowerInvariant())  $legacyZipName"
$legacyHashPath = "$legacyZipPath.sha256"
Set-Content -LiteralPath $legacyHashPath -Value $legacyHashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
Write-Output "Legacy release: $legacyZipPath"
Write-Output "Legacy SHA-256: $($legacyHash.Hash.ToLowerInvariant())"
Write-Output "Worker: $WorkerExecutable"
