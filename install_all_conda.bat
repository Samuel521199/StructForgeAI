@echo off
chcp 65001 >nul 2>&1
cls
echo ================================================
echo StructForge AI - One-Click Install (Conda)
echo ================================================
echo.
echo This script will install:
echo   1. Backend environment (Conda + Python)
echo   2. Frontend environment (Node.js + npm)
echo.
pause

REM Get project root directory
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

echo.
echo ================================================
echo Step 1: Check Prerequisites
echo ================================================
echo.

REM Check conda
echo [Check] Conda environment...
where conda >nul 2>&1
if not "%errorlevel%"=="0" (
    echo [Error] Conda not found!
    echo.
    echo Please install Anaconda or Miniconda:
    echo   - Anaconda: https://www.anaconda.com/download
    echo   - Miniconda: https://docs.conda.io/en/latest/miniconda.html
    echo.
    echo Restart terminal after installation
    echo.
    pause
    exit /b 1
)
call conda --version
echo [OK] Conda installed

REM Check Node.js
echo.
echo [Check] Node.js environment...
where node >nul 2>&1
if not "%errorlevel%"=="0" (
    echo [Error] Node.js not found!
    echo.
    echo Please install Node.js:
    echo   - Download: https://nodejs.org/
    echo   - Recommended: Node.js 18+
    echo.
    pause
    exit /b 1
)
call node --version
echo [OK] Node.js installed

REM Check npm
echo.
echo [Check] npm environment...
where npm >nul 2>&1
if not "%errorlevel%"=="0" (
    echo [Error] npm not found!
    echo.
    echo npm usually comes with Node.js
    pause
    exit /b 1
)
call npm --version
echo [OK] npm installed

echo.
echo ================================================
echo Step 2: Create Project Directories
echo ================================================
echo.

if not exist "%PROJECT_ROOT%data" (
    echo [Create] Data directories...
    mkdir "%PROJECT_ROOT%data\uploads" 2>nul
    mkdir "%PROJECT_ROOT%data\exports" 2>nul
    mkdir "%PROJECT_ROOT%data\vector_db" 2>nul
    echo [OK] Data directories created
) else (
    echo [OK] Data directories exist
)

if not exist "%PROJECT_ROOT%logs" (
    echo [Create] Log directory...
    mkdir "%PROJECT_ROOT%logs" 2>nul
    echo [OK] Log directory created
) else (
    echo [OK] Log directory exists
)

if not exist "%PROJECT_ROOT%templates" (
    echo [Create] Templates directory...
    mkdir "%PROJECT_ROOT%templates" 2>nul
    echo [OK] Templates directory created
) else (
    echo [OK] Templates directory exists
)

echo.
echo ================================================
echo Step 3: Install Backend (Conda)
echo ================================================
echo.

cd /d "%BACKEND_DIR%"
if not exist "%BACKEND_DIR%\environment.yml" (
    echo [Error] environment.yml not found!
    echo Path: %BACKEND_DIR%\environment.yml
    pause
    exit /b 1
)

echo [Install] Create Conda environment...
call conda env list | findstr structforge-ai >nul
set ENV_EXISTS=%errorlevel%
if "%ENV_EXISTS%"=="0" (
    echo Environment 'structforge-ai' already exists
    echo.
    set /p choice="Delete and recreate? (y/n): "
    if /i "%choice%"=="y" (
        echo Removing old environment...
        call conda env remove -n structforge-ai -y
    ) else (
        echo Using existing environment
        goto :backend_install_pip
    )
)

echo Creating Conda environment (may take a few minutes)...
call conda env create -f "%BACKEND_DIR%\environment.yml"
set CONDA_RESULT=%errorlevel%
if not "%CONDA_RESULT%"=="0" (
    echo [Warning] Conda environment creation returned error code: %CONDA_RESULT%
    echo Checking if environment was created anyway...
    call conda env list | findstr structforge-ai >nul
    set CHECK_RESULT=%errorlevel%
    if not "%CHECK_RESULT%"=="0" (
        echo [Error] Environment was not created. Please check error messages above.
        pause
        exit /b 1
    ) else (
        echo [OK] Environment exists despite error, continuing...
    )
)

:backend_install_pip
echo.
echo [Install] Python dependencies...
call conda activate structforge-ai
set ACTIVATE_RESULT=%errorlevel%
if not "%ACTIVATE_RESULT%"=="0" (
    echo [Error] Cannot activate Conda environment!
    echo Please run manually: conda activate structforge-ai
    pause
    exit /b 1
)

REM Install pip dependencies
if exist "%BACKEND_DIR%\requirements.txt" (
    echo Checking and installing pip dependencies...
    python -c "import fastapi" 2>nul
    set CHECK_RESULT=%errorlevel%
    if not "%CHECK_RESULT%"=="0" (
        echo Installing dependencies from requirements.txt...
        echo This may take a few minutes...
        pip install -r "%BACKEND_DIR%\requirements.txt"
        set PIP_RESULT=%errorlevel%
        if not "%PIP_RESULT%"=="0" (
            echo [Warning] pip install returned error code: %PIP_RESULT%
            echo Some packages may not have installed correctly.
            echo You can try installing manually later:
            echo   conda activate structforge-ai
            echo   pip install -r requirements.txt
        ) else (
            echo [OK] pip dependencies installed successfully
        )
    ) else (
        echo [OK] Python dependencies already installed
    )
)

echo.
echo [OK] Backend environment installed!

echo.
echo ================================================
echo Step 4: Install Frontend
echo ================================================
echo.

cd /d "%FRONTEND_DIR%"
if not exist "%FRONTEND_DIR%\package.json" (
    echo [Error] package.json not found!
    pause
    exit /b 1
)

echo [Install] Node.js dependencies (may take a few minutes)...
call npm install
set NPM_RESULT=%errorlevel%
if not "%NPM_RESULT%"=="0" (
    echo [Warning] npm install may have issues, please check error messages above
) else (
    echo [OK] Frontend dependencies installed!
)

echo.
echo ================================================
echo Installation Complete!
echo ================================================
echo.
echo Backend environment:
echo   Environment name: structforge-ai
echo   Activate command: conda activate structforge-ai
echo   Start script: %BACKEND_DIR%\start_conda.bat
echo.
echo Frontend environment:
echo   Start script: %FRONTEND_DIR%\start_frontend.bat
echo.
echo Start all services:
echo   Run: %PROJECT_ROOT%start_all_conda.bat
echo.
echo ================================================
pause
