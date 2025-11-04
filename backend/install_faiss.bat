@echo off
chcp 65001 >nul 2>&1
cls
echo ================================================
echo Install FAISS for StructForge AI
echo ================================================
echo.
echo This script will install FAISS (optional dependency)
echo for vector database functionality.
echo.
echo Note: FAISS is optional. ChromaDB is used by default.
echo.
pause

REM Check if conda environment is activated
python -c "import sys; exit(0 if 'structforge-ai' in sys.executable else 1)" 2>nul
if %errorlevel% neq 0 (
    echo [Error] Please activate conda environment first:
    echo   conda activate structforge-ai
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo Installation Options
echo ================================================
echo 1. Install via Conda (recommended for Windows)
echo 2. Install via pip
echo 3. Cancel
echo ================================================
echo.

set /p choice="Select option (1-3): "

if "%choice%"=="1" goto :conda_install
if "%choice%"=="2" goto :pip_install
if "%choice%"=="3" goto :cancel
goto :conda_install

:conda_install
echo.
echo [Install] Installing FAISS via Conda...
echo This may take a few minutes...
call conda install -c conda-forge faiss-cpu -y
if %errorlevel% equ 0 (
    echo [OK] FAISS installed successfully!
) else (
    echo [Error] Conda installation failed
    echo.
    echo You can try pip installation instead
    pause
    exit /b 1
)
goto :verify

:pip_install
echo.
echo [Install] Installing FAISS via pip...
echo This may take a few minutes...
pip install faiss-cpu
if %errorlevel% equ 0 (
    echo [OK] FAISS installed successfully!
) else (
    echo [Error] pip installation failed
    echo.
    echo FAISS installation can be tricky on Windows.
    echo You can continue using ChromaDB instead.
    pause
    exit /b 1
)
goto :verify

:verify
echo.
echo [Verify] Testing FAISS installation...
python -c "import faiss; print('FAISS version:', faiss.__version__)"
if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo FAISS Installation Complete!
    echo ================================================
    echo.
    echo To use FAISS, update your config:
    echo   VECTOR_DB_TYPE=faiss
    echo.
    echo Or in backend/.env file:
    echo   VECTOR_DB_TYPE=faiss
    echo.
) else (
    echo [Warning] FAISS import test failed
    echo The module may not be properly installed
)
goto :end

:cancel
echo Cancelled
exit /b 0

:end
pause

