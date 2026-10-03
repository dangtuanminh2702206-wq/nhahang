param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
# Human enters this new recovery credential; never put it in command arguments or chat.
$taskSecret=Read-Host 'New separate recovery passphrase (minimum 16 characters)' -AsSecureString
$taskConfirm=Read-Host 'Confirm recovery passphrase' -AsSecureString
$taskFirst=[IntPtr]::Zero; $taskSecond=[IntPtr]::Zero; $taskKey=$null
try {
  $taskFirst=[Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($taskSecret)
  $taskSecond=[Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($taskConfirm)
  $taskPass=[Runtime.InteropServices.Marshal]::PtrToStringUni($taskFirst)
  $taskCheck=[Runtime.InteropServices.Marshal]::PtrToStringUni($taskSecond)
  if($taskPass.Length -lt 16 -or $taskPass -cne $taskCheck) { throw 'Passphrase too short or confirmation mismatch' }
  $taskKey=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $env:LOCALAPPDATA 'MocViBackupKeys\database-key.dpapi')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  Push-Location (Split-Path -Parent $PSScriptRoot)
  try {
    @{key=[Convert]::ToHexString($taskKey);passphrase=$taskPass} | ConvertTo-Json -Compress | node scripts/backup-recovery-key.mjs $OutputPath
    if($LASTEXITCODE -ne 0) { throw 'Encrypted recovery key was not exported' }
  } finally { Pop-Location }
} finally {
  if($taskFirst -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($taskFirst) }
  if($taskSecond -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($taskSecond) }
  if($taskKey) { [Array]::Clear($taskKey,0,$taskKey.Length) }
  $taskPass=$null; $taskCheck=$null; $taskSecret.Dispose(); $taskConfirm.Dispose()
}
