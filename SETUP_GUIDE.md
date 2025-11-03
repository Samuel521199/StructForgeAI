# StructForge AI - 完整安装指南

## 🚨 常见问题解决

### 问题：ModuleNotFoundError: No module named 'fastapi'

**原因**：未安装Python依赖包

**解决方法**：

#### Windows用户（推荐）

```powershell
# 方法1: 使用自动化脚本（最简单）
cd F:\StructForgeAI\backend
.\setup_backend.bat

# 方法2: 手动安装
cd F:\StructForgeAI\backend
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Linux/macOS用户

```bash
# 方法1: 使用自动化脚本
cd F:\StructForgeAI\backend
chmod +x setup_backend.sh
./setup_backend.sh

# 方法2: 手动安装
cd F:\StructForgeAI\backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 📋 完整安装流程

### 第一步：检查Python环境

```powershell
# 检查Python版本（需要3.10+）
python --version

# 如果版本太低或未安装，请访问 https://www.python.org/downloads/
```

### 第二步：设置后端环境

```powershell
cd F:\StructForgeAI\backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 升级pip
python -m pip install --upgrade pip

# 安装所有依赖
pip install -r requirements.txt
```

**安装时间**：约5-10分钟（取决于网络速度）

### 第三步：验证安装

```powershell
# 激活虚拟环境（如果还没激活）
venv\Scripts\activate

# 测试导入
python -c "import fastapi; print('FastAPI安装成功')"
python -c "import uvicorn; print('Uvicorn安装成功')"
```

### 第四步：启动后端服务

```powershell
# 确保虚拟环境已激活
venv\Scripts\activate

# 启动服务
python main.py

# 或使用uvicorn（推荐，支持热重载）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 第五步：验证服务运行

打开浏览器访问：
- http://localhost:8000/health （应该返回 `{"status": "healthy"}`）
- http://localhost:8000/docs （Swagger API文档）

## ⚠️ 可能遇到的问题

### 1. pip安装速度慢

**使用国内镜像源**：

```powershell
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 2. 某些包安装失败（如faiss）

**faiss-cpu安装问题**：

```powershell
# Windows用户如果faiss安装失败，可以先跳过，稍后安装
# 或者使用conda安装
conda install -c conda-forge faiss-cpu
```

**临时方案**（如果faiss无法安装）：
- 在 `backend/core/config.py` 中将 `VECTOR_DB_TYPE` 改为 `chromadb`
- 或注释掉faiss相关代码

### 3. 编译错误（Windows）

某些包可能需要C++编译器：

**安装Visual C++ Build Tools**：
- 下载地址：https://visualstudio.microsoft.com/downloads/
- 选择 "Build Tools for Visual Studio"
- 安装时选择 "C++ build tools"

### 4. 端口被占用

如果8000端口被占用：

```powershell
# 更改端口（在main.py或uvicorn命令中）
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## 🔧 环境变量配置（可选）

创建 `backend/.env` 文件：

```env
# AI模型配置
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-instruct-q4
AI_BASE_URL=http://localhost:11434

# 文件存储路径
UPLOAD_DIR=F:/StructForgeAI/data/uploads
EXPORT_DIR=F:/StructForgeAI/data/exports
TEMPLATE_DIR=F:/StructForgeAI/templates

# 数据库
DATABASE_URL=sqlite:///F:/StructForgeAI/data/structforge.db

# 向量数据库
VECTOR_DB_TYPE=faiss
VECTOR_DB_PATH=F:/StructForgeAI/data/vector_db
```

## ✅ 验证清单

安装完成后，检查以下项目：

- [ ] Python版本 >= 3.10
- [ ] 虚拟环境已创建并激活
- [ ] 所有依赖包安装成功（`pip list` 查看）
- [ ] 后端服务可以启动（无错误）
- [ ] 可以访问 http://localhost:8000/health

## 📞 需要帮助？

如果遇到其他问题：
1. 检查错误信息的完整内容
2. 查看 `logs/app.log` 日志文件
3. 确保Python版本正确
4. 确保网络连接正常（下载依赖需要）

---

**安装完成后，就可以启动服务了！** 🎉

