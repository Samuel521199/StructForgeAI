# AI 服务快速启动指南

## 🚀 快速开始（3 步）

### 步骤 1: 选择 AI 提供商

您可以选择以下任一方式：

#### 选项 A: Ollama（推荐，本地运行）

1. **下载并安装 Ollama**
   - 访问 https://ollama.ai/
   - 下载 Windows 安装程序并安装

2. **启动 Ollama**
   - 安装后会自动在后台运行
   - 或手动运行：在命令行输入 `ollama serve`

3. **下载模型**
   ```bash
   # 推荐：Q4 量化版本（适合 RTX 4060，显存占用约 4-5GB）
   ollama pull qwen2.5:7b-q4_0
   
   # 或完整版本（需要更多显存）
   ollama pull qwen2.5:7b
   ```

4. **验证 Ollama 运行**
   ```bash
   # 方法1: 查看已安装的模型
   ollama list
   
   # 方法2: 浏览器访问
   http://localhost:11434
   ```

#### 选项 B: LM Studio（Windows 友好，图形界面）

1. **下载并安装 LM Studio**
   - 访问 https://lmstudio.ai/
   - 下载并安装

2. **下载模型**
   - 打开 LM Studio
   - 在 "Search" 页面搜索 "Qwen2.5-7B-Instruct"
   - 下载模型

3. **加载模型并启动服务器**
   - 在 "Chat" 页面加载下载的模型
   - 点击左下角的 "Local Server" 图标
   - 确保 "Server is running" 显示为绿色（默认端口 1234）

#### 选项 C: OpenAI（在线服务，无需本地部署）

1. **获取 API Key**
   - 访问 https://platform.openai.com/
   - 注册账号并获取 API Key

2. **配置 API Key**
   - 在 `.env` 文件中设置 `OPENAI_API_KEY=your_key_here`

---

### 步骤 2: 配置后端

1. **创建配置文件**
   ```bash
   # 在 backend 目录下
   copy .env.example .env
   ```

2. **编辑 `.env` 文件**

   **如果使用 Ollama：**
   ```env
   AI_MODEL_PROVIDER=ollama
   AI_MODEL_NAME=qwen2.5:7b-q4_0
   AI_BASE_URL=http://localhost:11434
   ```

   **如果使用 LM Studio：**
   ```env
   AI_MODEL_PROVIDER=lmstudio
   AI_MODEL_NAME=qwen2.5-7b-instruct
   AI_BASE_URL=http://localhost:1234
   ```

   **如果使用 OpenAI：**
   ```env
   AI_MODEL_PROVIDER=openai
   AI_MODEL_NAME=gpt-3.5-turbo
   AI_BASE_URL=https://api.openai.com/v1
   OPENAI_API_KEY=your_api_key_here
   ```

---

### 步骤 3: 验证连接

运行测试脚本：

```bash
# 在 backend 目录下
python check_ai_service.py
```

如果看到 "✅ 连接成功！"，说明配置正确。

---

## 🔧 故障排除

### 问题 1: 连接被拒绝（Connection Refused）

**原因**：AI 服务未启动

**解决方案**：
- **Ollama**: 确保 Ollama 正在运行（检查系统托盘或运行 `ollama serve`）
- **LM Studio**: 确保已启动本地服务器（左下角显示 "Server is running"）
- **OpenAI**: 检查网络连接和 API Key

### 问题 2: 模型未找到

**原因**：模型名称不匹配或模型未下载

**解决方案**：
- **Ollama**: 运行 `ollama list` 查看已安装的模型，确保 `.env` 中的 `AI_MODEL_NAME` 匹配
- **LM Studio**: 在应用中查看已下载的模型名称，确保与配置一致
- **OpenAI**: 确保模型名称正确（如 `gpt-3.5-turbo`）

### 问题 3: 显存不足（OOM）

**原因**：模型太大，超出显卡显存

**解决方案**：
- 使用量化版本（如 `qwen2.5:7b-q4_0`）
- 使用更小的模型（如 3B 或 1.5B）
- 降低 `AI_MAX_TOKENS` 的值

### 问题 4: 端口被占用

**原因**：其他程序占用了端口

**解决方案**：
- **Ollama**: 修改 `.env` 中的 `AI_BASE_URL` 为其他端口（需要配置 Ollama）
- **LM Studio**: 在 LM Studio 设置中修改端口，或修改 `.env` 中的端口

---

## 📝 推荐配置（RTX 4060）

```env
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-q4_0
AI_BASE_URL=http://localhost:11434
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
```

这个配置：
- ✅ 显存占用约 4-5GB（适合 8GB RTX 4060）
- ✅ 性能和质量平衡良好
- ✅ 响应速度快

---

## 🆘 仍然无法连接？

1. 检查 `.env` 文件是否存在且配置正确
2. 运行 `python check_ai_service.py` 查看详细错误信息
3. 查看后端日志：`logs/app.log`
4. 参考完整文档：`docs/AI_SERVICE_SETUP.md`

