[CmdletBinding()]
param(
    [string]$OutputDirectory = "",
    [string]$BuildRoot = "",
    [string]$PythonCommand = "python",
    [string]$FfmpegRoot = "",
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

function Find-FfmpegRoot {
    param([string]$ConfiguredRoot)

    if ($ConfiguredRoot) {
        $resolved = (Resolve-Path -LiteralPath $ConfiguredRoot).Path
        if (Test-Path -LiteralPath (Join-Path $resolved "ffmpeg.exe")) {
            return $resolved
        }
        if (Test-Path -LiteralPath (Join-Path $resolved "bin\ffmpeg.exe")) {
            return (Join-Path $resolved "bin")
        }
        throw "FfmpegRoot does not contain ffmpeg.exe and ffprobe.exe: $resolved"
    }

    $command = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
    if ($command) {
        return Split-Path -Parent $command.Source
    }

    $winget = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $winget) {
        $found = Get-ChildItem -LiteralPath $winget -Filter ffmpeg.exe -File -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($found) {
            return $found.Directory.FullName
        }
    }

    throw "FFmpeg was not found. Pass -FfmpegRoot or install Gyan.FFmpeg.Essentials for the release build."
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

$ffmpegBin = Find-FfmpegRoot -ConfiguredRoot $FfmpegRoot
$ffmpegExe = Join-Path $ffmpegBin "ffmpeg.exe"
$ffprobeExe = Join-Path $ffmpegBin "ffprobe.exe"
if (-not (Test-Path -LiteralPath $ffprobeExe)) {
    throw "ffprobe.exe was not found beside ffmpeg.exe."
}
$ffmpegPackageRoot = Split-Path -Parent $ffmpegBin

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
Copy-Item -LiteralPath $ffmpegExe -Destination (Join-Path $vendor "ffmpeg.exe") -Force
Copy-Item -LiteralPath $ffprobeExe -Destination (Join-Path $vendor "ffprobe.exe") -Force

$thirdParty = Join-Path $stagePlugin "third-party"
$ffmpegNotices = Join-Path $thirdParty "ffmpeg"
New-Item -ItemType Directory -Path $ffmpegNotices -Force | Out-Null
foreach ($name in @("LICENSE", "README.txt")) {
    $candidate = Join-Path $ffmpegPackageRoot $name
    if (Test-Path -LiteralPath $candidate) {
        Copy-Item -LiteralPath $candidate -Destination $ffmpegNotices -Force
    }
}

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

$ffmpegVersion = (& $ffmpegExe -version | Select-Object -First 1)
$workerHash = (Get-FileHash -LiteralPath $WorkerExecutable -Algorithm SHA256).Hash
$buildInfo = [ordered]@{
    plugin = $manifest.id
    version = $manifest.version
    builtAtUtc = [DateTime]::UtcNow.ToString("o")
    platform = "windows-x86_64"
    pyInstaller = "6.21.0"
    python = $pythonMetadata.version
    ffmpeg = $ffmpegVersion
    workerSha256 = $workerHash
}
$buildInfo | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $stagePlugin "build-info.json") -Encoding utf8

$safeVersion = $manifest.version -replace '[^A-Za-z0-9._-]', '-'
$zipName = "psycheros-htf-music-listener-$safeVersion-windows-x64.zip"
$zipPath = Join-Path $OutputDirectory $zipName
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -LiteralPath $stagePlugin -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
$hashLine = "$($hash.Hash.ToLowerInvariant())  $zipName"
$hashPath = "$zipPath.sha256"
Set-Content -LiteralPath $hashPath -Value $hashLine -Encoding ascii

Write-Output "Release: $zipPath"
Write-Output "SHA-256: $($hash.Hash.ToLowerInvariant())"
Write-Output "Worker: $WorkerExecutable"
Write-Output "FFmpeg: $ffmpegExe"
