[CmdletBinding()]
param(
  [string]$AppDir = "C:\ProgramData\TimConHeo\app"
)

# Supervisor: keeps the Tim Con Heo server up across crashes and reboots.
# Launched from the per-user Run key by install-server.ps1.

$ErrorActionPreference = "Continue"
$node = "C:\Program Files\nodejs\node.exe"
$logDir = "C:\ProgramData\TimConHeo\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Set-Location $AppDir

while ($true) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath "$logDir\supervisor.log" -Value "[$stamp] starting server"
  & $node "$AppDir\dist\server\server.js" `
    >> "$logDir\server.out.log" `
    2>> "$logDir\server.err.log"
  $code = $LASTEXITCODE
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath "$logDir\supervisor.log" -Value "[$stamp] server exited with code $code; restarting in 5s"
  Start-Sleep -Seconds 5
}
