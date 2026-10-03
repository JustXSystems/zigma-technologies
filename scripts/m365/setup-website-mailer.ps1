<#
.SYNOPSIS
  One-time Microsoft 365 setup for website email (Admin -> Email -> Microsoft 365 Graph API).

.DESCRIPTION
  Idempotent. Safe to re-run. It will:
    1. Create (or reuse) a shared mailbox the website sends from (free, no licence, sign-in blocked).
    2. Create (or reuse) an Entra ID app registration + service principal with NO tenant-wide mail permissions.
    3. Add a client secret (default 24 months).
    4. Scope the app to ONLY that mailbox with Exchange Online RBAC for Applications
       (Application Mail.Send + Application Mail.ReadWrite for large-attachment upload sessions).
    5. Verify the authorization and copy a JSON block to the clipboard for Admin -> Email -> Import.

  Run as a Global Administrator (or Application Administrator + Exchange Administrator).
  Works in Windows PowerShell 5.1 and PowerShell 7.

.EXAMPLE
  .\scripts\m365\setup-website-mailer.ps1 -SenderMailbox website@zigma-technologies.com

.EXAMPLE
  # Send through one mailbox but show a shared mailbox as From
  .\scripts\m365\setup-website-mailer.ps1 -SenderMailbox website@zigma-technologies.com -FromAddress webmaster@zigma-technologies.com

.EXAMPLE
  # Secret renewal (Admin -> Email shows a countdown): adds a new secret, prints JSON to import.
  .\scripts\m365\setup-website-mailer.ps1 -SenderMailbox website@zigma-technologies.com -RotateSecret -PruneOldSecrets
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[^@\s]+@[^@\s]+\.[^@\s]+$')]
  [string]$SenderMailbox,

  [string]$MailboxDisplayName = 'Website Notifications',
  [string]$AppName = 'Zigma Website Mailer',
  [string]$TenantId,
  [ValidateRange(1, 24)]
  [int]$SecretMonths = 24,
  [switch]$RotateSecret,
  [switch]$PruneOldSecrets,
  [switch]$SkipMailboxCreation,
  # Addresses recipients should see as From (each gets "Send As" for the sender mailbox).
  [string[]]$FromAddress = @()
)

$ErrorActionPreference = 'Stop'
$SenderMailbox = $SenderMailbox.Trim().ToLowerInvariant()

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "    [ok] $Text" -ForegroundColor Green }
function Write-Note([string]$Text) { Write-Host "    $Text" -ForegroundColor DarkGray }

function Ensure-Module([string]$Name) {
  if (-not (Get-Module -ListAvailable -Name $Name)) {
    Write-Note "Installing module $Name (CurrentUser scope)..."
    if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) { Register-PSRepository -Default }
    Install-Module $Name -Scope CurrentUser -Force -AllowClobber
  }
  Import-Module $Name -ErrorAction Stop | Out-Null
}

Write-Step 'Checking PowerShell modules'
Ensure-Module 'Microsoft.Graph.Authentication'
Ensure-Module 'Microsoft.Graph.Applications'
Ensure-Module 'ExchangeOnlineManagement'
Write-Ok 'Modules ready'

# ---------------------------------------------------------------- Entra ID
Write-Step 'Signing in to Microsoft Graph (approve the browser prompt)'
$connect = @{ Scopes = @('Application.ReadWrite.All'); NoWelcome = $true }
if ($TenantId) { $connect.TenantId = $TenantId }
Connect-MgGraph @connect
$ctx = Get-MgContext
$tenant = $ctx.TenantId
Write-Ok "Tenant $tenant as $($ctx.Account)"

