@echo off
chcp 65001 >nul
echo ====================================
echo 安装剩余依赖
echo ====================================
echo.

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM 激活conda环境
call conda activate structforge-ai
if %errorlevel% neq 0 (
    echo [错误] 环境 'structforge-ai' 不存在！
    echo 请先运行 setup_conda.bat
    pause
    exit /b 1
)

echo 当前环境: structforge-ai
echo 工作目录: %SCRIPT_DIR%
echo.

echo 正在安装依赖（已修复pydantic-json-schema问题）...
pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo 依赖安装完成！
    echo ====================================
    echo.
    echo 验证安装:
    python -c "import fastapi; print('FastAPI: OK')"
    python -c "import uvicorn; print('Uvicorn: OK')"
    python -c "import pydantic; print('Pydantic: OK')"
    echo.
    echo 现在可以运行: start_conda.bat
) else (
    echo.
    echo [错误] 依赖安装失败！
    echo 请检查上方错误信息
)

pause

