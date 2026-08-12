[CmdletBinding()]
param(
  [string]$DataDir = "C:\ProgramData\TimConHeo",
  [string]$WebConfig = "C:\inetpub\wwwroot\web.config"
)

$ErrorActionPreference = "Stop"
$Node = "C:\Program Files\nodejs\node.exe"
$Npm = "C:\Program Files\nodejs\npm.cmd"
$PowerShell = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$commit = (& git -C $projectRoot rev-parse HEAD).Trim()
$releaseRoot = Join-Path $DataDir "releases"
$releaseDir = Join-Path $releaseRoot $commit
$currentDir = Join-Path $DataDir "current"
$nextLink = Join-Path $DataDir "current.next"
$previousLink = Join-Path $DataDir "current.previous"
$sharedEnv = Join-Path $DataDir ".env"
$backupKey = Join-Path $DataDir "backups\.backup-key"

foreach ($directory in @($DataDir, "$DataDir\logs", "$DataDir\backups", "$DataDir\downloads", $releaseRoot)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

if (-not (Test-Path $sharedEnv)) {
  $legacyEnv = Join-Path $DataDir "app\.env"
  if (Test-Path $legacyEnv) { Copy-Item $legacyEnv $sharedEnv }
  else {
    $secure = Read-Host "Enter the initial Tim Con Heo admin password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
      if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 6) { throw "Password must contain at least 6 characters." }
      @"
HOST=127.0.0.1
PORT=3092
HEO_DATA_DIR=$DataDir
HEO_SECURE_COOKIES=1
HEO_ALLOW_SIGNUPS=0
HEO_SEED_USER=fredrik
HEO_SEED_PASSWORD=$password
"@ | Set-Content $sharedEnv -Encoding ASCII
    } finally {
      if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    }
  }
}

if (-not (Test-Path $backupKey)) {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  [Convert]::ToBase64String($bytes) | Set-Content -LiteralPath $backupKey -Encoding ASCII
}
$env:HEO_BACKUP_KEY_FILE = $backupKey
if ((Get-Content $sharedEnv -Raw) -notmatch "(?m)^HEO_BACKUP_KEY_FILE=") {
  Add-Content -LiteralPath $sharedEnv -Value "HEO_BACKUP_KEY_FILE=$backupKey" -Encoding ASCII
}

# A consistent pre-release backup is the database rollback boundary. A fresh
# install has no database yet and therefore nothing to back up.
if (Test-Path (Join-Path $DataDir "timconheo.sqlite3")) {
  Push-Location $projectRoot
  try { & $Npm run backup; if ($LASTEXITCODE -ne 0) { throw "Database backup failed." } }
  finally { Pop-Location }
}

if (Test-Path $releaseDir) { Remove-Item -LiteralPath $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseDir | Out-Null
foreach ($folder in @("app", "server", "shared", "scripts", "public")) {
  & robocopy (Join-Path $projectRoot $folder) (Join-Path $releaseDir $folder) /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -gt 7) { throw "robocopy failed for $folder" }
}
foreach ($file in @("package.json", "package-lock.json", "index.html", "vite.config.ts", "tsconfig.json", "tsconfig.client.json", "tsconfig.server.json", "tsconfig.tests.json")) {
  Copy-Item (Join-Path $projectRoot $file) $releaseDir -Force
}
$envText = Get-Content $sharedEnv -Raw
if ($envText -match "(?m)^HEO_COMMIT=") { $envText = [regex]::Replace($envText, "(?m)^HEO_COMMIT=.*$", "HEO_COMMIT=$commit") }
else { $envText = $envText.TrimEnd() + [Environment]::NewLine + "HEO_COMMIT=$commit" + [Environment]::NewLine }
Set-Content $sharedEnv $envText -Encoding ASCII
Copy-Item $sharedEnv (Join-Path $releaseDir ".env") -Force

Push-Location $releaseDir
try {
  & $Npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
  & $Npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed." }
} finally { Pop-Location }

