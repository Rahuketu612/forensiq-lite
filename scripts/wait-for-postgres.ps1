# ForensiQ Lite - PowerShell Wait Script
# 
# Usage: 
#   .\scripts\wait-for-postgres.ps1
#   node scripts\wait-for-postgres.js

$ErrorActionPreference = "Stop"

$POSTGRES_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$POSTGRES_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
$POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "forensiq" }
$POSTGRES_PASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "forensiq_secure_password" }
$POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "forensiq" }

$MAX_RETRIES = 30
$RETRY_INTERVAL = 2  # seconds

Write-Host "Waiting for PostgreSQL..." -ForegroundColor Cyan
Write-Host "  Host: $POSTGRES_HOST"
Write-Host "  Port: $POSTGRES_PORT"

for ($attempt = 1; $attempt -le $MAX_RETRIES; $attempt++) {
    try {
        # Use TCP connection test via .NET
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($POSTGRES_HOST, [int]$POSTGRES_PORT)
        $tcpClient.Close()
        
        Write-Host "[$attempt/$MAX_RETRIES] PostgreSQL is ready!" -ForegroundColor Green
        exit 0
    }
    catch {
        Write-Host "[$attempt/$MAX_RETRIES] Attempt failed: $($_.Exception.Message)" -ForegroundColor Yellow
        
        if ($attempt -lt $MAX_RETRIES) {
            Start-Sleep -Seconds $RETRY_INTERVAL
        }
    }
}

Write-Host ""
Write-Host "Failed to connect to PostgreSQL after $MAX_RETRIES attempts" -ForegroundColor Red
Write-Host "Please check:" -ForegroundColor Yellow
Write-Host "  1. Docker is running" -ForegroundColor Yellow
Write-Host "  2. PostgreSQL container is started: docker-compose up -d postgres" -ForegroundColor Yellow
Write-Host "  3. PostgreSQL is accessible at $POSTGRES_HOST`:$POSTGRES_PORT" -ForegroundColor Yellow
exit 1
