# StructForge AI

<div align="center">

**🤖 基于AI理解与生成的多游戏数据工作流系统**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-In%20Development-orange.svg)]()

[English](#english) | [中文](#中文)

</div>

---

<div id="中文">

## 📖 项目简介

**StructForge AI** 是一个由 AI 驱动的、可扩展的智能工作流系统，通过AI自主分析，**无需预设模板**即可处理各类文件格式和数据结构。

### ✨ 核心特性

- 🤖 **AI自主分析**：无需预设模板，AI自动理解文件结构和字段含义
- 📊 **多格式支持**：XML、JSON、YAML、CSV、Excel、TSV等常见数据格式
- 💻 **本地部署**：完全离线运行，保护数据隐私（优化支持RTX 4060）
- 🔄 **智能工作流**：导入 → 分析 → 编辑 → 导出一体化流程
- 🌐 **自然语言编辑**：用自然语言描述需求，AI自动生成配置
- 🔍 **关系图谱**：自动识别数据字段间的引用、依赖、组合关系

### 🎯 应用场景

- 游戏配置文件管理（武器、装备、道具等）
- 批量数据修改与验证
- 多格式配置文件转换
- 智能数据迁移
- 配置文件的自然语言编辑

---

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI (Python 3.10+)
- **AI模型**: Ollama / LM Studio（本地部署）
  - Qwen2.5-7B（推荐，中文支持好）
  - Llama3.1-8B（英文场景）
- **向量数据库**: FAISS / ChromaDB
- **数据存储**: SQLite

### 前端（开发中）
- React 18 + TypeScript
- Ant Design / Mantine
- Monaco Editor（代码编辑器）
- React Flow（可视化）

---

## 📋 前置要求

### 系统要求
- **操作系统**: Windows 10/11, Linux, macOS
- **Python**: 3.10 或更高版本
- **Node.js**: 18+（前端开发需要）

### 硬件要求（AI功能）
- **GPU**: NVIDIA RTX 4060 或其他支持CUDA的GPU（8GB+ VRAM）
- **RAM**: 16GB+ 推荐
- **存储**: 20GB+ 可用空间（用于模型存储）

### 软件要求
- **AI模型运行时**（二选一）：
  - [Ollama](https://ollama.ai/)（推荐，最简单）
  - [LM Studio](https://lmstudio.ai/)（图形界面）
- **NVIDIA驱动**: 最新版本（如使用GPU）

---

## 🚀 快速开始

### ⚡ 一键安装（推荐 - Conda版本）

**Windows用户**：

1. **安装前置条件**：
   - [Anaconda/Miniconda](https://www.anaconda.com/download)
   - [Node.js 18+](https://nodejs.org/)

2. **一键安装**：
   ```powershell
   # 双击运行或命令行执行
   .\install_all_conda.bat
   ```

3. **一键启动**：
   ```powershell
   .\start_all_conda.bat
   ```

详细说明请查看：[README_INSTALL_CONDA.md](README_INSTALL_CONDA.md)

---

## 🚀 快速开始（其他方式）

### 步骤1：克隆仓库

```bash
git clone https://github.com/yourusername/StructForgeAI.git
cd StructForgeAI
```

### 步骤2：安装AI模型（Ollama）

#### 🚀 快速安装（推荐）

**Windows 用户**：使用项目提供的快捷脚本一键安装

**方式一：使用快速设置助手（推荐，可从任何目录运行）**
```bash
# 从任何目录运行，脚本会自动找到项目目录
run_setup.bat
```

**方式二：从项目根目录运行**
```bash
# 切换到项目根目录
cd F:\StructForgeAI

# 1. 运行安装脚本（自动安装 Ollama 和下载模型）
install_ollama.bat

# 2. 配置后端 .env 文件
setup_ai_config.bat

# 3. 测试 AI 服务连接
test_ai_service.bat
```

#### 📝 手动安装

**Windows**:
1. 访问 [Ollama官网](https://ollama.ai/download) 下载并安装
2. 打开命令提示符或PowerShell
3. 下载推荐模型：

```bash
ollama pull qwen2.5:7b-q4_0
```

**Linux/macOS**:
```bash
# 安装Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 下载模型
ollama pull qwen2.5:7b-q4_0
```

**验证安装**：
```bash
ollama list
ollama run qwen2.5:7b-q4_0 "你好"
```

> 💡 **提示**：Windows 用户推荐使用 `install_ollama.bat` 脚本，它会自动完成所有安装步骤。

### 步骤3：创建目录结构

```bash
# 使用Python脚本创建
python setup_directories.py

# 或手动创建
mkdir -p data/uploads data/exports data/vector_db templates logs
```

### 步骤4：配置后端环境

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 步骤5：配置文件

#### 🚀 快速配置（推荐）

**Windows 用户**：运行配置脚本

```bash
setup_ai_config.bat
```

脚本会自动：
- 创建 `backend/.env` 文件
- 引导选择 AI 提供商（Ollama / LM Studio / OpenAI）
- 设置默认配置

#### 📝 手动配置

创建 `backend/.env` 文件（可复制 `.env.example`）：

```env
# AI模型配置
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434

# 文件存储路径（根据实际情况修改）
UPLOAD_DIR=F:/StructForgeAI/data/uploads
EXPORT_DIR=F:/StructForgeAI/data/exports
TEMPLATE_DIR=F:/StructForgeAI/templates

# 数据库
DATABASE_URL=sqlite:///F:/StructForgeAI/data/structforge.db

# 向量数据库
VECTOR_DB_TYPE=faiss
VECTOR_DB_PATH=F:/StructForgeAI/data/vector_db
```

> 💡 **提示**：Windows 用户推荐使用 `setup_ai_config.bat` 脚本，它会自动创建并配置 `.env` 文件。

### 步骤6：启动后端服务

```bash
cd backend

# 方式1：直接运行
python main.py

# 方式2：使用uvicorn（推荐，支持热重载）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 步骤7：验证部署

#### 🚀 快速验证（推荐）

**Windows 用户**：运行测试脚本

```bash
# 测试 AI 服务连接
test_ai_service.bat
```

#### 📝 手动验证

- ✅ **健康检查**: http://localhost:8001/health
- ✅ **API文档**: http://localhost:8001/docs（Swagger UI）
- ✅ **ReDoc文档**: http://localhost:8001/redoc
- ✅ **AI服务测试**: 运行 `python backend/check_ai_service.py`

---

## 📖 使用说明

### API使用示例

#### 1. 上传文件

```bash
curl -X POST "http://localhost:8001/api/v1/files/upload" \
  -F "file=@weapons.xml"
```

**响应**：
```json
{
  "filename": "weapons.xml",
  "path": "F:/StructForgeAI/data/uploads/weapons.xml",
  "size": 102400
}
```

#### 2. 解析文件

```bash
curl -X POST "http://localhost:8001/api/v1/files/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "F:/StructForgeAI/data/uploads/weapons.xml"
  }'
```

#### 3. 分析Schema（AI模式）

```bash
curl -X POST "http://localhost:8001/api/v1/schemas/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "weapon": {
        "name": "帝国长剑",
        "damage": 50,
        "weight": 3.5
      }
    },
    "use_ai": true,
    "metadata": {
      "game": "Mount & Blade II"
    }
  }'
```

#### 4. 自然语言编辑

```bash
curl -X POST "http://localhost:8001/api/v1/schemas/infer-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "复制这把帝国剑，但把重量降到2.5，攻击范围提高10%",
    "schema": {
      "fields": {
        "weight": {"type": "number"},
        "damage": {"type": "number"},
        "length": {"type": "number"}
      }
    },
    "use_ai": true
  }'
```

**响应示例**：
```json
{
  "intent": {
    "action": "copy_and_update",
    "target": "weapon",
    "modifications": [
      {"field": "weight", "value": 2.5},
      {"field": "length", "operation": "multiply", "value": 1.1}
    ]
  },
  "instruction": "复制这把帝国剑，但把重量降到2.5，攻击范围提高10%"
}
```

#### 5. 执行完整工作流

```bash
curl -X POST "http://localhost:8001/api/v1/workflows/execute/full_pipeline" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "F:/StructForgeAI/data/uploads/weapons.xml",
    "instruction": "将所有的剑的重量减少10%",
    "output_format": "json",
    "use_ai": true
  }'
