@echo off
chcp 65001 >nul 2>&1
cls
echo ================================================
echo StructForge AI - Frontend Install Script
echo ================================================
echo.

REM Get script directory
set "FRONTEND_DIR=%~dp0"
if "%FRONTEND_DIR%"=="" set "FRONTEND_DIR=%CD%\"

cd /d "%FRONTEND_DIR%"

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js not found!
    echo.
    echo Please install Node.js:
    echo   - Download: https://nodejs.org/
    echo   - Recommended: Node.js 18+
    echo.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] npm not found!
    pause
    exit /b 1
)

echo [Check] Node.js version...
call node --version
call npm --version

echo.
echo [Check] package.json...
if not exist "%FRONTEND_DIR%package.json" (
    echo [Error] package.json not found!
    pause
    exit /b 1
)

echo.
echo ================================================
echo Installation Options
echo ================================================
echo 1. Clean install (delete node_modules first)
echo 2. Regular install (keep existing)
echo 3. Cancel
echo ================================================
echo.
set /p choice="Select option (1-3, default 1): "

if "%choice%"=="3" exit /b 0
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    echo.
    echo [Step 1/3] Cleaning old node_modules...
    if exist "%FRONTEND_DIR%node_modules" (
        echo Deleting old node_modules...
        rd /s /q "%FRONTEND_DIR%node_modules" 2>nul
        echo [OK] Cleaned
    )
    if exist "%FRONTEND_DIR%package-lock.json" (
        echo Deleting package-lock.json...
        del /f /q "%FRONTEND_DIR%package-lock.json" 2>nul
    )
)

echo.
echo [Step 2/3] Setting up npm registry...
echo Using Chinese mirror for faster download...
call npm config set registry https://registry.npmmirror.com
echo [OK] Registry configured

echo.
echo [Step 3/3] Installing npm dependencies...
echo This may take 3-5 minutes...
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo [Error] npm installation failed!
    echo.
    echo Possible solutions:
    echo   1. Check network connection
    echo   2. Clear npm cache: npm cache clean --force
    echo   3. Try again: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo [Verify] Checking installation...
if not exist "%FRONTEND_DIR%node_modules\vite" (
    echo [Error] vite not found in node_modules!
    echo Installation may have failed partially.
    echo.
    pause
    exit /b 1
)

echo [OK] vite installed

echo.
echo ================================================
echo Frontend Installation Complete!
echo ================================================
echo.
echo To start the frontend:
echo   1. Development: npm run dev
echo   2. Build: npm run build
echo.
echo Or run: start_frontend.bat
echo ================================================
pause

