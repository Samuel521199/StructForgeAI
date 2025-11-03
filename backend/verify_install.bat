@echo off
chcp 65001 >nul
echo ====================================
echo 验证安装
echo ====================================
echo.

REM 激活环境
call conda activate structforge-ai
if %errorlevel% neq 0 (
    echo [Error] Environment 'structforge-ai' not found!
    pause
    exit /b 1
)

echo 检查核心依赖...
echo.

python -c "import fastapi; print('[OK] FastAPI installed')" 2>nul || echo [FAIL] FastAPI not installed
python -c "import uvicorn; print('[OK] Uvicorn installed')" 2>nul || echo [FAIL] Uvicorn not installed
python -c "import pydantic; print('[OK] Pydantic installed')" 2>nul || echo [FAIL] Pydantic not installed
python -c "import lxml; print('[OK] lxml installed')" 2>nul || echo [FAIL] lxml not installed
python -c "import yaml; print('[OK] PyYAML installed')" 2>nul || echo [FAIL] PyYAML not installed
python -c "import openpyxl; print('[OK] openpyxl installed')" 2>nul || echo [FAIL] openpyxl not installed
python -c "import ollama; print('[OK] ollama installed')" 2>nul || echo [FAIL] ollama not installed
python -c "import chromadb; print('[OK] chromadb installed')" 2>nul || echo [FAIL] chromadb not installed
python -c "import sentence_transformers; print('[OK] sentence-transformers installed')" 2>nul || echo [FAIL] sentence-transformers not installed

echo.
echo ====================================
echo 如果所有依赖都显示 [OK]，说明安装成功！
echo ====================================
pause