```

### Python SDK使用示例

```python
import requests

BASE_URL = "http://localhost:8001/api/v1"

# 上传文件
with open("weapons.xml", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/files/upload",
        files={"file": f}
    )
    print(response.json())

# 分析Schema
schema_response = requests.post(
    f"{BASE_URL}/schemas/analyze",
    json={
        "data": {...},
        "use_ai": True
    }
)
print(schema_response.json())
```

---

## 🏗️ 项目结构

```
StructForgeAI/
├── backend/                    # 后端服务
│   ├── api/                   # API路由层
│   │   ├── files.py          # 文件管理API
│   │   ├── schemas.py        # Schema分析API
│   │   ├── workflows.py      # 工作流API
│   │   └── ai.py             # AI服务API
│   ├── core/                  # 核心模块
│   │   ├── config.py         # 配置管理
│   │   └── logging_config.py # 日志配置
│   ├── data_parser/           # 文件解析层
│   │   ├── base_parser.py    # 解析器基类
│   │   ├── xml_parser.py     # XML解析器
│   │   ├── json_parser.py    # JSON解析器
│   │   ├── yaml_parser.py    # YAML解析器
│   │   ├── csv_parser.py     # CSV/TSV解析器
│   │   ├── excel_parser.py   # Excel解析器
│   │   └── parser_factory.py # 解析器工厂
│   ├── schema_learner/        # Schema学习层
│   │   ├── base_learner.py   # 学习器基类
│   │   ├── ai_learner.py     # AI学习器
│   │   └── rule_learner.py   # 规则学习器
│   ├── ai_integration/        # AI集成层
│   │   ├── llm_client.py     # LLM客户端
│   │   ├── embedding_client.py # 嵌入向量客户端
│   │   └── vector_db.py      # 向量数据库
│   ├── workflow/              # 工作流引擎
│   │   ├── workflow_engine.py
│   │   └── default_workflows.py
│   ├── main.py                # 应用入口
│   └── requirements.txt       # Python依赖
├── frontend/                  # 前端应用（开发中）
├── docs/                      # 项目文档
│   ├── ARCHITECTURE.md        # 架构设计
│   ├── DEPLOYMENT.md          # 部署指南
│   └── PROJECT_SUMMARY.md     # 项目总结
├── data/                      # 数据目录
│   ├── uploads/               # 上传文件
│   ├── exports/               # 导出文件
│   └── vector_db/             # 向量数据库
├── templates/                 # 模板文件
├── logs/                      # 日志文件
├── install_ollama.bat         # Ollama 安装脚本（Windows）
├── setup_ai_config.bat        # AI 配置快速设置（Windows）
├── test_ai_service.bat         # AI 服务测试脚本（Windows）
├── README.md                  # 项目说明
└── setup_directories.py       # 目录初始化脚本
```

---

## ⚙️ 配置说明

### 环境变量配置

所有配置可通过环境变量或 `.env` 文件设置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_MODEL_PROVIDER` | AI模型提供商 | `ollama` |
| `AI_MODEL_NAME` | 模型名称 | `qwen2.5:7b-instruct-q4` |
| `AI_BASE_URL` | AI服务地址 | `http://localhost:11434` |
| `UPLOAD_DIR` | 上传文件目录 | `F:/StructForgeAI/data/uploads` |
| `EXPORT_DIR` | 导出文件目录 | `F:/StructForgeAI/data/exports` |
| `VECTOR_DB_TYPE` | 向量数据库类型 | `faiss` |
| `DATABASE_URL` | 数据库连接字符串 | `sqlite:///F:/StructForgeAI/data/structforge.db` |

