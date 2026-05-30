@echo off
REM ForensiQ Lite - Windows Setup Script
REM 
REM Usage: 
REM   setup.bat          - Full setup
REM   setup.bat quick    - Skip Prisma generation (if already done)
REM
REM Note: Run this script from the project root directory.

echo.
echo ===========================================
echo ForensiQ Lite - Windows Setup
echo ===========================================
echo.

REM Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js >= 20 from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Extract major version and check
for /f "tokens=1,2 delims=." %%a in ("%NODE_VERSION%") do (
    set NODE_MAJOR=%%a
    set NODE_MINOR=%%b
)

REM Remove 'v' prefix
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Node.js 20 or higher is required. Found: %NODE_VERSION%
    pause
    exit /b 1
)
echo [OK] Node.js version check passed

REM Check for pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] pnpm not found, installing...
    npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo [OK] pnpm version: %PNPM_VERSION%

echo.
echo Step 1: Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Creating environment files...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo [OK] Created .env
    )
)

if not exist "apps\api\.env" (
    if exist "apps\api\.env.example" (
        copy "apps\api\.env.example" "apps\api\.env"
        echo [OK] Created apps\api\.env
    )
)

if not exist "apps\web\.env.local" (
    if exist "apps\web\.env.example" (
        copy "apps\web\.env.example" "apps\web\.env.local"
        echo [OK] Created apps\web\.env.local
    )
)

echo.
echo Step 3: Checking Docker...
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Docker not found
    echo Please install Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo You can still proceed by:
    echo 1. Installing PostgreSQL locally
    echo 2. Updating DATABASE_URL in .env
    goto :skip_docker
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Docker is not running
    echo Please start Docker Desktop and wait for it to be ready
    goto :skip_docker
)

echo [OK] Docker is running
echo.
echo Step 4: Starting PostgreSQL container...
docker-compose up -d postgres
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to start PostgreSQL container
    goto :skip_docker
)

echo Waiting for PostgreSQL to be ready...
timeout /t 10 /nobreak >nul

:skip_docker
echo.
echo Step 5: Generating Prisma client...
call pnpm db:generate
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Prisma generation may have failed
)

echo.
echo Step 6: Setting up database...
call pnpm db:push
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Database push may have failed
    echo Please check that PostgreSQL is running
)

echo.
echo ===========================================
echo Setup Complete!
echo ===========================================
echo.
echo Next steps:
echo.
echo 1. Start the application:
echo    pnpm dev:local
echo.
echo    Or start manually:
echo    docker-compose up -d postgres
echo    pnpm dev
echo.
echo 2. Access the application:
echo    - Frontend:    http://localhost:3000
echo    - Backend API: http://localhost:3001
echo    - API Docs:   http://localhost:3001/docs
echo.
echo 3. Default login:
echo    Admin:   admin@forensiq.local / admin123
echo    Auditor: auditor@forensiq.local / auditor123
echo.
echo ===========================================
echo.
pause
