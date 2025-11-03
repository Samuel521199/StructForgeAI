@echo off
chcp 65001 >nul
echo ====================================
echo StructForge AI - 完整系统启动
echo ====================================
echo.

REM 获取项目根目录
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo 项目根目录: %PROJECT_ROOT%
echo.

REM 检查conda环境
echo [1/2] Checking backend environment...
call conda env list | findstr structforge-ai >nul
if %errorlevel% neq 0 (
    echo [Warning] Backend environment 'structforge-ai' not found!
    echo Please run: backend\setup_conda.bat first
    echo.
    pause
    exit /b 1
)

REM 检查Node.js
echo [2/2] Checking frontend environment...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Warning] Node.js not installed!
    echo Frontend will not be available
    echo.
)

echo.
echo ====================================
echo Startup Options
echo ====================================
echo 1. Backend only
echo 2. Frontend only
echo 3. Both (Backend + Frontend) - Recommended
echo 4. Cancel
echo ====================================
echo.

set /p choice="Please select (1-4): "

if "%choice%"=="1" goto :backend_only
if "%choice%"=="2" goto :frontend_only
if "%choice%"=="3" goto :both
if "%choice%"=="4" goto :cancel

echo Invalid choice, starting both by default
goto :both

:backend_only
echo.
echo Starting backend service...
start "StructForge AI Backend" cmd /k "cd /d %PROJECT_ROOT%backend && start_conda.bat"
goto :end

:frontend_only
echo.
echo Starting frontend service...
start "StructForge AI Frontend" cmd /k "cd /d %PROJECT_ROOT%frontend && start_frontend.bat"
goto :end

:both
echo.
echo Starting backend and frontend services...
start "StructForge AI Backend" cmd /k "cd /d %PROJECT_ROOT%backend && start_conda.bat"
timeout /t 3 /nobreak >nul
start "StructForge AI Frontend" cmd /k "cd /d %PROJECT_ROOT%frontend && start_frontend.bat"
goto :end

:cancel
echo Cancelled
exit /b 0

:end
echo.
echo ====================================
echo Service URLs
echo ====================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Tip: Services are running in new windows
echo Close windows to stop services
echo ====================================
pause

