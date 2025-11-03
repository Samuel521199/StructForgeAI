@echo off
echo ====================================
echo StructForge AI - 后端环境设置
echo ====================================
echo.

REM 检查Python版本
python --version
if %errorlevel% neq 0 (
    echo 错误: 未找到Python，请先安装Python 3.10+
    pause
    exit /b 1
)

echo.
echo [1/3] 创建虚拟环境...
if not exist venv (
    python -m venv venv
    echo 虚拟环境创建成功
) else (
    echo 虚拟环境已存在
)

echo.
echo [2/3] 激活虚拟环境...
call venv\Scripts\activate.bat

echo.
echo [3/3] 安装依赖包...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ====================================
echo 环境设置完成！
echo.
echo 使用以下命令启动服务:
echo   venv\Scripts\activate
echo   python main.py
echo ====================================
pause

