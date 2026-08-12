[CmdletBinding()]
param(
  [string]$TaskName = "TimConHeoServer",
  [string]$StateFile = "C:\ProgramData\TimConHeo\health-watch.json"
)
$ErrorActionPreference = "Continue"
$state = @{ failures = 0; lastOk = $null; lastFailure = $null }
if (Test-Path $StateFile) {
  try {
    $saved = Get-Content $StateFile -Raw | ConvertFrom-Json
    $state.failures = [int]$saved.failures
    $state.lastOk = $saved.lastOk
    $state.lastFailure = $saved.lastFailure
  } catch {}
}
try {
  $health = Invoke-RestMethod "http://127.0.0.1:3092/heo/api/health" -TimeoutSec 8
  # v0.6 exposes only `ok`; v0.7 adds the database probe. This keeps the
  # operational repair backwards-compatible while enforcing the richer probe
  # as soon as the v0.7 server is active.
  if (-not $health.ok -or ($null -ne $health.database -and -not $health.database.ok)) {
    throw "Health endpoint is degraded."
  }
  $state.failures = 0
  $state.lastOk = (Get-Date).ToUniversalTime().ToString("o")
} catch {
  $state.failures = [int]$state.failures + 1
  $state.lastFailure = (Get-Date).ToUniversalTime().ToString("o")
  if ($state.failures -ge 3) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Start-ScheduledTask -TaskName $TaskName
    $state.failures = 0
  }
}
$state | ConvertTo-Json | Set-Content -LiteralPath $StateFile -Encoding UTF8
