# PostgreSQL 15 Installation Script for Windows
# This script downloads and installs PostgreSQL 15.14

Write-Host "🐘 Installing PostgreSQL 15..." -ForegroundColor Green
Write-Host ""

# PostgreSQL 15.14 download URL
$postgresUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.14-1-windows-x64.exe"
$installerPath = "$env:TEMP\postgresql-15.14-1-windows-x64.exe"

Write-Host "📥 Downloading PostgreSQL 15.14 installer..." -ForegroundColor Cyan
Write-Host "URL: $postgresUrl" -ForegroundColor Gray

try {
    # Download the installer
    Invoke-WebRequest -Uri $postgresUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "✅ Download completed: $installerPath" -ForegroundColor Green
    
    # Check if file was downloaded
    if (Test-Path $installerPath) {
        $fileSize = (Get-Item $installerPath).Length / 1MB
        Write-Host "📁 File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
        
        Write-Host ""
        Write-Host "🚀 Starting PostgreSQL installer..." -ForegroundColor Green
        Write-Host "⚠️  IMPORTANT: During installation:" -ForegroundColor Yellow
        Write-Host "   - Use default port: 5432" -ForegroundColor White
        Write-Host "   - Set password for 'postgres' user (remember this!)" -ForegroundColor White
        Write-Host "   - Keep default installation directory" -ForegroundColor White
        Write-Host "   - Install all components (PostgreSQL Server, pgAdmin, Stack Builder)" -ForegroundColor White
        
        # Start the installer
        Start-Process -FilePath $installerPath -Wait
        
        Write-Host ""
        Write-Host "✅ PostgreSQL installation completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔧 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Update your backend/env.local with the password you set" -ForegroundColor White
        Write-Host "   2. Set DATABASE_ENABLED=1 and SAFE_BOOT=0" -ForegroundColor White
        Write-Host "   3. Restart the backend server" -ForegroundColor White
        
    } else {
        Write-Host "❌ Download failed - file not found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative: Download manually from:" -ForegroundColor Yellow
    Write-Host "   https://www.enterprisedb.com/downloads/postgres-postgresql-downloads" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