### RTX 4060 优化配置

针对RTX 4060（8GB VRAM）的推荐配置：

```env
# 使用Q4量化模型（占用约4.5GB VRAM）
AI_MODEL_NAME=qwen2.5:7b-instruct-q4

# 批处理优化
AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.7

# 向量数据库使用CPU版本（节省VRAM）
VECTOR_DB_TYPE=faiss
```

详细配置指南请参考：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 📚 文档

- 🚀 [快速安装指南](docs/QUICK_INSTALL.md) - Windows 一键安装和配置（推荐）
- 📘 [架构设计文档](docs/ARCHITECTURE.md) - 了解系统架构和设计理念
- 🚀 [部署指南](docs/DEPLOYMENT.md) - RTX 4060本地部署详细步骤
- 📊 [项目总结](docs/PROJECT_SUMMARY.md) - 项目功能与特性总结
- 🔧 [开发规范](.cursor/rules/always-rules.mdc) - 代码规范和最佳实践

---

## 🧪 测试

```bash
cd backend

# 运行测试
pytest tests/

# 带覆盖率
pytest --cov=. tests/
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 开发计划

### 已完成 ✅
- [x] 项目结构搭建
- [x] 文件解析层（XML/JSON/YAML/CSV/Excel）
- [x] AI模型集成（Ollama/LM Studio）
- [x] Schema学习器（AI + 规则）
- [x] 工作流引擎
- [x] API接口
- [x] 前端项目结构
- [x] 前端核心页面（Dashboard、文件管理、Schema分析、工作流）

### 进行中 🚧
- [ ] 前端功能完善与集成测试
- [ ] 完整工作流测试

### 计划中 📋
- [ ] 性能优化
- [ ] 插件系统
- [ ] Monaco Editor集成（代码编辑器）
- [ ] React Flow集成（关系图谱可视化）

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代化Web框架
- [Ollama](https://ollama.ai/) - 本地AI模型运行环境
- [Qwen](https://github.com/QwenLM/Qwen) - 优秀的开源大语言模型

---

<div id="english">

## 📖 Introduction

**StructForge AI** is an AI-driven, extensible intelligent workflow system that autonomously analyzes and processes various file formats and data structures **without requiring predefined templates**.

### ✨ Key Features

- 🤖 **AI Autonomous Analysis**: No templates needed, AI automatically understands file structures and field meanings
- 📊 **Multi-Format Support**: XML, JSON, YAML, CSV, Excel, TSV and more
- 💻 **Local Deployment**: Fully offline operation, protects data privacy (optimized for RTX 4060)
- 🔄 **Smart Workflow**: Integrated process of import → analysis → edit → export
- 🌐 **Natural Language Editing**: Describe requirements in natural language, AI automatically generates configurations
- 🔍 **Relationship Graph**: Automatically identifies references, dependencies, and composition relationships between data fields

### 🎯 Use Cases

- Game configuration file management (weapons, equipment, items, etc.)
- Batch data modification and validation
- Multi-format configuration file conversion
- Intelligent data migration
- Natural language editing of configuration files

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **AI Models**: Ollama / LM Studio (local deployment)
  - Qwen2.5-7B (Recommended, excellent Chinese support)
  - Llama3.1-8B (English scenarios)
- **Vector Database**: FAISS / ChromaDB
- **Data Storage**: SQLite

### Frontend (In Development)
- React 18 + TypeScript
- Ant Design / Mantine
- Monaco Editor (code editor)
- React Flow (visualization)

---

## 📋 Prerequisites

### System Requirements
- **OS**: Windows 10/11, Linux, macOS
- **Python**: 3.10 or higher
- **Node.js**: 18+ (for frontend development)

### Hardware Requirements (AI Features)
- **GPU**: NVIDIA RTX 4060 or other CUDA-supporting GPU (8GB+ VRAM)
- **RAM**: 16GB+ recommended
- **Storage**: 20GB+ available space (for model storage)

### Software Requirements
- **AI Model Runtime** (choose one):
  - [Ollama](https://ollama.ai/) (Recommended, simplest)
  - [LM Studio](https://lmstudio.ai/) (GUI)
- **NVIDIA Driver**: Latest version (if using GPU)

---

## 🚀 Quick Start

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/StructForgeAI.git
cd StructForgeAI
```

