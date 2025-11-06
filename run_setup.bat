@echo off
chcp 65001 >nul
REM ============================================
REM StructForge AI - Quick Setup Helper
REM This script helps you run setup scripts from any directory
REM ============================================
echo.
echo ============================================
echo StructForge AI - Quick Setup Helper
echo ============================================
echo.

REM Find project root directory dynamically
REM Method 1: Use script's own directory (if script is in project root)
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Method 2: Check current directory
set PROJECT_ROOT=
set CURRENT_DIR=%CD%

REM Check if script's directory is project root
if exist "%SCRIPT_DIR%\backend" (
    set PROJECT_ROOT=%SCRIPT_DIR%
    goto :found_setup_root
)

REM Check if current directory is project root
if exist "backend" (
    set PROJECT_ROOT=%CD%
    goto :found_setup_root
)

REM Method 3: Search upward from current directory
set SEARCH_DIR=%CD%
:search_up_setup
if exist "%SEARCH_DIR%\backend" (
    set PROJECT_ROOT=%SEARCH_DIR%
    goto :found_setup_root
)
if "%SEARCH_DIR%"=="%SEARCH_DIR:~0,3%" goto :not_found_setup
cd ..
set SEARCH_DIR=%CD%
cd "%CURRENT_DIR%"
goto :search_up_setup

:not_found_setup
REM If not found, ask user for path
echo [WARNING] Cannot find project root directory automatically
echo.
echo Current directory: %CURRENT_DIR%
echo Script directory: %SCRIPT_DIR%
echo.
echo Please enter the project root directory path:
echo (The directory should contain a "backend" folder)
set /p PROJECT_PATH="Project path: "

if "%PROJECT_PATH%"=="" (
    echo [ERROR] No path provided
    echo.
    pause
    exit /b 1
)

REM Remove trailing backslash if present
if "%PROJECT_PATH:~-1%"=="\" set PROJECT_PATH=%PROJECT_PATH:~0,-1%

if exist "%PROJECT_PATH%\backend" (
    set PROJECT_ROOT=%PROJECT_PATH%
    goto :found_setup_root
) else (
    echo [ERROR] Invalid project path: %PROJECT_PATH%
    echo.
    echo Please ensure the path contains a "backend" directory.
    echo.
    pause
    exit /b 1
)

:found_setup_root
if not "%PROJECT_ROOT%"=="" (
    if not "%PROJECT_ROOT%"=="%CD%" (
        echo [INFO] Found project root: %PROJECT_ROOT%
        echo [INFO] Changing to project root directory...
        pushd "%PROJECT_ROOT%"
        echo Current directory: %CD%
        echo.
    ) else (
        echo [OK] Already in project root: %CD%
        echo.
    )
)

:menu
echo ============================================
echo Select Script to Run
echo ============================================
echo.
echo   1. Install Ollama and download model
echo      - Downloads and installs Ollama
echo      - Downloads recommended model (qwen2.5:7b-q4_0)
echo.
echo   2. Setup AI configuration (.env file)
echo      - Creates backend/.env configuration file
echo      - Configures AI provider settings
echo.
echo   3. Test AI service connection
echo      - Tests Ollama/LM Studio connection
echo      - Verifies model availability
echo      - Runs Python connection test
echo.
echo   4. Run all (1, 2, 3 in sequence)
echo      - Executes all setup steps automatically
echo.
echo ============================================
echo.
echo Please type 1, 2, 3, or 4 and press Enter:
choice /C 1234 /N /M "Your choice"

if errorlevel 4 goto :run_all
if errorlevel 3 goto :test_service
if errorlevel 2 goto :setup_config
if errorlevel 1 goto :install_ollama

:install_ollama
echo.
echo Running install_ollama.bat...
call install_ollama.bat
goto :end

:setup_config
echo.
echo Running setup_ai_config.bat...
call setup_ai_config.bat
goto :end

:test_service
echo.
echo Running test_ai_service.bat...
call test_ai_service.bat
goto :end

:run_all
echo.
echo Running all setup scripts in sequence...
echo.
echo [Step 1/3] Installing Ollama...
call install_ollama.bat
echo.
echo [Step 2/3] Setting up AI configuration...
call setup_ai_config.bat
echo.
echo [Step 3/3] Testing AI service...
call test_ai_service.bat
goto :end

:end
echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.
pause

