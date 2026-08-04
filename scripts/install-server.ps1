[CmdletBinding()]
param(
  [string]$AppDir = "C:\ProgramData\TimConHeo\app",
  [string]$WebConfig = "C:\inetpub\wwwroot\web.config",
  [string]$ServiceUser = "Ingenitus"
)

# Installs Tim Con Heo the same way Listen is installed on this box:
#   Node/Express on 127.0.0.1:3092 behind an IIS reverse proxy at /heo,
#   supervised from the user's Run key, data in C:\ProgramData\TimConHeo.

$ErrorActionPreference = "Stop"
$Node = "C:\Program Files\nodejs\node.exe"
$Npm = "C:\Program Files\nodejs\npm.cmd"
$DataDir = "C:\ProgramData\TimConHeo"
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path

foreach ($directory in @($DataDir, "$DataDir\logs", "$DataDir\backups", $AppDir)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

if (-not (Test-Path "$AppDir\.env")) {
  $seedPasswordSecure = Read-Host "Enter the initial Tim Con Heo admin password" -AsSecureString
  $seedPasswordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seedPasswordSecure)
  try {
    $seedPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($seedPasswordPtr)
    if ([string]::IsNullOrWhiteSpace($seedPassword) -or $seedPassword.Length -lt 6) {
      throw "The initial admin password must contain at least 6 characters."
    }
    @"
HOST=127.0.0.1
PORT=3092
HEO_DATA_DIR=C:\ProgramData\TimConHeo
HEO_SECURE_COOKIES=1
HEO_ALLOW_SIGNUPS=0
HEO_SEED_USER=fredrik
HEO_SEED_PASSWORD=$seedPassword
"@ | Set-Content -LiteralPath "$AppDir\.env" -Encoding ASCII
  } finally {
    if ($seedPasswordPtr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($seedPasswordPtr)
    }
    Remove-Variable seedPassword -ErrorAction SilentlyContinue
  }
}

# Publish sources to the app directory. /MIR would wipe .env, node_modules and
# the database, so mirror only the code and copy the rest deliberately.
Write-Host "==> Publishing to $AppDir" -ForegroundColor Cyan
foreach ($folder in @("app", "server", "shared", "scripts", "public")) {
  & robocopy (Join-Path $projectRoot $folder) (Join-Path $AppDir $folder) /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -gt 7) { throw "robocopy failed for $folder (exit $LASTEXITCODE)" }
}
foreach ($file in @("package.json", "package-lock.json", "index.html", "vite.config.ts", "tsconfig.json", "tsconfig.client.json", "tsconfig.server.json", "tsconfig.tests.json")) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $AppDir $file) -Force
}


# Keep the health endpoint tied to the exact source revision that was installed.
$deployedCommit = (& git -C $projectRoot rev-parse HEAD).Trim()
if ($deployedCommit -and (Test-Path "$AppDir\.env")) {
  $envPath = "$AppDir\.env"
  $envText = Get-Content -LiteralPath $envPath -Raw
  if ($envText -match "(?m)^HEO_COMMIT=") {
    $envText = [regex]::Replace($envText, "(?m)^HEO_COMMIT=.*$", "HEO_COMMIT=$deployedCommit")
  } else {
    $envText = $envText.TrimEnd() + [Environment]::NewLine + "HEO_COMMIT=$deployedCommit" + [Environment]::NewLine
  }
  Set-Content -LiteralPath $envPath -Value $envText -Encoding ASCII
}
Push-Location $AppDir
try {
  # Vite and tsc write progress to stderr even on success. Under
  # $ErrorActionPreference = "Stop" that stderr is promoted to a terminating
  # error and would abort a perfectly good build, so gate on the exit code.
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $Npm ci --omit=dev --no-audit --no-fund 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $previousErrorAction; throw "npm ci (runtime) failed." }
  & $Npm install --no-audit --no-fund 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $previousErrorAction; throw "npm install (build tools) failed." }
  & $Npm run build 2>&1 | ForEach-Object { "$_" }
  $buildExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorAction
  if ($buildExitCode -ne 0) { throw "Tim Con Heo build failed." }
} finally {
  Pop-Location
}

