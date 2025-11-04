@echo off
chcp 65001 >nul
echo ================================================
echo StructForge AI - 后端安装脚本 (Conda)
echo ================================================
echo.

REM 获取脚本所在目录
set "BACKEND_DIR=%~dp0"
if "%BACKEND_DIR%"=="" set "BACKEND_DIR=%CD%\"

cd /d "%BACKEND_DIR%"

REM 检查conda
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到conda命令！
    echo 请先安装Anaconda或Miniconda
    pause
    exit /b 1
)

REM 检查environment.yml
if not exist "%BACKEND_DIR%environment.yml" (
    echo [错误] 未找到 environment.yml 文件！
    pause
    exit /b 1
)

echo [步骤 1/3] 创建Conda环境...
call conda env list | findstr structforge-ai >nul
if %errorlevel% equ 0 (
    echo 环境 'structforge-ai' 已存在
    set /p choice="是否删除并重新创建? (y/n): "
    if /i "%choice%"=="y" (
        echo 正在删除旧环境...
        call conda env remove -n structforge-ai -y
    ) else (
        echo 使用现有环境
        goto :install_pip
    )
)

echo 正在创建Conda环境（这可能需要几分钟）...
call conda env create -f "%BACKEND_DIR%environment.yml"
if %errorlevel% neq 0 (
    echo [警告] 环境创建可能有问题，继续检查依赖...
)

:install_pip
echo.
echo [步骤 2/3] 激活环境并检查依赖...
call conda activate structforge-ai
if %errorlevel% neq 0 (
    echo [错误] 无法激活环境！
    pause
    exit /b 1
)

echo.
echo [步骤 3/3] 安装/更新pip依赖...
if exist "%BACKEND_DIR%requirements.txt" (
    pip install -r "%BACKEND_DIR%requirements.txt"
) else (
    echo [警告] 未找到requirements.txt，跳过pip安装
)

echo.
echo ================================================
echo 后端安装完成！
echo ================================================
echo.
echo 环境名称: structforge-ai
echo Python版本: 3.10
echo.
echo 使用以下命令启动:
echo   1. 激活环境: conda activate structforge-ai
echo   2. 启动服务: python main.py
echo.
echo 或直接运行: start_conda.bat
echo ================================================
pause

