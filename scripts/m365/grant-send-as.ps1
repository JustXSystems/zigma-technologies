<#
.SYNOPSIS
  Lets the website's sending mailbox send as other addresses (Admin -> Email -> From address).

.DESCRIPTION
  Idempotent. Safe to re-run. For each -FromAddress it will:
    1. Check the address is a mailbox (shared or user) in Exchange Online.
    2. Grant the sending mailbox "Send As" on it (Add-RecipientPermission).
    3. For shared mailboxes, keep a copy of sent mail in that mailbox's own Sent Items (MessageCopyForSentAsEnabled).

  Use this when an app registration already exists (e.g. created by your infra team) and you only need the
  website to show a different From address than the mailbox the app is authorised for.

  Run as an Exchange Administrator. Works in Windows PowerShell 5.1 and PowerShell 7.

.EXAMPLE
  .\scripts\m365\grant-send-as.ps1 -SenderMailbox quotation@zigma-technologies.com -FromAddress webmaster@zigma-technologies.com

.EXAMPLE
  # Several From addresses (e.g. a different one for careers emails)
  .\scripts\m365\grant-send-as.ps1 -SenderMailbox quotation@zigma-technologies.com -FromAddress webmaster@zigma-technologies.com,careers@zigma-technologies.com
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[^@\s]+@[^@\s]+\.[^@\s]+$')]
  [string]$SenderMailbox,

  [Parameter(Mandatory = $true)]
  [string[]]$FromAddress,

  [switch]$SkipSentItemsCopy
)

$ErrorActionPreference = 'Stop'
$SenderMailbox = $SenderMailbox.Trim().ToLowerInvariant()
$targets = @($FromAddress | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "    [ok] $Text" -ForegroundColor Green }
function Write-Note([string]$Text) { Write-Host "    $Text" -ForegroundColor DarkGray }

Write-Step 'Checking PowerShell module'
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
  Write-Note 'Installing ExchangeOnlineManagement (CurrentUser scope)...'
  Install-Module ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
}
Import-Module ExchangeOnlineManagement -ErrorAction Stop | Out-Null
Write-Ok 'Module ready'

Write-Step 'Connecting to Exchange Online (approve the browser prompt)'
Connect-ExchangeOnline -ShowBanner:$false
Write-Ok 'Connected'

$sender = Get-EXOMailbox -Identity $SenderMailbox -ErrorAction SilentlyContinue
if (-not $sender) { throw "Sending mailbox $SenderMailbox was not found." }
Write-Ok "Sending mailbox $($sender.PrimarySmtpAddress) ($($sender.RecipientTypeDetails))"

foreach ($addr in $targets) {
  Write-Step "From address $addr"
  if ($addr -eq $SenderMailbox) { Write-Note 'Same as the sending mailbox; nothing to do.'; continue }
  $mbx = Get-EXOMailbox -Identity $addr -ErrorAction SilentlyContinue
  if (-not $mbx) {
    Write-Warning "$addr is not a mailbox in this tenant. Create it as a shared mailbox first."
    continue
  }
  if ($mbx.PrimarySmtpAddress.ToString().ToLowerInvariant() -ne $addr) {
    if ($mbx.ExternalDirectoryObjectId -eq $sender.ExternalDirectoryObjectId) {
      Write-Note "$addr is an alias of $SenderMailbox, not a separate mailbox. Enable sending from aliases instead:"
      Write-Note '  Set-OrganizationConfig -SendFromAliasEnabled $true'
      continue
    }
    Write-Note "$addr is an alias of $($mbx.PrimarySmtpAddress); granting Send As on that mailbox."
  }
  $existing = Get-RecipientPermission -Identity $addr -Trustee $SenderMailbox -ErrorAction SilentlyContinue |
    Where-Object { $_.AccessRights -contains 'SendAs' }
  if ($existing) {
    Write-Ok "Send As already granted to $SenderMailbox"
  } else {
    Add-RecipientPermission -Identity $addr -Trustee $SenderMailbox -AccessRights SendAs -Confirm:$false -ErrorAction Stop | Out-Null
    Write-Ok "Granted Send As to $SenderMailbox"
  }
  if (-not $SkipSentItemsCopy -and $mbx.RecipientTypeDetails -eq 'SharedMailbox') {
    Set-Mailbox -Identity $addr -MessageCopyForSentAsEnabled $true -ErrorAction Stop
    Write-Ok "Copies of sent mail will also appear in $addr Sent Items"
  }
}

Disconnect-ExchangeOnline -Confirm:$false | Out-Null

Write-Step 'Done'
Write-Note 'Exchange can take up to an hour to apply Send As.'
Write-Host "Next: Admin -> Email -> Connection -> Default From address = $($targets[0]) -> Save -> Send test email." -ForegroundColor Cyan
Write-Host 'The test reads Sent Items back and confirms the From address recipients will see.' -ForegroundColor Cyan
Write-Host "Send As only controls the From address. If the test says 'Access denied', the app itself lacks access to $SenderMailbox; run diagnose-mailer.ps1." -ForegroundColor DarkYellow