### Step 2: Install AI Model (Ollama)

#### Windows
1. Visit [Ollama website](https://ollama.ai/download) to download and install
2. Open Command Prompt or PowerShell
3. Download recommended model:

```bash
ollama pull qwen2.5:7b-instruct-q4
```

#### Linux/macOS
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download model
ollama pull qwen2.5:7b-instruct-q4
```

**Verify Installation**:
```bash
ollama list
ollama run qwen2.5:7b-instruct-q4 "Hello"
```

### Step 3: Create Directory Structure

```bash
# Use Python script
python setup_directories.py

# Or manually create
mkdir -p data/uploads data/exports data/vector_db templates logs
```

### Step 4: Setup Backend Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 5: Configuration (Optional)

Create `backend/.env` file (copy from `.env.example`):

```env
# AI Model Configuration
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-instruct-q4
AI_BASE_URL=http://localhost:11434

# File Storage Paths (modify as needed)
UPLOAD_DIR=F:/StructForgeAI/data/uploads
EXPORT_DIR=F:/StructForgeAI/data/exports
TEMPLATE_DIR=F:/StructForgeAI/templates

# Database
DATABASE_URL=sqlite:///F:/StructForgeAI/data/structforge.db

# Vector Database
VECTOR_DB_TYPE=faiss
VECTOR_DB_PATH=F:/StructForgeAI/data/vector_db
```

### Step 6: Start Backend Service

```bash
cd backend

# Method 1: Direct run
python main.py

# Method 2: Using uvicorn (recommended, with hot reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 7: Verify Deployment

- ✅ **Health Check**: http://localhost:8001/health
- ✅ **API Documentation**: http://localhost:8001/docs (Swagger UI)
- ✅ **ReDoc Documentation**: http://localhost:8001/redoc

---

## 📖 Usage

### API Usage Examples

#### 1. Upload File

```bash
curl -X POST "http://localhost:8001/api/v1/files/upload" \
  -F "file=@weapons.xml"
```

#### 2. Parse File

```bash
curl -X POST "http://localhost:8001/api/v1/files/parse" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "F:/StructForgeAI/data/uploads/weapons.xml"}'
```

#### 3. Analyze Schema (AI Mode)

```bash
curl -X POST "http://localhost:8001/api/v1/schemas/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {...},
    "use_ai": true
  }'
```

#### 4. Natural Language Editing

```bash
curl -X POST "http://localhost:8001/api/v1/schemas/infer-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Copy this imperial sword, but reduce weight to 2.5 and increase range by 10%",
    "schema": {...},
    "use_ai": true
  }'
```

---

## 📚 Documentation

- 📘 [Architecture Documentation](docs/ARCHITECTURE.md) - System architecture and design concepts
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md) - Detailed RTX 4060 local deployment steps
- 📊 [Project Summary](docs/PROJECT_SUMMARY.md) - Project features and capabilities summary
- 🔧 [Development Guidelines](.cursor/rules/always-rules.mdc) - Code standards and best practices

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

</div>

<div align="center">

**Made with ❤️ by StructForge AI Team**

[⬆ Back to Top](#structforge-ai)

</div>
