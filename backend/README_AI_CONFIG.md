# AI 服务配置 - 快速解决连接问题

## ⚡ 立即解决（3 分钟）

### 当前错误
```
无法连接到 Ollama 服务 (http://localhost:11434)
```

### 解决方案（三选一）

---

## 🎯 方案 1: 启动 Ollama（推荐）

### 步骤 1: 安装 Ollama
1. 访问 https://ollama.ai/
2. 下载 Windows 安装程序
3. 运行安装程序

### 步骤 2: 下载模型
打开 PowerShell 或 CMD，运行：
```bash
ollama pull qwen2.5:7b-q4_0
```

### 步骤 3: 验证 Ollama 运行
在浏览器访问：http://localhost:11434

或运行：
```bash
ollama list
```

### 步骤 4: 配置后端（如果还没有 .env 文件）
在 `backend` 目录下创建 `.env` 文件：
```env
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434
```

### 步骤 5: 重启后端服务
重启后端服务，再次尝试执行 AI 分析节点。

---

## 🎯 方案 2: 使用 LM Studio（更简单，图形界面）

### 步骤 1: 安装 LM Studio
1. 访问 https://lmstudio.ai/
2. 下载并安装

### 步骤 2: 下载模型
1. 打开 LM Studio
2. 在 "Search" 页面搜索 "Qwen2.5-7B-Instruct"
3. 下载模型

### 步骤 3: 启动服务器
1. 在 "Chat" 页面加载下载的模型
2. 点击左下角的 "Local Server" 图标
3. 确保 "Server is running" 显示为绿色

### 步骤 4: 配置后端
在 `backend` 目录下创建 `.env` 文件：
```env
AI_MODEL_PROVIDER=lmstudio
AI_MODEL_NAME=qwen2.5-7b-instruct
AI_BASE_URL=http://localhost:1234
```

### 步骤 5: 重启后端服务
重启后端服务，再次尝试执行 AI 分析节点。

---

## 🎯 方案 3: 使用 OpenAI（在线服务，无需本地部署）

### 步骤 1: 获取 API Key
1. 访问 https://platform.openai.com/
2. 注册账号并获取 API Key

### 步骤 2: 配置后端
在 `backend` 目录下创建 `.env` 文件：
```env
AI_MODEL_PROVIDER=openai
AI_MODEL_NAME=gpt-3.5-turbo
AI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key_here
```

### 步骤 3: 重启后端服务
重启后端服务，再次尝试执行 AI 分析节点。

---

## 📋 快速检查清单

- [ ] AI 服务已安装（Ollama/LM Studio）或已获取 API Key（OpenAI）
- [ ] AI 服务正在运行（Ollama 后台运行 / LM Studio 服务器已启动）
- [ ] 模型已下载（Ollama/LM Studio）或已配置 API Key（OpenAI）
- [ ] `backend/.env` 文件已创建并配置正确
- [ ] 后端服务已重启

---

## 🔍 验证配置

### 方法 1: 检查 .env 文件
确保 `backend/.env` 文件存在且包含：
```env
AI_MODEL_PROVIDER=ollama  # 或 lmstudio, openai
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434  # 或 http://localhost:1234 (LM Studio)
```

### 方法 2: 测试连接（在激活的 conda 环境中）
```bash
cd backend
python check_ai_service.py
```

### 方法 3: 浏览器测试
- **Ollama**: http://localhost:11434
- **LM Studio**: http://localhost:1234

---

## 🆘 仍然无法连接？

1. **检查服务是否运行**
   - Ollama: 检查系统托盘图标或运行 `ollama serve`
   - LM Studio: 检查左下角是否显示 "Server is running"

2. **检查端口是否正确**
   - Ollama 默认端口: 11434
   - LM Studio 默认端口: 1234
   - 确保 `.env` 中的 `AI_BASE_URL` 端口匹配

3. **检查防火墙**
   - 确保防火墙未阻止本地连接

4. **查看详细日志**
   - 后端日志: `logs/app.log`
   - 控制台错误信息

5. **参考完整文档**
   - `docs/AI_SERVICE_SETUP.md` - 详细配置指南
   - `backend/QUICK_START_AI.md` - 快速启动指南

---

## 💡 推荐配置（RTX 4060）

```env
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
```

这个配置：
- ✅ 显存占用约 4-5GB
- ✅ 适合 RTX 4060 的 8GB 显存
- ✅ 性能和质量平衡良好

---

**完成配置后，请重启后端服务并再次尝试执行 AI 分析节点！**

