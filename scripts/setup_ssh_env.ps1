# PowerShell script to setup SSH keys and config across PCs (D: or E: Dropbox)
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " mdo3 SSH & Git Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. 鍵ファイルの探索 (D: または E: の Dropbox)
$dropboxPaths = @("D:\Dropbox", "E:\Dropbox", "$env:USERPROFILE\Dropbox")
$foundKeyDir = $null

foreach ($dp in $dropboxPaths) {
    if (Test-Path "$dp\mdo3.key") {
        $foundKeyDir = $dp
        break
    }
}

if (-not $foundKeyDir) {
    Write-Error "Error: mdo3.key was not found in D:\Dropbox, E:\Dropbox, or $env:USERPROFILE\Dropbox."
    exit 1
}

Write-Host "[+] Found Dropbox directory at: $foundKeyDir" -ForegroundColor Green

# 2. ~/.ssh ディレクトリの作成
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    Write-Host "[+] Created $sshDir" -ForegroundColor Green
}

# 3. 鍵ファイルのコピー (LF改行コードを保証)
$xserverKey = Get-Content -Raw "$foundKeyDir\mdo3.key"
[System.IO.File]::WriteAllText("$sshDir\mdo3.key", $xserverKey.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
Write-Host "[+] Installed ~/.ssh/mdo3.key" -ForegroundColor Green

if (Test-Path "$foundKeyDir\github_id_ed25519.key") {
    $ghKey = Get-Content -Raw "$foundKeyDir\github_id_ed25519.key"
    [System.IO.File]::WriteAllText("$sshDir\id_ed25519", $ghKey.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
    Write-Host "[+] Installed ~/.ssh/id_ed25519 (GitHub SSH key)" -ForegroundColor Green
}

# 4. ~/.ssh/config の自動構成
$configContent = @"
# XServer mdo3
Host mdo3.xsrv.jp
    HostName mdo3.xsrv.jp
    Port 10022
    User mdo3
    IdentityFile ~/.ssh/mdo3.key
    StrictHostKeyChecking accept-new

# GitHub mdo3-system
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
"@

[System.IO.File]::WriteAllText("$sshDir\config", $configContent.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
Write-Host "[+] Created ~/.ssh/config" -ForegroundColor Green

# 5. 接続テスト
Write-Host "`n[*] Testing XServer connection..." -ForegroundColor Yellow
try {
    $sshOutput = ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "echo 'XServer SSH connection OK!'"
    Write-Host "[SUCCESS] $sshOutput" -ForegroundColor Green
} catch {
    Write-Warning "[-] XServer test connection failed: $_"
}

Write-Host "`n[*] Testing GitHub connection..." -ForegroundColor Yellow
try {
    $ghOutput = ssh -o BatchMode=yes -T git@github.com 2>&1
    Write-Host "[SUCCESS] GitHub SSH response: $ghOutput" -ForegroundColor Green
} catch {
    Write-Warning "[-] GitHub test failed: $_"
}

Write-Host "`nSetup completed successfully!" -ForegroundColor Cyan
