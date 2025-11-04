@echo off
chcp 65001 >nul 2>&1
cls
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
    
    call npm install
    
    if %errorlevel% neq 0 (
        echo.
        echo [Error] Installation failed!
        echo.
        echo Try manually:
        echo   cd %SCRIPT_DIR%
        echo   npm config set registry https://registry.npmmirror.com
        echo   npm install
        echo.
        pause
        exit /b 1
    )
    
    echo.
    echo [OK] Dependencies installed!
    echo.
)

REM Verify vite is installed
if not exist "node_modules\.bin\vite.cmd" (
    if not exist "node_modules\vite" (
        echo [Error] vite not found!
        echo.
        echo Dependencies may not be installed correctly.
        echo Please run: install_frontend.bat
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ====================================
echo Frontend Service
echo ====================================
echo URL: http://localhost:5173
echo Backend: http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo ====================================
echo.

REM Start development server using npx to ensure correct path
call npx vite

if %errorlevel% neq 0 (
    echo.
    echo [Error] Startup failed!
    echo.
    echo If vite command not found, try:
    echo   cd %SCRIPT_DIR%
    echo   npm install
    echo   npm run dev
    echo.
    pause
)
