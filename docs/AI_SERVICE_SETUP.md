# AI 服务配置指南

StructForge AI 支持多种 AI 模型提供商，包括 Ollama、LM Studio 和 OpenAI。本指南将帮助您配置和使用这些服务。

## 支持的 AI 提供商

### 1. Ollama（推荐用于本地部署）

**优点**：
- 完全本地运行，数据隐私保护
- 支持多种开源模型（Qwen、Llama、Mistral 等）
- 配置简单

**配置步骤**：

1. **安装 Ollama**
   - 访问 [Ollama 官网](https://ollama.ai/) 下载并安装
   - Windows: 下载安装程序并运行

2. **下载模型**
   ```bash
   # 推荐使用 Qwen2.5-7B（适合 RTX 4060）
   ollama pull qwen2.5:7b
   
   # 或者使用 Q4 量化版本（更省显存）
   ollama pull qwen2.5:7b-q4_0
   ```

3. **配置后端**
   在 `backend/.env` 文件中（如果不存在则创建）：
   ```env
   AI_MODEL_PROVIDER=ollama
   AI_MODEL_NAME=qwen2.5:7b
   AI_BASE_URL=http://localhost:11434
   ```

4. **启动 Ollama**
   - Windows: Ollama 会自动在后台运行
   - 验证服务是否运行：
     ```bash
     curl http://localhost:11434/api/tags
     ```

### 2. LM Studio（推荐用于 Windows）

**优点**：
- 图形界面，易于使用
- 支持多种模型格式（GGUF、GGML 等）
- 自动管理模型下载和加载

**配置步骤**：

1. **安装 LM Studio**
   - 访问 [LM Studio 官网](https://lmstudio.ai/) 下载并安装

2. **下载模型**
   - 打开 LM Studio
   - 在 "Search" 页面搜索并下载模型（推荐：Qwen2.5-7B-Instruct）
   - 下载完成后，在 "Chat" 页面加载模型

3. **启动本地服务器**
   - 在 LM Studio 中，点击左下角的 "Local Server" 图标
   - 确保 "Server is running" 显示为绿色
   - 默认端口为 `1234`

4. **配置后端**
   在 `backend/.env` 文件中：
   ```env
   AI_MODEL_PROVIDER=lmstudio
   AI_MODEL_NAME=qwen2.5-7b-instruct
   AI_BASE_URL=http://localhost:1234
   ```

### 3. OpenAI（在线服务）

**优点**：
- 无需本地部署
- 性能稳定
- 支持 GPT-4 等高级模型

**配置步骤**：

1. **获取 API Key**
   - 访问 [OpenAI 官网](https://platform.openai.com/)
   - 注册账号并获取 API Key

2. **配置后端**
   在 `backend/.env` 文件中：
   ```env
   AI_MODEL_PROVIDER=openai
   AI_MODEL_NAME=gpt-3.5-turbo
   AI_BASE_URL=https://api.openai.com/v1
   OPENAI_API_KEY=your_api_key_here
   ```

## 配置文件位置

配置文件优先级（从高到低）：

1. `backend/.env` 文件（推荐）
2. 环境变量
3. `backend/core/config.py` 中的默认值

## 创建 `.env` 文件

在 `backend` 目录下创建 `.env` 文件：

```env
# AI 模型配置
AI_MODEL_PROVIDER=ollama  # 或 lmstudio, openai
AI_MODEL_NAME=qwen2.5:7b
AI_BASE_URL=http://localhost:11434
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048

# 如果使用 OpenAI，还需要：
# OPENAI_API_KEY=your_api_key_here
```

## 验证配置

1. **启动后端服务**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --port 8001
   ```

2. **测试 AI 服务**
   - 在工作流中添加 "AI 分析 XML 结构" 节点
   - 连接到 "解析文件" 节点
   - 执行节点，查看是否成功

3. **查看日志**
   - 如果连接失败，后端日志会显示详细的错误信息
   - 检查 AI 服务是否正在运行
   - 验证端口和 URL 是否正确

## 常见问题

### 问题 1: 连接被拒绝（Connection Refused）

**原因**：AI 服务未启动或端口配置错误

**解决方案**：
- 检查 Ollama/LM Studio 是否正在运行
- 验证 `AI_BASE_URL` 中的端口是否正确
- 对于 Ollama，默认端口是 `11434`
- 对于 LM Studio，默认端口是 `1234`

### 问题 2: 模型未找到

**原因**：指定的模型名称不存在或未下载

**解决方案**：
- 对于 Ollama：运行 `ollama list` 查看已安装的模型
- 对于 LM Studio：在应用中查看已下载的模型名称
- 确保 `AI_MODEL_NAME` 与实际的模型名称匹配

### 问题 3: 显存不足（OOM）

**原因**：模型太大，超出显卡显存

**解决方案**：
- 使用量化版本（如 `qwen2.5:7b-q4_0`）
- 降低 `AI_MAX_TOKENS` 的值
- 使用更小的模型

### 问题 4: 响应速度慢

**原因**：模型太大或硬件性能不足

**解决方案**：
- 使用量化版本模型
- 使用更小的模型（如 3B 或 1.5B）
- 确保使用 GPU 加速（如果支持）

## 推荐配置（RTX 4060）

```env
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
```

这个配置：
- 使用 Q4 量化版本，显存占用约 4-5GB
- 适合 RTX 4060 的 8GB 显存
- 性能和质量平衡良好

## 更多信息

- [Ollama 文档](https://github.com/ollama/ollama)
- [LM Studio 文档](https://lmstudio.ai/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)

