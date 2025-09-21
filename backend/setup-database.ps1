# ErMate Database Setup Script
# This script sets up the PostgreSQL database for ErMate

Write-Host "Setting up ErMate database..." -ForegroundColor Green
Write-Host ""

# PostgreSQL connection details
$psqlPath = "G:\SQL\bin\psql.exe"
$postgresUser = "postgres"
$postgresPassword = "varahgrp@2025"
$dbHost = "localhost"
$dbPort = "5432"

# Database setup commands
$setupCommands = @"
-- Create a database for ErMate
CREATE DATABASE ermate_db;

-- Create a user
CREATE USER ermate WITH PASSWORD 'mypassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ermate_db TO ermate;

-- Connect to the new database
\c ermate_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ermate;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ermate;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ermate;

-- Show databases
\l

-- Show users
\du
"@

# Save commands to a temporary file
$tempFile = "$env:TEMP\ermate_db_setup.sql"
$setupCommands | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Database setup commands saved to: $tempFile" -ForegroundColor Cyan
Write-Host ""

# Set environment variable for password
$env:PGPASSWORD = $postgresPassword

Write-Host "Connecting to PostgreSQL and setting up database..." -ForegroundColor Yellow

try {
    # Run the setup commands
    $result = & $psqlPath -U $postgresUser -h $dbHost -p $dbPort -f $tempFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database setup completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database details:" -ForegroundColor Cyan
        Write-Host "  - Database name: ermate_db" -ForegroundColor White
        Write-Host "  - Username: ermate" -ForegroundColor White
        Write-Host "  - Password: mypassword" -ForegroundColor White
        Write-Host "  - Host: localhost" -ForegroundColor White
        Write-Host "  - Port: 5432" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Update backend/env.local with database settings" -ForegroundColor White
        Write-Host "  2. Set DATABASE_ENABLED=1 and SAFE_BOOT=0" -ForegroundColor White
        Write-Host "  3. Restart the backend server" -ForegroundColor White
    } else {
        Write-Host "❌ Database setup failed!" -ForegroundColor Red
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error running database setup: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Clean up environment variable
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
