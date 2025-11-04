@echo off
chcp 65001 >nul 2>&1
cls
echo ================================================
echo StructForge AI - Start All Services (Conda)
echo ================================================
echo.

REM Get project root directory
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

REM Check conda
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Conda not found!
    echo Please install Anaconda or Miniconda
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js not found!
    echo Please install Node.js
    pause
    exit /b 1
)

REM Check if Conda environment exists
echo [Check] Conda environment...
call conda env list | findstr structforge-ai >nul
if %errorlevel% neq 0 (
    echo [Error] Conda environment 'structforge-ai' not found!
    echo.
    echo Please run install script first:
    echo   install_all_conda.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo Starting Backend Service...
echo ================================================
echo.

REM Start backend in new window
start "StructForge AI - Backend" cmd /k "cd /d %BACKEND_DIR% && call conda activate structforge-ai && python main.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo.
echo ================================================
echo Starting Frontend Service...
echo ================================================
echo.

REM Start frontend in new window
cd /d "%FRONTEND_DIR%"
start "StructForge AI - Frontend" cmd /k "npm run dev"

echo.
echo ================================================
echo Service Information
echo ================================================
echo.
echo Backend Service:
echo   URL: http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo   Health: http://localhost:8000/health
echo.
echo Frontend Service:
echo   URL: http://localhost:5173 (or http://localhost:3000)
echo.
echo To stop services:
echo   - Close the corresponding command windows
echo   - Or run: stop_all.bat
echo.
echo ================================================
echo.
echo Services are starting, please check the new windows...
echo Press any key to open browser...
pause >nul

REM Wait a few seconds then auto-open browser
timeout /t 2 /nobreak >nul
start http://localhost:5173
start http://localhost:8000/docs

echo.
echo Services started!
echo Keep this window open to view logs
