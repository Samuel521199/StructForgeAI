@echo off
chcp 65001 >nul

REM 获取脚本所在目录的绝对路径
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ====================================
echo 启动 StructForge AI 后端服务 (Conda)
echo ====================================
echo.
echo 工作目录: %SCRIPT_DIR%
echo.

REM 检查conda是否安装
where conda >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到conda命令！
    echo 请先安装Anaconda或Miniconda
    pause
    exit /b 1
)

REM 激活conda环境
call conda activate structforge-ai
if %errorlevel% neq 0 (
    echo [错误] 环境 'structforge-ai' 不存在！
    echo.
    echo 请先运行 setup_conda.bat 创建环境
    echo.
    pause
    exit /b 1
)

REM 检查是否在正确的环境中
python -c "import sys; exit(0 if 'structforge-ai' in sys.executable else 1)" 2>nul
if %errorlevel% neq 0 (
    echo [警告] 可能未正确激活环境
)

REM 检查依赖是否安装
echo Checking dependencies...
python -c "import fastapi" 2>nul
if %errorlevel% neq 0 (
    echo [Warning] Dependencies not fully installed!
    echo Installing dependencies...
    pip install -r requirements.txt
    set PIP_ERROR=%errorlevel%
    
    REM 再次检查是否安装成功（pip可能返回非0但实际成功）
    python -c "import fastapi" 2>nul
    if %errorlevel% equ 0 (
        echo [Success] Dependencies installed successfully!
    ) else (
        echo [Error] Dependency installation failed!
        echo Please check the error messages above.
        pause
        exit /b 1
    )
)

echo.
echo ====================================
echo 服务信息
echo ====================================
echo 环境: structforge-ai
echo 访问地址: http://localhost:8001
echo API文档: http://localhost:8001/docs
echo 健康检查: http://localhost:8001/health
echo.
echo 按 Ctrl+C 停止服务
echo ====================================
echo.

REM 启动服务
echo Starting server...
python main.py

if %errorlevel% neq 0 (
    echo.
    echo [Error] Server startup failed!
    echo Please check the error messages above.
    echo.
    pause
)

