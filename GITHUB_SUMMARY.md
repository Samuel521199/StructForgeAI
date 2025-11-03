# StructForge AI - GitHub项目摘要

---

## 中文版 / Chinese

### 🎯 项目简介

StructForge AI 是一款基于AI理解与生成的多游戏数据工作流系统。通过AI自主分析，**无需预设模板**即可处理各类文件格式和数据结构，实现自然语言驱动的配置编辑。

### ✨ 核心特性

- 🤖 **AI自主分析**：无需预设模板，AI自动理解文件结构和字段含义
- 📊 **多格式支持**：XML、JSON、YAML、CSV、Excel、TSV等常见数据格式
- 💻 **本地部署**：完全离线运行，保护数据隐私（优化支持RTX 4060）
- 🔄 **智能工作流**：导入 → 分析 → 编辑 → 导出一体化流程
- 🌐 **自然语言编辑**：用自然语言描述需求，AI自动生成配置

### 🛠️ 技术栈

- **后端**：FastAPI (Python 3.10+) + Conda环境
- **AI模型**：Ollama/LM Studio（本地部署，Qwen2.5-7B推荐）
- **前端**：React 18 + TypeScript + Ant Design
- **向量数据库**：FAISS / ChromaDB

### 🚀 快速开始

```powershell
# 一键启动所有服务
.\start_all.bat
```

### 📊 项目状态

- ✅ 后端核心功能完成（90%）
- 🚧 前端开发中（70%）
- ✅ AI集成可用（80%）

### 📚 文档

- [完整安装指南](SETUP_COMPLETE.md)
- [快速启动指南](QUICK_START.md)
- [架构设计](docs/ARCHITECTURE.md)

---

## English Version

### 🎯 Project Overview

StructForge AI is an AI-driven, extensible intelligent workflow system for game data configuration. Through autonomous AI analysis, it processes various file formats and data structures **without requiring predefined templates**, enabling natural language-driven configuration editing.

### ✨ Key Features

- 🤖 **AI Autonomous Analysis**: No templates needed, AI automatically understands file structures and field meanings
- 📊 **Multi-Format Support**: XML, JSON, YAML, CSV, Excel, TSV and more
- 💻 **Local Deployment**: Fully offline operation, protects data privacy (optimized for RTX 4060)
- 🔄 **Smart Workflow**: Integrated process of import → analysis → edit → export
- 🌐 **Natural Language Editing**: Describe requirements in natural language, AI automatically generates configurations

### 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.10+) + Conda Environment
- **AI Models**: Ollama/LM Studio (Local deployment, Qwen2.5-7B recommended)
- **Frontend**: React 18 + TypeScript + Ant Design
- **Vector Database**: FAISS / ChromaDB

### 🚀 Quick Start

```powershell
# Start all services with one command
.\start_all.bat
```

### 📊 Project Status

- ✅ Backend core functionality complete (90%)
- 🚧 Frontend in development (70%)
- ✅ AI integration available (80%)

### 📚 Documentation

- [Complete Installation Guide](SETUP_COMPLETE.md)
- [Quick Start Guide](QUICK_START.md)
- [Architecture Design](docs/ARCHITECTURE.md)

---

## 📈 Version: v0.1.0-alpha

**Release Date**: 2024  
**Status**: Alpha Testing