Stop-ScheduledTask -TaskName "TimConHeoServer" -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'TimConHeo.+dist[\\/]server[\\/]server\.js' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
# The v0.6 emergency process was launched from its working directory, so its
# command line may not include the app path. Stop only a Node process proven to
# own the app's loopback port; never terminate an unrelated process by name.
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 3092 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object {
    $listener = Get-CimInstance Win32_Process -Filter "ProcessId = $_"
    if ($listener.Name -eq "node.exe" -and $listener.CommandLine -match 'dist[\\/]server[\\/]server\.js') {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
  }

foreach ($pathToClear in @($nextLink, $previousLink)) {
  if (Test-Path $pathToClear) { Remove-Item -LiteralPath $pathToClear -Force }
}
New-Item -ItemType Junction -Path $nextLink -Target $releaseDir | Out-Null
if (Test-Path $currentDir) { Move-Item -LiteralPath $currentDir -Destination $previousLink }
Move-Item -LiteralPath $nextLink -Destination $currentDir

$serverAction = New-ScheduledTaskAction -Execute $PowerShell -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$currentDir\scripts\start-server.ps1`" -AppDir `"$currentDir`""
$serverSettings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "TimConHeoServer" -Action $serverAction -Trigger (New-ScheduledTaskTrigger -AtStartup) -Settings $serverSettings -Principal $principal -Force | Out-Null

$watchAction = New-ScheduledTaskAction -Execute $PowerShell -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$currentDir\scripts\health-watch.ps1`""
$watchTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName "TimConHeoHealthWatch" -Action $watchAction -Trigger $watchTrigger -Principal $principal -Force | Out-Null

# Remove the obsolete per-user startup hook.
Get-ChildItem Registry::HKEY_USERS | ForEach-Object {
  Remove-ItemProperty -Path "$($_.PSPath)\Software\Microsoft\Windows\CurrentVersion\Run" -Name "TimConHeoSupervisor" -ErrorAction SilentlyContinue
}

# Keep IIS as a reverse proxy; /heo is not an IIS child application.
Import-Module WebAdministration
if (Get-WebApplication -Site "Default Web Site" -Name "heo" -ErrorAction SilentlyContinue) { Remove-WebApplication -Site "Default Web Site" -Name "heo" }
if (-not (Test-Path $WebConfig)) { throw "IIS web.config not found: $WebConfig" }
[xml]$xml = Get-Content $WebConfig -Raw
$rules = $xml.configuration.'system.webServer'.rewrite.rules
$existing = $rules.SelectSingleNode("rule[@name='Tim Con Heo reverse proxy']")
if ($existing) { $rules.RemoveChild($existing) | Out-Null }
$rule = $xml.CreateElement("rule"); $rule.SetAttribute("name", "Tim Con Heo reverse proxy"); $rule.SetAttribute("enabled", "true"); $rule.SetAttribute("stopProcessing", "true")
$match = $xml.CreateElement("match"); $match.SetAttribute("url", "^heo(/.*)?$")
$action = $xml.CreateElement("action"); $action.SetAttribute("type", "Rewrite"); $action.SetAttribute("url", "http://127.0.0.1:3092/heo{R:1}"); $action.SetAttribute("appendQueryString", "true")
$rule.AppendChild($match) | Out-Null; $rule.AppendChild($action) | Out-Null; $rules.PrependChild($rule) | Out-Null
$xml.Save($WebConfig)

& icacls $DataDir /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" | Out-Null
Start-ScheduledTask -TaskName "TimConHeoServer"
$healthy = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Milliseconds 500
  try { $health = Invoke-RestMethod "http://127.0.0.1:3092/heo/api/health" -TimeoutSec 2; if ($health.ok -and $health.commit -eq $commit) { $healthy = $true; break } } catch {}
}
if (-not $healthy) {
  Stop-ScheduledTask -TaskName "TimConHeoServer" -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $currentDir -Force
  if (Test-Path $previousLink) { Move-Item -LiteralPath $previousLink -Destination $currentDir; Start-ScheduledTask -TaskName "TimConHeoServer" }
  throw "New release failed health verification; previous release restored."
}
if (Test-Path $previousLink) { Remove-Item -LiteralPath $previousLink -Force }
Write-Host "Tim Con Heo $commit is healthy at https://ayrien.se/heo/" -ForegroundColor Green
