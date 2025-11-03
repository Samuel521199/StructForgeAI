@echo off
REM 检查npm安装状态和进度

cd /d "%~dp0"

echo 检查安装状态...
echo.

if exist "node_modules" (
    echo [Status] node_modules directory exists
    echo.
    
    REM 计算文件数量
    for /f %%a in ('dir /s /b node_modules 2^>nul ^| find /c /v ""') do set COUNT=%%a
    echo Files in node_modules: %COUNT%
    echo.
    
    if %COUNT% LSS 100 (
        echo [Warning] Very few files, installation may not be complete
    ) else (
        echo [OK] Installation appears complete
    )
) else (
    echo [Status] node_modules not found
    echo Installation needed
)

echo.
echo Checking npm processes...
tasklist | findstr /i "node.exe"
echo.

pause

