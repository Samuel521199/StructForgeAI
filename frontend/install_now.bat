@echo off
chcp 65001 >nul
echo ====================================
echo 立即安装前端依赖（使用国内镜像）
echo ====================================
echo.

cd /d "%~dp0"

echo 正在设置国内镜像源（淘宝镜像）...
call npm config set registry https://registry.npmmirror.com
echo 镜像设置完成
echo.

echo 开始安装依赖...
echo 显示详细进度...
echo.

REM 使用verbose模式，显示所有输出
call npm install --verbose

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo 安装完成！
    echo ====================================
    echo.
    echo 现在可以运行: start_frontend.bat
    echo 或: npm run dev
    echo.
) else (
    echo.
    echo ====================================
    echo 安装失败
    echo ====================================
    echo.
    echo 请检查上方错误信息
    echo.
)

pause

