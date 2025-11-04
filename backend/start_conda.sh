#!/bin/bash

echo "===================================="
echo "启动 StructForge AI 后端服务 (Conda)"
echo "===================================="
echo ""

# 检查conda是否安装
if ! command -v conda &> /dev/null; then
    echo "[错误] 未找到conda命令！"
    echo "请先安装Anaconda或Miniconda"
    exit 1
fi

# 初始化conda（如果还没初始化）
if [ -z "$CONDA_DEFAULT_ENV" ]; then
    eval "$(conda shell.bash hook)"
fi

# 激活conda环境
conda activate structforge-ai
if [ $? -ne 0 ]; then
    echo "[错误] 环境 'structforge-ai' 不存在！"
    echo ""
    echo "请先运行 ./setup_conda.sh 创建环境"
    echo ""
    exit 1
fi

# 检查依赖是否安装
echo "检查依赖..."
python -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[错误] 依赖未安装！"
    echo "正在安装依赖..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[错误] 依赖安装失败！"
        exit 1
    fi
fi

echo ""
echo "===================================="
echo "服务信息"
echo "===================================="
echo "环境: structforge-ai"
echo "访问地址: http://localhost:8001"
echo "API文档: http://localhost:8001/docs"
echo "健康检查: http://localhost:8001/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo "===================================="
echo ""

# 启动服务
python main.py

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] 服务启动失败！"
    echo ""
    exit 1
fi

