@echo off
chcp 65001 >nul
echo ====================================
echo StructForge AI - Conda环境设置
echo ====================================
echo.

REM 获取脚本所在目录的绝对路径
set "SCRIPT_DIR=%~dp0"
set "ENV_FILE=%SCRIPT_DIR%environment.yml"

REM 检查environment.yml文件是否存在
if not exist "%ENV_FILE%" (
    echo [错误] 未找到 environment.yml 文件！
    echo 文件路径: %ENV_FILE%
    echo.
    echo 请确保在 backend 目录下运行此脚本
    pause
    exit /b 1
)

REM 检查conda是否安装
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到conda命令！
    echo.
    echo 请先安装Anaconda或Miniconda:
    echo   - Anaconda: https://www.anaconda.com/download
    echo   - Miniconda: https://docs.conda.io/en/latest/miniconda.html
    echo.
    pause
    exit /b 1
)

echo [1/4] 检查conda环境...
call conda --version
echo.

echo [2/4] 检查环境是否已存在...
call conda env list | findstr structforge-ai >nul
if %errorlevel% equ 0 (
    echo 环境 'structforge-ai' 已存在
    echo.
    set /p choice="是否删除并重新创建? (y/n): "
    if /i "%choice%"=="y" (
        echo 正在删除旧环境...
        call conda env remove -n structforge-ai -y
    ) else (
        echo 使用现有环境
        goto :activate
    )
)

echo [3/4] 创建conda环境（这可能需要几分钟）...
echo 使用环境文件: %ENV_FILE%
call conda env create -f "%ENV_FILE%"

if %errorlevel% neq 0 (
    echo [错误] 环境创建失败！
    echo.
    echo 可能的原因:
    echo   1. 某些pip包安装失败（但conda环境可能已创建）
    echo   2. 网络连接问题
    echo.
    echo 请检查上方错误信息，如果环境已创建，可以尝试:
    echo   conda activate structforge-ai
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:activate
echo.
echo [4/4] 验证环境创建...
call conda env list | findstr structforge-ai >nul
if %errorlevel% neq 0 (
    echo [错误] 环境创建失败，请检查上方错误信息
    pause
    exit /b 1
)

echo 环境创建成功！
echo.
echo ====================================
echo 环境设置完成！
echo.
echo 环境名称: structforge-ai
echo Python版本: 3.10
echo 环境文件: %ENV_FILE%
echo.
echo 使用以下命令启动服务:
echo   1. 激活环境: conda activate structforge-ai
echo   2. 切换到目录: cd "%SCRIPT_DIR%"
echo   3. 启动服务: python main.py
echo.
echo 或者直接运行: start_conda.bat
echo ====================================
pause

