# StructForge AI - 安装指南

## 🎯 快速选择

### 方式一：Conda环境（推荐 ⭐）

**优点**：完全隔离，不冲突，管理方便

- ✅ [Conda安装指南](CONDA_SETUP_GUIDE.md) - 推荐阅读
- ✅ 使用脚本：`backend\setup_conda.bat`（Windows）或 `setup_conda.sh`（Linux/macOS）
- ✅ 启动脚本：`backend\start_conda.bat`（Windows）或 `start_conda.sh`（Linux/macOS）

### 方式二：venv虚拟环境

**优点**：轻量，Python内置

- 📖 [详细安装指南](SETUP_GUIDE.md)
- 使用脚本：`backend\setup_backend.bat`（Windows）

## 🚀 一键安装（Conda）

### Windows用户

```powershell
# 1. 安装Conda环境
cd F:\StructForgeAI\backend
.\setup_conda.bat

# 2. 启动服务
.\start_conda.bat
```

### Linux/macOS用户

```bash
# 1. 添加执行权限
cd F:\StructForgeAI\backend
chmod +x setup_conda.sh start_conda.sh

# 2. 安装Conda环境
./setup_conda.sh

# 3. 启动服务
./start_conda.sh
```

## 📋 需要什么？

### 必需
- ✅ Python 3.10+
- ✅ Conda (Anaconda/Miniconda) 或 Python venv
- ✅ 网络连接（下载依赖）

### 可选（AI功能）
- 🎮 NVIDIA GPU（RTX 4060推荐）
- 🤖 Ollama（本地AI模型）
- 💾 20GB+ 可用空间

## 📚 详细文档

- [Conda环境完整指南](CONDA_SETUP_GUIDE.md) - Conda环境详细说明
- [通用安装指南](SETUP_GUIDE.md) - venv安装和问题解决
- [快速启动指南](QUICK_START.md) - 启动和测试

## ⚡ 验证安装

安装完成后访问：
- ✅ http://localhost:8000/health - 健康检查
- ✅ http://localhost:8000/docs - API文档

---

**推荐使用Conda环境，完全独立不冲突！** 🎉

