[CmdletBinding()]
param(
  [switch]$Release
)

# Builds the Capacitor APK and publishes it for sideloading at
# https://ayrien.se/heo/download/TimConHeo.apk

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$tools = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "..\.tools"))
$downloads = "C:\ProgramData\TimConHeo\downloads"

$javaHome = Join-Path $tools "jdk"
$androidHome = Join-Path $tools "android-sdk"
if (-not (Test-Path $javaHome)) { throw "JDK not found at $javaHome" }
if (-not (Test-Path $androidHome)) { throw "Android SDK not found at $androidHome" }

New-Item -ItemType Directory -Force -Path $downloads | Out-Null

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:Path = (Join-Path $javaHome "bin") + ";" + $env:Path
# Gradle fails with "Unable to establish loopback connection" when TEMP sits
# under the OneDrive-synced profile. WatchTalk's push.ps1 uses the same fix.
New-Item -ItemType Directory -Force -Path "C:\Temp" | Out-Null
$env:TEMP = "C:\Temp"
$env:TMP = "C:\Temp"

Push-Location $projectRoot
try {
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npm.cmd run build:android 2>&1 | ForEach-Object { "$_" }
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorAction
  if ($exit -ne 0) { throw "Capacitor sync failed." }

  Push-Location (Join-Path $projectRoot "android")
  try {
    $task = if ($Release) { "assembleRelease" } else { "assembleDebug" }
    $ErrorActionPreference = "Continue"
    & .\gradlew.bat $task --no-daemon 2>&1 | ForEach-Object { "$_" }
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    if ($exit -ne 0) { throw "Gradle $task failed." }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}

$flavour = if ($Release) { "release" } else { "debug" }
$apk = Join-Path $projectRoot "android\app\build\outputs\apk\$flavour\app-$flavour.apk"
if (-not (Test-Path $apk)) { throw "Built APK not found: $apk" }
Copy-Item -LiteralPath $apk -Destination (Join-Path $downloads "TimConHeo.apk") -Force

$size = [Math]::Round((Get-Item $apk).Length / 1MB, 1)
Write-Host "Published TimConHeo.apk ($size MB) -> https://ayrien.se/heo/download/TimConHeo.apk" -ForegroundColor Green
