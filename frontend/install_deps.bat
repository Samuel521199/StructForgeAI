@echo off
chcp 65001 >nul
echo ====================================
echo 安装前端依赖（详细进度模式）
echo ====================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo 工作目录: %SCRIPT_DIR%
echo.

REM 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js not found!
    echo Please install Node.js 18+
    pause
    exit /b 1
)

echo Node.js version:
call node --version
call npm --version
echo.

REM 询问是否使用国内镜像
echo ====================================
echo 选择安装方式
echo ====================================
echo 1. 使用默认源（官方源，可能较慢）
echo 2. 使用国内镜像（推荐，速度快）⭐
echo ====================================
echo.

set /p mirror_choice="请选择 (1-2, 默认2): "

if "%mirror_choice%"=="1" (
    echo 使用默认npm源...
    call npm config set registry https://registry.npmjs.org/
) else (
    echo 使用国内镜像源（淘宝镜像）...
    call npm config set registry https://registry.npmmirror.com
    echo 镜像已设置
)

echo.
echo ====================================
echo 开始安装依赖
echo ====================================
echo 预计时间: 3-5分钟
echo 正在显示详细进度...
echo ====================================
echo.

REM 使用详细日志模式安装
call npm install --loglevel=info --progress=true

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo 安装完成！
    echo ====================================
    echo.
    echo 现在可以运行: start_frontend.bat
    echo.
) else (
    echo.
    echo ====================================
    echo 安装失败
    echo ====================================
    echo.
    echo 可能的原因:
    echo   1. 网络连接问题
    echo   2. 防火墙阻止
    echo   3. 磁盘空间不足
    echo.
    echo 建议:
    echo   1. 检查网络连接
    echo   2. 尝试重新运行此脚本
    echo   3. 或手动运行: npm install --verbose
    echo.
)

pause

