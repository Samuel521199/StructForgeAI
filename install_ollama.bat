@echo off
chcp 65001 >nul
REM ============================================
REM StructForge AI - Ollama Installation Script
REM ============================================
echo.
echo ============================================
echo StructForge AI - Ollama Installation Script
echo ============================================
echo.

REM Note: This script can be run from any directory
REM Check if Ollama is already installed
echo [1/4] Checking if Ollama is installed...
where ollama >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Ollama is already installed
    ollama --version
    echo.
    goto :check_model
)

echo [INFO] Ollama is not installed, starting installation...
echo.

REM Check if installer exists, if not, try to download it
if not exist "%TEMP%\OllamaSetup.exe" (
    echo [2/4] Downloading Ollama installer...
    echo.
    echo Attempting to download Ollama installer...
    echo.
    
    REM Try to download using PowerShell
    powershell -Command "try { Invoke-WebRequest -Uri 'https://ollama.ai/download/windows' -OutFile '%TEMP%\OllamaSetup.exe' -UseBasicParsing; Write-Host '[OK] Download successful' } catch { Write-Host '[ERROR] Download failed. Please download manually from:' -ForegroundColor Red; Write-Host 'https://ollama.ai/download' -ForegroundColor Yellow }" 2>nul
    
    echo.
    
    REM Check if download was successful
    if not exist "%TEMP%\OllamaSetup.exe" (
        echo [WARNING] Automatic download failed.
        echo.
        echo Please download Ollama manually:
        echo   1. Visit: https://ollama.ai/download
        echo   2. Download the Windows installer
        echo   3. Save it to: %TEMP%\OllamaSetup.exe
        echo   4. Press any key to continue after downloading...
        echo.
        pause
        echo.
    )
)

REM Check if installer exists
if exist "%TEMP%\OllamaSetup.exe" (
    echo [3/4] Running Ollama installer...
    echo.
    echo Please follow the installation wizard...
    echo.
    start /wait "" "%TEMP%\OllamaSetup.exe"
    echo.
    echo [INFO] Installation completed. Please close and reopen this window.
    echo.
    REM Try to refresh environment variables
    call refreshenv.cmd 2>nul || (
        echo [INFO] Please manually refresh environment or restart command window
    )
    
    REM Wait a moment for Ollama to be available
    timeout /t 3 >nul
    
    REM Verify installation
    where ollama >nul 2>&1
    if %errorlevel% == 0 (
        echo [OK] Ollama installation verified
        echo.
    ) else (
        echo [WARNING] Ollama may not be in PATH yet
        echo [INFO] Please close and reopen this window, then run this script again
        echo.
        pause
        exit /b 0
    )
) else (
    echo [ERROR] Installer not found. Please download manually.
    echo.
    echo Download URL: https://ollama.ai/download
    echo.
    pause
    exit /b 1
)

:check_model
echo [4/4] Checking recommended model...
echo.

REM Check if model is already downloaded
ollama list | findstr /i "qwen2.5:7b-q4_0" >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Recommended model is already installed
    echo.
    goto :test_ollama
)

echo [INFO] Starting download of recommended model: qwen2.5:7b-q4_0
echo.
echo Note: Model size is approximately 4.5GB, download may take some time...
echo.

ollama pull qwen2.5:7b-q4_0

if %errorlevel% == 0 (
    echo.
    echo [OK] Model download completed!
) else (
    echo.
    echo [ERROR] Model download failed
    echo.
    echo You can download it manually later:
    echo   ollama pull qwen2.5:7b-q4_0
    echo.
    pause
    exit /b 1
)

:test_ollama
echo.
echo ============================================
echo Testing Ollama Connection
echo ============================================
echo.

echo Testing Ollama service...
timeout /t 2 >nul

REM Test HTTP connection
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Ollama service is running
) else (
    echo [WARNING] Cannot connect to Ollama service
    echo.
    echo Please ensure Ollama is running:
    echo   1. Check system tray for Ollama icon
    echo   2. Or run command: ollama serve
    echo.
)

REM Test model
echo.
echo Testing model...
ollama run qwen2.5:7b-q4_0 "Hello" >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Model test successful
) else (
    echo [WARNING] Model test failed, may need to re-download
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Configure backend .env file (if not done yet)
echo      Run: setup_ai_config.bat
echo   2. Test AI service connection
echo      Run: test_ai_service.bat
echo   3. Start backend service
echo.
pause

