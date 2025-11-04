@echo off
echo ====================================
echo 启动 StructForge AI 后端服务
echo ====================================
echo.

REM 检查虚拟环境是否存在
if not exist venv (
    echo 错误: 虚拟环境不存在！
    echo 请先运行 setup_backend.bat 安装依赖
    pause
    exit /b 1
)

REM 激活虚拟环境
call venv\Scripts\activate.bat

REM 检查依赖是否安装
python -c "import fastapi" 2>nul
if %errorlevel% neq 0 (
    echo 错误: 依赖未安装！
    echo 请先运行 setup_backend.bat 安装依赖
    pause
    exit /b 1
)

echo 正在启动服务...
echo 访问地址: http://localhost:8001
echo API文档: http://localhost:8001/docs
echo.

REM 启动服务
python main.py

pause

