[CmdletBinding()]
param([string]$AppDir = "C:\ProgramData\TimConHeo\current")

# Task Scheduler owns the SYSTEM/boot boundary. This foreground wrapper owns
# child restart, predictable working-directory, and bounded structured logs.
$ErrorActionPreference = "Stop"
$node = "C:\Program Files\nodejs\node.exe"
$logDir = "C:\ProgramData\TimConHeo\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

foreach ($name in @("server.out.log", "server.err.log", "service.jsonl")) {
  $file = Join-Path $logDir $name
  if ((Test-Path $file) -and (Get-Item $file).Length -gt 5MB) {
    $archive = "$file.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Move-Item -LiteralPath $file -Destination $archive
  }
}
Get-ChildItem $logDir -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force

Set-Location $AppDir
while ($true) {
  $started = Get-Date
  @{ event = "start"; at = $started.ToUniversalTime().ToString("o"); appDir = $AppDir } |
    ConvertTo-Json -Compress | Add-Content -LiteralPath "$logDir\service.jsonl"

  & $node "$AppDir\dist\server\heo-server.js" 1>> "$logDir\server.out.log" 2>> "$logDir\server.err.log"
  $code = $LASTEXITCODE
  @{ event = "exit"; at = (Get-Date).ToUniversalTime().ToString("o"); code = $code; uptimeSeconds = [int]((Get-Date) - $started).TotalSeconds } |
    ConvertTo-Json -Compress | Add-Content -LiteralPath "$logDir\service.jsonl"

  # The SYSTEM task remains the supervisor boundary. Keeping that task alive
  # makes child-process recovery deterministic even when Task Scheduler marks
  # a force-killed Node child as a cancelled action instead of a failure.
  Start-Sleep -Seconds 5
}
