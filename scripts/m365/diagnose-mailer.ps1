<#
.SYNOPSIS
  Explains (and optionally fixes) "Access denied" when the website sends through Microsoft Graph.

.DESCRIPTION
  Read-only unless -Fix is given. Works for any app registration, including one created by your infra team.
  It checks every layer Microsoft 365 uses to decide whether an app may send from a mailbox:
    1. Entra ID   - the app exists in this tenant and which Microsoft Graph application permissions are consented.
    2. Exchange   - the app is registered with Exchange and has "Application Mail.Send" on the sending mailbox
                    (RBAC for Applications), and whether an Application Access Policy excludes that mailbox.
    3. Mailbox    - the sending mailbox exists and REST/EWS access is not disabled for it or the organisation.
    4. Send As    - the sending mailbox may send as each -FromAddress.

  -Fix grants the app "Application Mail.Send" + "Application Mail.ReadWrite" on the sending mailbox ONLY,
  through an Exchange management scope. This does not widen any existing tenant-wide permission.

  Run as a Global Administrator (or Application Administrator + Exchange Administrator).
  Works in Windows PowerShell 5.1 and PowerShell 7.

.EXAMPLE
  .\scripts\m365\diagnose-mailer.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -SenderMailbox quotation@zigma-technologies.com -FromAddress webmaster@zigma-technologies.com

.EXAMPLE
  # Apply the mailbox-scoped grant if it is missing
  .\scripts\m365\diagnose-mailer.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -SenderMailbox quotation@zigma-technologies.com -Fix

.EXAMPLE
  # When -Fix reports the organization is being upgraded / customization can't be enabled:
  # restrict the app to the mailbox with an Application Access Policy, then grant Entra Mail.Send + Mail.ReadWrite.
  .\scripts\m365\diagnose-mailer.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -SenderMailbox quotation@zigma-technologies.com -UseAccessPolicy
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F-]{36}$')]
  [string]$ClientId,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[^@\s]+@[^@\s]+\.[^@\s]+$')]
  [string]$SenderMailbox,

  [string[]]$FromAddress = @(),
  [string]$TenantId,
  [switch]$Fix,
  # Alternative to -Fix when organization customization can't be enabled yet:
  # Entra Mail.Send/Mail.ReadWrite restricted to the sending mailbox by an Application Access Policy.
  [switch]$UseAccessPolicy
)

$ErrorActionPreference = 'Stop'
$SenderMailbox = $SenderMailbox.Trim().ToLowerInvariant()
$ClientId = $ClientId.Trim().ToLowerInvariant()
$fromTargets = @($FromAddress | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ -and $_ -ne $SenderMailbox })
$problems = New-Object System.Collections.Generic.List[string]
$accessProblem = $null
$customizationBlocked = $false

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "    [ok] $Text" -ForegroundColor Green }
function Write-Bad([string]$Text) { Write-Host "    [!!] $Text" -ForegroundColor Red; $problems.Add($Text) }
function Write-Warn([string]$Text) { Write-Host "    [??] $Text" -ForegroundColor Yellow }
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

# ---------------------------------------------------------------- 1. Entra ID
Write-Step 'Entra ID (approve the browser prompt)'
$scopes = @('Application.Read.All')
if ($UseAccessPolicy) { $scopes += 'AppRoleAssignment.ReadWrite.All' }
$connect = @{ Scopes = $scopes; NoWelcome = $true }
if ($TenantId) { $connect.TenantId = $TenantId }
Connect-MgGraph @connect
$ctx = Get-MgContext
Write-Ok "Tenant $($ctx.TenantId) as $($ctx.Account)"

