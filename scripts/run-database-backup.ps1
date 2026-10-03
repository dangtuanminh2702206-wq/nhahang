param(
  [ValidateSet('export','restore-local')][string]$Mode = 'export',
  [string]$ArchivePath,
  [Parameter(Mandatory=$true)][string]$ToolsDirectory,
  [Parameter(Mandatory=$true)][string]$CertificatePath
)
$ErrorActionPreference = 'Stop'
# A Windows-user-bound DPAPI key never enters Git, terminal output or plaintext files.
Add-Type -AssemblyName System.Security
$taskRepo = Split-Path -Parent $PSScriptRoot
$taskKeyDirectory = Join-Path $env:LOCALAPPDATA 'MocViBackupKeys'
$taskArchiveDirectory = Join-Path $env:LOCALAPPDATA 'MocViBackups'
foreach ($taskDirectory in @($taskKeyDirectory,$taskArchiveDirectory)) {
  if (-not (Test-Path -LiteralPath $taskDirectory)) {
    New-Item -ItemType Directory -Path $taskDirectory | Out-Null
  }
  # Only write a new DACL; do not copy SACL/owner fields requiring elevated privileges.
  $taskAcl = [System.Security.AccessControl.DirectorySecurity]::new()
  $taskAcl.SetAccessRuleProtection($true,$false)
  $taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $taskRule = [System.Security.AccessControl.FileSystemAccessRule]::new($taskUser,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $taskAcl.AddAccessRule($taskRule)
  [System.IO.FileSystemAclExtensions]::SetAccessControl([System.IO.DirectoryInfo]::new($taskDirectory),$taskAcl)
}
$taskKeyFile = Join-Path $taskKeyDirectory 'database-key.dpapi'
if (-not (Test-Path -LiteralPath $taskKeyFile)) {
  if ($Mode -eq 'restore-local') { throw 'Backup key missing: do not generate a replacement for an existing archive.' }
  $taskRandomKey = [byte[]]::new(32)
  $taskRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $taskRandom.GetBytes($taskRandomKey) } finally { $taskRandom.Dispose() }
  $taskProtected = [System.Security.Cryptography.ProtectedData]::Protect($taskRandomKey,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  $taskStream = [System.IO.File]::Open($taskKeyFile,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write)
  try { $taskStream.Write($taskProtected,0,$taskProtected.Length) } finally { $taskStream.Dispose(); [Array]::Clear($taskRandomKey,0,$taskRandomKey.Length) }
}
if (-not $ArchivePath) {
  if ($Mode -ne 'export') { throw 'Restore requires an explicit archive path.' }
  $ArchivePath = Join-Path $taskArchiveDirectory ('mocvi-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.mocvi.enc')
}
$taskOriginalKey = $env:DATABASE_BACKUP_KEY
$taskOriginalTools = $env:PG_TOOLS_DIR
$taskOriginalCertificate = $env:PGSSLROOTCERT
$taskKey = $null
Push-Location $taskRepo
try {
  $taskKey = [System.Security.Cryptography.ProtectedData]::Unprotect([System.IO.File]::ReadAllBytes($taskKeyFile),$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
  $env:DATABASE_BACKUP_KEY = [System.Convert]::ToHexString($taskKey)
  $env:PG_TOOLS_DIR = (Resolve-Path -LiteralPath $ToolsDirectory).Path
  $env:PGSSLROOTCERT = (Resolve-Path -LiteralPath $CertificatePath).Path
  node --env-file=.env.local scripts/database-backup.mjs $Mode $ArchivePath
  if ($LASTEXITCODE -ne 0) { throw 'Backup/restore failed; no acceptance is recorded.' }
  Write-Output ('Archive: '+$ArchivePath)
  Write-Output 'Key protected with Windows CurrentUser DPAPI. Off-site key portability/recovery is NOT yet established.'
} finally {
  $env:DATABASE_BACKUP_KEY = $taskOriginalKey
  $env:PG_TOOLS_DIR = $taskOriginalTools
  $env:PGSSLROOTCERT = $taskOriginalCertificate
  if ($taskKey) { [Array]::Clear($taskKey,0,$taskKey.Length) }
  Pop-Location
}