# Stop any previous supervisor or server before swapping binaries.
$escapedAppDir = [regex]::Escape($AppDir)
$running = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    ($_.Name -eq "powershell.exe" -and $_.CommandLine -match "$escapedAppDir[\\/]scripts[\\/]start-server\.ps1") -or
    ($_.Name -eq "node.exe" -and $_.CommandLine -match "$escapedAppDir[\\/]dist[\\/]server[\\/]server\.js")
  )
})
foreach ($process in $running) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

$PowerShell = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$supervisor = "$AppDir\scripts\start-server.ps1"
$supervisorCommand = "`"$PowerShell`" -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$supervisor`" -AppDir `"$AppDir`""
$serviceSid = ([Security.Principal.NTAccount]$ServiceUser).Translate([Security.Principal.SecurityIdentifier]).Value
$runKey = "Registry::HKEY_USERS\$serviceSid\Software\Microsoft\Windows\CurrentVersion\Run"
New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name "TimConHeoSupervisor" -Value $supervisorCommand

# IIS: /heo must NOT be a child application, or it would shadow the rewrite.
Import-Module WebAdministration
if (Get-WebApplication -Site "Default Web Site" -Name "heo" -ErrorAction SilentlyContinue) {
  Remove-WebApplication -Site "Default Web Site" -Name "heo"
  Write-Host "==> Removed the old static /heo IIS application" -ForegroundColor Yellow
}
if (Test-Path "IIS:\AppPools\TimConHeo") { Remove-WebAppPool -Name "TimConHeo" }

if (-not (Test-Path $WebConfig)) { throw "IIS web.config not found: $WebConfig" }
$webBackup = "$WebConfig.heo.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item -LiteralPath $WebConfig -Destination $webBackup
[xml]$xml = Get-Content -LiteralPath $WebConfig -Raw
$rules = $xml.configuration.'system.webServer'.rewrite.rules
$existing = $rules.SelectSingleNode("rule[@name='Tim Con Heo reverse proxy']")
if ($existing) { $rules.RemoveChild($existing) | Out-Null }
$rule = $xml.CreateElement("rule")
$rule.SetAttribute("name", "Tim Con Heo reverse proxy")
$rule.SetAttribute("enabled", "true")
$rule.SetAttribute("stopProcessing", "true")
$match = $xml.CreateElement("match")
$match.SetAttribute("url", "^heo(/.*)?$")
$action = $xml.CreateElement("action")
$action.SetAttribute("type", "Rewrite")
$action.SetAttribute("url", "http://127.0.0.1:3092/heo{R:1}")
$action.SetAttribute("appendQueryString", "true")
$rule.AppendChild($match) | Out-Null
$rule.AppendChild($action) | Out-Null
$listen = $rules.SelectSingleNode("rule[@name='Listen reverse proxy']")
if ($listen) { $rules.InsertBefore($rule, $listen) | Out-Null } else { $rules.AppendChild($rule) | Out-Null }
$xml.Save($WebConfig)

$startup = ([wmiclass]"Win32_ProcessStartup").CreateInstance()
$startup.ShowWindow = 0
$started = ([wmiclass]"Win32_Process").Create($supervisorCommand, $AppDir, $startup)
if ($started.ReturnValue -ne 0) { throw "Supervisor failed to start (Win32 error $($started.ReturnValue))." }

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  if (Test-NetConnection -ComputerName 127.0.0.1 -Port 3092 -InformationLevel Quiet -WarningAction SilentlyContinue) { $ready = $true; break }
}
if (-not $ready) { throw "Tim Con Heo did not start on port 3092. See $DataDir\logs\server.err.log" }

Write-Host "Tim Con Heo installed and running at https://ayrien.se/heo/" -ForegroundColor Green
Write-Host "IIS backup: $webBackup"

