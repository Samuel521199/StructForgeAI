@echo off
chcp 65001 >nul
REM 快速安装脚本 - 使用国内镜像并显示进度

echo Installing frontend dependencies with Chinese mirror...
echo.

REM 设置国内镜像
call npm config set registry https://registry.npmmirror.com

REM 使用进度显示安装
call npm install --progress=true

echo.
if %errorlevel% equ 0 (
    echo Installation completed!
) else (
    echo Installation failed!
)

pause