$sp = Get-MgServicePrincipal -Filter "appId eq '$ClientId'" -Top 1
if (-not $sp) {
  Write-Bad "No enterprise application with Client ID $ClientId in this tenant. Check the Client ID / Tenant ID saved in Admin -> Email."
  Disconnect-MgGraph | Out-Null
  Write-Step 'Verdict'
  $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
Write-Ok "App '$($sp.DisplayName)' (enterprise app object $($sp.Id))"
if ($sp.AccountEnabled -eq $false) { Write-Bad "The enterprise app is disabled for sign-in (Entra -> Enterprise applications -> Properties)." }

$graphSp = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'" -Top 1
$roleNames = @{}
foreach ($r in $graphSp.AppRoles) { $roleNames[$r.Id.ToString()] = $r.Value }
$granted = @(Get-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -All |
  Where-Object { $_.ResourceId -eq $graphSp.Id } |
  ForEach-Object { $roleNames[$_.AppRoleId.ToString()] } | Where-Object { $_ })
$tenantMail = @($granted | Where-Object { $_ -match '^Mail\.(Send|ReadWrite)$' })
if ($granted.Count) {
  Write-Ok "Consented Microsoft Graph application permissions: $($granted -join ', ')"
} else {
  Write-Note 'No Microsoft Graph application permissions are consented in Entra (fine if Exchange grants access below).'
}

$app = Get-MgApplication -Filter "appId eq '$ClientId'" -Top 1 -ErrorAction SilentlyContinue
if ($app) {
  $requested = @($app.RequiredResourceAccess | Where-Object { $_.ResourceAppId -eq '00000003-0000-0000-c000-000000000000' } |
    ForEach-Object { $_.ResourceAccess } | Where-Object { $_.Type -eq 'Role' } | ForEach-Object { $roleNames[$_.Id.ToString()] } | Where-Object { $_ })
  $pending = @($requested | Where-Object { $granted -notcontains $_ })
  if ($pending.Count) {
    Write-Warn "Requested but NOT admin-consented: $($pending -join ', ') (Entra -> App registrations -> API permissions -> Grant admin consent)."
  }
  $now = (Get-Date).ToUniversalTime()
  $live = @($app.PasswordCredentials | Where-Object { $_.EndDateTime -gt $now })
  if (-not $live.Count) { Write-Bad 'The app has no unexpired client secret.' }
  else { Write-Ok "Client secrets valid until: $(($live | ForEach-Object { $_.EndDateTime.ToString('yyyy-MM-dd') }) -join ', ')" }
}

# ---------------------------------------------------------------- 2-4. Exchange Online
Write-Step 'Exchange Online (approve the browser prompt)'
Connect-ExchangeOnline -ShowBanner:$false
Write-Ok 'Connected'

Write-Step "Sending mailbox $SenderMailbox"
$mbx = Get-EXOMailbox -Identity $SenderMailbox -ErrorAction SilentlyContinue
if (-not $mbx) {
  Write-Bad "$SenderMailbox is not an Exchange Online mailbox."
} else {
  Write-Ok "$($mbx.RecipientTypeDetails) $($mbx.PrimarySmtpAddress)"
  if ($mbx.PrimarySmtpAddress.ToString().ToLowerInvariant() -ne $SenderMailbox) {
    Write-Warn "$SenderMailbox is an alias; Exchange grants are evaluated on $($mbx.PrimarySmtpAddress). Use that as the Sending mailbox in admin."
  }
  $org = Get-OrganizationConfig
  if ($org.IsDehydrated) { Write-Warn 'Organization customization is not enabled yet; -Fix enables it (one-time, required for mailbox-scoped app grants).' }
  if ($org.EwsEnabled -eq $false) { Write-Bad 'EWS/REST is disabled for the whole organisation (Set-OrganizationConfig -EwsEnabled). Graph mail calls return "Access to OData is disabled".' }
  $cas = Get-CASMailbox -Identity $SenderMailbox
  if ($cas.EwsEnabled -eq $false) { Write-Bad "EWS/REST is disabled on $SenderMailbox (Set-CASMailbox $SenderMailbox -EwsEnabled `$true)." }
}

Write-Step 'App access to the mailbox'
$exoSp = Get-ServicePrincipal -Identity $ClientId -ErrorAction SilentlyContinue
if (-not $exoSp) {
  try { $exoSp = Get-ServicePrincipal | Where-Object { $_.AppId -eq $ClientId } | Select-Object -First 1 } catch { $exoSp = $null }
}
if ($exoSp) { Write-Ok "Registered with Exchange as '$($exoSp.DisplayName)'" }
else { Write-Note 'Not registered with Exchange (needed only for Exchange-scoped grants).' }

$rbacSend = $false
if ($exoSp) {
  $assignments = @(Get-ManagementRoleAssignment -RoleAssignee $ClientId -ErrorAction SilentlyContinue | Where-Object { "$($_.Role)" -like 'Application *' })
  foreach ($a in $assignments) { Write-Note "Role assignment: $($a.Role)  scope: $(if ($a.CustomResourceScope) { $a.CustomResourceScope } else { 'organisation' })" }
  try {
    $auth = @(Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $SenderMailbox)
    foreach ($t in $auth) {
      $line = "$($t.RoleName): in scope for $SenderMailbox = $($t.InScope)"
      if ($t.InScope) { Write-Ok $line } else { Write-Note $line }
    }
    $rbacSend = [bool]($auth | Where-Object { $_.RoleName -eq 'Application Mail.Send' -and $_.InScope })
  } catch {
    Write-Note "Test-ServicePrincipalAuthorization unavailable: $($_.Exception.Message)"
  }
}

$policyDenied = $false
$policies = @(Get-ApplicationAccessPolicy -ErrorAction SilentlyContinue | Where-Object { $_.AppId -eq $ClientId })
if ($policies.Count) {
  foreach ($p in $policies) { Write-Note "Application Access Policy: $($p.AccessRight) $($p.ScopeName)" }
  $check = Test-ApplicationAccessPolicy -Identity $SenderMailbox -AppId $ClientId
  if ($check.AccessCheckResult -eq 'Granted') { Write-Ok "Application Access Policy allows $SenderMailbox" }
  else { $policyDenied = $true; Write-Warn "Application Access Policy DENIES $SenderMailbox (limits the Entra permission only)." }
}

$entraSend = [bool]($tenantMail | Where-Object { $_ -eq 'Mail.Send' }) -and -not $policyDenied
if ($rbacSend) { Write-Ok "Exchange grants Mail.Send on $SenderMailbox" }
elseif ($entraSend) { Write-Ok "Entra Mail.Send covers $SenderMailbox" }
else {
  $accessProblem = "Nothing lets this app send from $SenderMailbox - this is the 403 'Access denied'."
  Write-Bad $accessProblem
}

foreach ($addr in $fromTargets) {
  Write-Step "Send As $addr"
  $perm = Get-RecipientPermission -Identity $addr -Trustee $SenderMailbox -ErrorAction SilentlyContinue | Where-Object { $_.AccessRights -contains 'SendAs' }
  if ($perm) { Write-Ok "$SenderMailbox can send as $addr" }
  else { Write-Bad "$SenderMailbox has no Send As on $addr (run grant-send-as.ps1)." }
}

# ---------------------------------------------------------------- Fix
if ($Fix -and $mbx -and -not $rbacSend) {
  Write-Step "Granting the app Mail.Send + Mail.ReadWrite on $SenderMailbox only"
  # Exchange Online cmdlets only stop on failure when asked per call; the preference variable is not enough.
  try {
    if ((Get-OrganizationConfig -ErrorAction Stop).IsDehydrated) {
      Write-Note 'Enabling organization customization (one-time tenant setting)...'
      Enable-OrganizationCustomization -Confirm:$false -ErrorAction Stop
      Write-Ok 'Organization customization enabled'
    }
    if (-not $exoSp) {
      $exoSp = New-ServicePrincipal -AppId $ClientId -ObjectId $sp.Id -DisplayName $sp.DisplayName -ErrorAction Stop
      Write-Ok 'Registered the app with Exchange'
    }
    $scopeName = "Website mailer - $SenderMailbox"
    if (-not (Get-ManagementScope -Identity $scopeName -ErrorAction SilentlyContinue)) {
      New-ManagementScope -Name $scopeName -RecipientRestrictionFilter "PrimarySmtpAddress -eq '$($mbx.PrimarySmtpAddress)'" -ErrorAction Stop | Out-Null
      Write-Ok "Management scope '$scopeName' created"
    }
    foreach ($role in @('Application Mail.Send', 'Application Mail.ReadWrite')) {
      $has = Get-ManagementRoleAssignment -RoleAssignee $ClientId -Role $role -ErrorAction SilentlyContinue | Where-Object { $_.CustomResourceScope -eq $scopeName }
      if ($has) { Write-Ok "'$role' already assigned"; continue }
      New-ManagementRoleAssignment -App $ClientId -Role $role -CustomResourceScope $scopeName -Name "Website mailer $($ClientId.Substring(0, 8)) - $role" -ErrorAction Stop | Out-Null
      Write-Ok "Assigned '$role'"
    }

    $verify = @(Test-ServicePrincipalAuthorization -Identity $ClientId -Resource $SenderMailbox -ErrorAction Stop)
    $verify | ForEach-Object { Write-Note "$($_.RoleName): in scope for $SenderMailbox = $($_.InScope)" }
    if ($verify | Where-Object { $_.RoleName -eq 'Application Mail.Send' -and $_.InScope }) {
      if ($accessProblem) { [void]$problems.Remove($accessProblem) }
      $rbacSend = $true
      Write-Ok "Exchange confirms Mail.Send on $SenderMailbox"
      Write-Note 'Exchange usually applies this to Graph within 30 minutes (up to 2 hours). Then send a test email from Admin -> Email.'
    } else {
      Write-Bad 'The grant was created but Exchange does not report it in scope yet. Re-run this script without -Fix in 15 minutes.'
    }
  } catch {
    $msg = $_.Exception.Message
    if ($msg -match 'being upgraded|Enable-OrganizationCustomization|currently being processed|not currently allowed') {
      $customizationBlocked = $true
      Write-Bad "Exchange can't enable organization customization yet ($($msg.Trim('|', ' '))). Retry -Fix in a few hours, or use -UseAccessPolicy now."
    } else {
      Write-Bad "Fix failed: $msg"
    }
  }
}

if ($UseAccessPolicy -and $mbx -and -not $rbacSend -and -not $entraSend) {
  Write-Step "Restricting the app to $SenderMailbox (Application Access Policy) and granting Entra mail permissions"
  try {
    $domain = $mbx.PrimarySmtpAddress.ToString().Split('@')[1]
    $groupAlias = 'website-mailer-senders'
    $policy = $policies | Select-Object -First 1
    if ($policy) {
      $groupId = $policy.ScopeIdentity
      Write-Ok "Reusing the app's existing policy (scope $($policy.ScopeName))"
    } else {
      $group = Get-DistributionGroup -Identity "$groupAlias@$domain" -ErrorAction SilentlyContinue
      if (-not $group) {
        $group = New-DistributionGroup -Name 'Website mailer senders' -Alias $groupAlias -PrimarySmtpAddress "$groupAlias@$domain" -Type Security `
          -Notes 'Mailboxes the website mailer app may access (Application Access Policy). Do not add people.' -ErrorAction Stop
        Set-DistributionGroup -Identity $group.Identity -HiddenFromAddressListsEnabled $true -ErrorAction Stop
        Write-Ok "Created hidden mail-enabled security group $groupAlias@$domain"
      }
      $groupId = $group.PrimarySmtpAddress.ToString()
      New-ApplicationAccessPolicy -AppId $ClientId -PolicyScopeGroupId $groupId -AccessRight RestrictAccess `
        -Description "Website mailer: only mailboxes in $groupId" -ErrorAction Stop | Out-Null
      Write-Ok "Application Access Policy: app restricted to members of $groupId"
    }
    $members = @(Get-DistributionGroupMember -Identity $groupId -ResultSize Unlimited -ErrorAction Stop | ForEach-Object { "$($_.PrimarySmtpAddress)".ToLowerInvariant() })
    if ($members -notcontains $mbx.PrimarySmtpAddress.ToString().ToLowerInvariant()) {
      Add-DistributionGroupMember -Identity $groupId -Member $mbx.PrimarySmtpAddress.ToString() -BypassSecurityGroupManagerCheck -ErrorAction Stop
      Write-Ok "Added $SenderMailbox to $groupId"
    }

    $check = Test-ApplicationAccessPolicy -Identity $SenderMailbox -AppId $ClientId -ErrorAction Stop
    if ($check.AccessCheckResult -ne 'Granted') { throw "The policy does not report $SenderMailbox as allowed yet; Entra permissions were NOT granted. Re-run in 15 minutes." }
    Write-Ok "Policy allows $SenderMailbox (and no other mailbox)"

    foreach ($perm in @('Mail.Send', 'Mail.ReadWrite')) {
      $roleDef = $graphSp.AppRoles | Where-Object { $_.Value -eq $perm -and $_.AllowedMemberTypes -contains 'Application' } | Select-Object -First 1
      if ($granted -contains $perm) { Write-Ok "Entra $perm already consented"; continue }
      New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $sp.Id -PrincipalId $sp.Id -ResourceId $graphSp.Id -AppRoleId $roleDef.Id -ErrorAction Stop | Out-Null
      Write-Ok "Granted Entra $perm (admin consent), limited by the policy above"
    }
    if ($accessProblem) { [void]$problems.Remove($accessProblem) }
    Write-Note 'Entra grants apply within minutes; the access policy can take up to 1 hour. Then send a test email from Admin -> Email.'
    Write-Note 'Later, once -Fix succeeds, you can remove the Entra Mail.* permissions and this policy (Remove-ApplicationAccessPolicy).'
  } catch {
    Write-Bad "Access-policy setup failed: $($_.Exception.Message)"
  }
}

Disconnect-ExchangeOnline -Confirm:$false | Out-Null
Disconnect-MgGraph | Out-Null

Write-Step 'Verdict'
if (-not $problems.Count) {
  Write-Host '  Everything required is in place.' -ForegroundColor Green
  if (-not $Fix -and -not $UseAccessPolicy) { Write-Host '  If the admin test still says Access denied, the grant is still propagating (allow up to 2 hours).' -ForegroundColor DarkGray }
} else {
  $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  if ($customizationBlocked -and -not $UseAccessPolicy) {
    Write-Host "`n  Get sending working now (app restricted to $SenderMailbox by an access policy):" -ForegroundColor Cyan
    Write-Host "  .\scripts\m365\diagnose-mailer.ps1 -ClientId $ClientId -SenderMailbox $SenderMailbox -UseAccessPolicy" -ForegroundColor Yellow
  } elseif (-not $rbacSend -and -not $Fix -and -not $UseAccessPolicy) {
    Write-Host "`n  Fix the mailbox access (scoped to $SenderMailbox only):" -ForegroundColor Cyan
    Write-Host "  .\scripts\m365\diagnose-mailer.ps1 -ClientId $ClientId -SenderMailbox $SenderMailbox -Fix" -ForegroundColor Yellow
  }
}
