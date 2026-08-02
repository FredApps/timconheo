[CmdletBinding()]
param(
    [switch]$Web,
    [switch]$Content,
    [switch]$Android,
    [switch]$All,
    [string]$Destination = "C:\inetpub\wwwroot\heo"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
$destinationRoot = [System.IO.Path]::GetPathRoot($destinationPath)

if ($destinationPath -eq $destinationRoot -or $destinationPath.Length -lt ($destinationRoot.Length + 4)) {
    throw "Refusing to deploy to a broad destination: $destinationPath"
}

if (-not $Web -and -not $Content -and -not $Android -and -not $All) {
    $All = $true
}

function Invoke-SafeRobocopy {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Target,
        [string[]]$ExtraArguments = @()
    )

    $sourcePath = [System.IO.Path]::GetFullPath($Source)
    $targetPath = [System.IO.Path]::GetFullPath($Target)
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Source does not exist: $sourcePath"
    }
    New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    & robocopy $sourcePath $targetPath /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS @ExtraArguments
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed with exit code $LASTEXITCODE"
    }
}

if ($Web -or $All) {
    Push-Location $projectRoot
    $previousBasePath = $env:BASE_PATH
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        $env:BASE_PATH = "/heo"
        npm run build:web
        if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    }
    finally {
        $env:BASE_PATH = $previousBasePath
        Pop-Location
    }

    Invoke-SafeRobocopy -Source (Join-Path $projectRoot "dist\client") -Target $destinationPath -ExtraArguments @("/XF", "TimConHeo.apk", "/XD", "content", "audio")
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "heo.Web.config") -Destination (Join-Path $destinationPath "Web.config") -Force
}

if ($Content -or $All) {
    $contentSource = Join-Path $projectRoot "corpus\published"
    if (Test-Path -LiteralPath $contentSource) {
        Invoke-SafeRobocopy -Source $contentSource -Target (Join-Path $destinationPath "content")
    }
    elseif ($Content) {
        throw "No published corpus found at $contentSource"
    }
}

if ($Android -or $All) {
    $toolsPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "..\.tools"))
    $javaPath = Join-Path $toolsPath "jdk"
    $androidSdkPath = Join-Path $toolsPath "android-sdk"
    if (-not (Test-Path -LiteralPath $javaPath) -or -not (Test-Path -LiteralPath $androidSdkPath)) {
        throw "Android toolchain not found under $toolsPath"
    }

    Push-Location $projectRoot
    $previousBasePath = $env:BASE_PATH
    $previousJavaHome = $env:JAVA_HOME
    $previousAndroidHome = $env:ANDROID_HOME
    $previousPath = $env:Path
    try {
        $env:BASE_PATH = ""
        $env:JAVA_HOME = $javaPath
        $env:ANDROID_HOME = $androidSdkPath
        $env:Path = (Join-Path $javaPath "bin") + ";" + $previousPath
        npm run build:android
        if ($LASTEXITCODE -ne 0) { throw "Android web sync failed" }
        Push-Location (Join-Path $projectRoot "android")
        try {
            .\gradlew.bat assembleDebug --no-daemon
            if ($LASTEXITCODE -ne 0) { throw "Android build failed" }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        $env:BASE_PATH = $previousBasePath
        $env:JAVA_HOME = $previousJavaHome
        $env:ANDROID_HOME = $previousAndroidHome
        $env:Path = $previousPath
        Pop-Location
    }

    $apkSource = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path -LiteralPath $apkSource)) { throw "Built APK not found: $apkSource" }
    New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null
    Copy-Item -LiteralPath $apkSource -Destination (Join-Path $destinationPath "TimConHeo-debug.apk") -Force
}

Write-Host "Tìm Con Heo deployed to $destinationPath"
