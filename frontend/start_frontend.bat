@echo off
chcp 65001 >nul
echo ====================================
echo StructForge AI - Frontend Service
echo ====================================
echo.

REM Get script directory and change to it
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js not found!
    echo Please install Node.js 18+
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [Warning] Dependencies not installed
    echo Installing now, please wait 3-5 minutes...
    echo.
    
    REM Try to install with Chinese mirror first
    echo Setting up Chinese mirror for faster download...
    call npm config set registry https://registry.npmmirror.com
    
    echo Starting installation...
    echo This will show detailed progress...
    echo.
    
    call npm install --verbose
    
    if %errorlevel% neq 0 (
        echo.
        echo [Error] Installation failed!
        echo.
        echo Try manually:
        echo   npm config set registry https://registry.npmmirror.com
        echo   npm install
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo [Success] Dependencies installed!
    echo.
)

echo.
echo ====================================
echo Frontend Service
echo ====================================
echo URL: http://localhost:3000
echo Backend: http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo ====================================
echo.

REM Start development server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [Error] Startup failed!
    echo.
    pause
)