Write-Step "App registration '$AppName'"
$escapedName = $AppName.Replace("'", "''")
$app = Get-MgApplication -Filter "displayName eq '$escapedName'" -Top 1
if (-not $app) {
  $app = New-MgApplication -DisplayName $AppName -SignInAudience 'AzureADMyOrg' `
    -Notes "Sends website notifications as $SenderMailbox. Access is scoped by Exchange Online RBAC for Applications; no Entra mail permissions are granted."
  Write-Ok "Created app $($app.AppId)"
  $isNewApp = $true
} else {
  Write-Ok "Reusing app $($app.AppId)"
  $isNewApp = $false
}

$sp = Get-MgServicePrincipal -Filter "appId eq '$($app.AppId)'" -Top 1
if (-not $sp) {
  $sp = New-MgServicePrincipal -AppId $app.AppId
  Write-Ok 'Created service principal'
} else {
  Write-Ok 'Service principal exists'
}

$secretText = $null
$secretExpires = $null
if ($isNewApp -or $RotateSecret -or -not $app.PasswordCredentials) {
  Write-Step "Adding client secret ($SecretMonths months)"
  $previous = @($app.PasswordCredentials)
  $cred = Add-MgApplicationPassword -ApplicationId $app.Id -PasswordCredential @{
    displayName   = "website-$(Get-Date -Format yyyyMMdd)"
    endDateTime   = (Get-Date).ToUniversalTime().AddMonths($SecretMonths)
  }
  $secretText = $cred.SecretText
  $secretExpires = $cred.EndDateTime.ToString('yyyy-MM-dd')
  Write-Ok "Secret expires $secretExpires"
  if ($PruneOldSecrets -and $previous.Count) {
    foreach ($old in $previous) {
      Remove-MgApplicationPassword -ApplicationId $app.Id -KeyId $old.KeyId
      Write-Note "Removed old secret $($old.DisplayName) ($($old.KeyId))"
    }
  }
} else {
  Write-Note 'App already has a secret; skipping (use -RotateSecret to issue a new one).'
}

# ---------------------------------------------------------------- Exchange Online
Write-Step 'Connecting to Exchange Online'
Connect-ExchangeOnline -ShowBanner:$false
Write-Ok 'Connected'

Write-Step "Shared mailbox $SenderMailbox"
$mbx = Get-EXOMailbox -Identity $SenderMailbox -ErrorAction SilentlyContinue
if (-not $mbx) {
  if ($SkipMailboxCreation) { throw "Mailbox $SenderMailbox not found and -SkipMailboxCreation was set." }
  $alias = ($SenderMailbox.Split('@')[0] -replace '[^a-zA-Z0-9._-]', '')
  $mbx = New-Mailbox -Shared -Name $MailboxDisplayName -DisplayName $MailboxDisplayName -Alias $alias -PrimarySmtpAddress $SenderMailbox -ErrorAction Stop
  Write-Ok 'Created shared mailbox (no licence required)'
} else {
  Write-Ok "Mailbox exists ($($mbx.RecipientTypeDetails))"
}

Write-Step 'Registering the app with Exchange'
# Exchange Online cmdlets only stop on failure when asked per call; the preference variable is not enough.
if ((Get-OrganizationConfig -ErrorAction Stop).IsDehydrated) {
  try {
    Enable-OrganizationCustomization -Confirm:$false -ErrorAction Stop
    Write-Ok 'Organization customization enabled (one-time tenant setting)'
  } catch {
    throw "Enable-OrganizationCustomization failed: $($_.Exception.Message). If it says it is still processing, wait up to an hour and re-run."
  }
}
$exoSp = Get-ServicePrincipal -Identity $app.AppId -ErrorAction SilentlyContinue
if (-not $exoSp) {
  $exoSp = New-ServicePrincipal -AppId $app.AppId -ObjectId $sp.Id -DisplayName $AppName -ErrorAction Stop
  Write-Ok 'Exchange service principal created'
} else {
  Write-Ok 'Exchange service principal exists'
}

$scopeName = "Website mailer - $SenderMailbox"
$scope = Get-ManagementScope -Identity $scopeName -ErrorAction SilentlyContinue
if (-not $scope) {
  $scope = New-ManagementScope -Name $scopeName -RecipientRestrictionFilter "PrimarySmtpAddress -eq '$SenderMailbox'" -ErrorAction Stop
  Write-Ok "Management scope '$scopeName' created"
} else {
  Write-Ok "Management scope '$scopeName' exists"
}

foreach ($role in @('Application Mail.Send', 'Application Mail.ReadWrite')) {
  $existing = Get-ManagementRoleAssignment -RoleAssignee $app.AppId -Role $role -ErrorAction SilentlyContinue |
    Where-Object { $_.CustomResourceScope -eq $scopeName }
  if (-not $existing) {
    New-ManagementRoleAssignment -App $app.AppId -Role $role -CustomResourceScope $scopeName `
      -Name "$AppName - $role" -ErrorAction Stop | Out-Null
    Write-Ok "Granted '$role' on $SenderMailbox only"
  } else {
    Write-Ok "'$role' already granted"
  }
}

Write-Step 'Verifying authorization'
try {
  Test-ServicePrincipalAuthorization -Identity $app.AppId -Resource $SenderMailbox |
    Format-Table RoleName, GrantedPermissions, InScope -AutoSize | Out-Host
} catch {
  Write-Note "Verification skipped: $($_.Exception.Message)"
}
Write-Note 'Exchange can take 30 minutes to 2 hours to apply new app permissions. A 403 in the admin test until then is expected.'

$fromTargets = @($FromAddress | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -and $_ -ne $SenderMailbox })
foreach ($addr in $fromTargets) {
  Write-Step "Send As $addr"
  if (-not (Get-EXOMailbox -Identity $addr -ErrorAction SilentlyContinue)) {
    Write-Warning "$addr is not a mailbox; skipping. Create it as a shared mailbox, then run grant-send-as.ps1."
    continue
  }
  $has = Get-RecipientPermission -Identity $addr -Trustee $SenderMailbox -ErrorAction SilentlyContinue |
    Where-Object { $_.AccessRights -contains 'SendAs' }
  if (-not $has) {
    Add-RecipientPermission -Identity $addr -Trustee $SenderMailbox -AccessRights SendAs -Confirm:$false -ErrorAction Stop | Out-Null
  }
  Write-Ok "$SenderMailbox can send as $addr"
}

Disconnect-ExchangeOnline -Confirm:$false | Out-Null
Disconnect-MgGraph | Out-Null

# ---------------------------------------------------------------- Output
$result = [ordered]@{
  tenantId      = $tenant
  clientId      = $app.AppId
  senderMailbox = $SenderMailbox
}
if ($fromTargets.Count) { $result.fromAddress = $fromTargets[0] }
if ($secretText) {
  $result.clientSecret = $secretText
  $result.secretExpiresOn = $secretExpires
}
$json = $result | ConvertTo-Json -Compress

Write-Step 'Done'
try {
  Set-Clipboard -Value $json
  Write-Ok 'Setup JSON copied to the clipboard.'
} catch {
  Write-Note 'Could not access the clipboard; copy the JSON below.'
}
Write-Host ''
Write-Host $json -ForegroundColor Yellow
Write-Host ''
Write-Host 'Next: Admin -> Email -> Connection -> Import from setup script -> paste -> Save -> Test connection.' -ForegroundColor Cyan
if (-not $secretText) {
  Write-Host 'No new secret was created. Keep the saved secret in admin, or re-run with -RotateSecret.' -ForegroundColor DarkYellow
}
Write-Host 'Treat the JSON like a password: paste it into the admin page, then clear your clipboard.' -ForegroundColor DarkYellow
