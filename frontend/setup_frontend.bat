@echo off
chcp 65001 >nul
echo ====================================
echo StructForge AI - 前端环境设置
echo ====================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo 工作目录: %SCRIPT_DIR%
echo.

REM 检查Node.js是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到Node.js！
    echo.
    echo 请先安装Node.js 18+:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] 检查Node.js版本...
call node --version
call npm --version
echo.

REM 检查package.json是否存在
if not exist "package.json" (
    echo [错误] 未找到package.json文件！
    echo 请确保在frontend目录下运行此脚本
    pause
    exit /b 1
)

echo [2/2] 安装前端依赖...
echo 这可能需要几分钟时间...
echo.

REM 询问是否使用国内镜像
set /p use_mirror="使用国内镜像加速? (y/n, 默认y): "
if /i "%use_mirror%"=="n" (
    echo 使用默认npm源...
) else (
    echo 设置国内镜像源（淘宝镜像）...
    call npm config set registry https://registry.npmmirror.com
    echo 镜像已设置
)

echo.
echo 开始安装（显示详细进度）...
echo.

call npm install --loglevel=info --progress=true

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo 前端环境设置完成！
    echo ====================================
    echo.
    echo 使用以下命令启动前端:
    echo   start_frontend.bat
    echo.
    echo 或使用统一启动脚本:
    echo   ..\start_all.bat
    echo ====================================
) else (
    echo.
    echo [错误] 依赖安装失败！
    echo 请检查上方错误信息
)

pause

