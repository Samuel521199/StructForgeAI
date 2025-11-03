@echo off
chcp 65001 >nul
echo ====================================
echo StructForge AI - 停止所有服务
echo ====================================
echo.

echo 正在查找并停止服务...
echo.

REM 停止后端服务（通过进程名）
taskkill /FI "WINDOWTITLE eq StructForge AI Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq StructForge AI Frontend*" /T /F >nul 2>&1

REM 停止Python进程（main.py）
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV ^| findstr "python.exe"') do (
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr "main.py" >nul
    if !errorlevel! equ 0 (
        taskkill /PID %%a /F >nul 2>&1
        echo [停止] Python后端进程
    )
)

REM 停止Node.js进程（vite dev server）
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| findstr "node.exe"') do (
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr "vite" >nul
    if !errorlevel! equ 0 (
        taskkill /PID %%a /F >nul 2>&1
        echo [停止] Node.js前端进程
    )
)

REM 停止uvicorn进程
taskkill /FI "IMAGENAME eq python.exe" /FI "COMMANDLINE eq *uvicorn*" /T /F >nul 2>&1

echo.
echo ====================================
echo 服务停止完成
echo ====================================
echo.
echo 如果服务仍在运行，请手动关闭对应的命令行窗口
pause

