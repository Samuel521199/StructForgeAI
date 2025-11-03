#!/bin/bash

echo "===================================="
echo "StructForge AI - Conda环境设置"
echo "===================================="
echo ""

# 检查conda是否安装
if ! command -v conda &> /dev/null; then
    echo "[错误] 未找到conda命令！"
    echo ""
    echo "请先安装Anaconda或Miniconda:"
    echo "  - Anaconda: https://www.anaconda.com/download"
    echo "  - Miniconda: https://docs.conda.io/en/latest/miniconda.html"
    echo ""
    exit 1
fi

echo "[1/4] 检查conda环境..."
conda --version
echo ""

echo "[2/4] 检查环境是否已存在..."
if conda env list | grep -q "structforge-ai"; then
    echo "环境 'structforge-ai' 已存在"
    echo ""
    read -p "是否删除并重新创建? (y/n): " choice
    if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
        echo "正在删除旧环境..."
        conda env remove -n structforge-ai -y
    else
        echo "使用现有环境"
        exit 0
    fi
fi

echo "[3/4] 创建conda环境（这可能需要几分钟）..."
conda env create -f environment.yml

if [ $? -ne 0 ]; then
    echo "[错误] 环境创建失败！"
    exit 1
fi

echo ""
echo "[4/4] 环境创建完成！"
echo ""
echo "===================================="
echo "环境设置完成！"
echo ""
echo "环境名称: structforge-ai"
echo "Python版本: 3.10"
echo ""
echo "使用以下命令:"
echo "  1. 激活环境: conda activate structforge-ai"
echo "  2. 启动服务: python main.py"
echo ""
echo "或者直接运行: ./start_conda.sh"
echo "===================================="

