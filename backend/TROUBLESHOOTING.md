# 常见问题排查

## ❌ 问题：`pydantic-json-schema==4.17.3` 找不到

**原因**：该包已经不存在或版本号错误

**解决**：已从 `environment.yml` 中移除，该包不是必需的

## ❌ 问题：编码警告 `'gbk' codec can't decode`

**原因**：conda在读取yml文件时使用了错误的编码

**解决**：
1. 确保 `environment.yml` 文件保存为 UTF-8 编码
2. 警告不影响使用，可以忽略

## ✅ 环境已创建但pip安装失败

如果conda环境已创建但pip包安装失败，可以手动完成安装：

```powershell
# 激活环境
conda activate structforge-ai

# 切换到backend目录
cd F:\StructForgeAI\backend

# 安装pip依赖
pip install -r requirements.txt
```

## 🔧 完全重新创建环境

如果需要完全重新创建：

```powershell
# 删除旧环境
conda env remove -n structforge-ai

# 重新运行安装脚本
.\setup_conda.bat
```

## 📝 验证环境

```powershell
# 激活环境
conda activate structforge-ai

# 检查Python版本
python --version

# 检查关键包
python -c "import fastapi; print('FastAPI:', fastapi.__version__)"
python -c "import uvicorn; print('Uvicorn OK')"
python -c "import pydantic; print('Pydantic:', pydantic.__version__)"
```

