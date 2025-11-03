#!/bin/bash

echo "===================================="
echo "StructForge AI - 后端环境设置"
echo "===================================="
echo ""

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python，请先安装Python 3.10+"
    exit 1
fi

python3 --version

echo ""
echo "[1/3] 创建虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境创建成功"
else
    echo "虚拟环境已存在"
fi

echo ""
echo "[2/3] 激活虚拟环境..."
source venv/bin/activate

echo ""
echo "[3/3] 安装依赖包..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "===================================="
echo "环境设置完成！"
echo ""
echo "使用以下命令启动服务:"
echo "  source venv/bin/activate"
echo "  python main.py"
echo "===================================="

