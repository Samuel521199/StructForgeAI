# 快速安装指南

## 🚀 Windows 一键安装（推荐）

### 方式一：使用快捷脚本（最简单）

1. **安装 Ollama 和模型**
   ```bash
   install_ollama.bat
   ```
   脚本会自动：
   - 检查 Ollama 是否已安装
   - 下载并安装 Ollama（如果未安装）
   - 下载推荐模型 `qwen2.5:7b-q4_0`
   - 测试连接

2. **配置后端**
   ```bash
   setup_ai_config.bat
   ```
   脚本会：
   - 创建 `backend/.env` 文件
   - 引导选择 AI 提供商
   - 设置默认配置

3. **测试 AI 服务**
   ```bash
   test_ai_service.bat
   ```
   脚本会：
   - 检查 Ollama 服务状态
   - 验证模型是否可用
   - 运行 Python 测试脚本

### 方式二：手动安装

如果脚本无法运行，可以按照以下步骤手动安装：

#### 步骤 1: 安装 Ollama

1. 访问 https://ollama.ai/download
2. 下载 Windows 安装程序
3. 运行 `OllamaSetup.exe`
4. 安装完成后，打开新的命令行窗口

#### 步骤 2: 下载模型

```bash
ollama pull qwen2.5:7b-q4_0
```

#### 步骤 3: 验证安装

```bash
# 检查 Ollama 版本
ollama --version

# 列出已安装的模型
ollama list

# 测试模型
ollama run qwen2.5:7b-q4_0 "你好"
```

#### 步骤 4: 配置后端

1. 复制配置文件模板：
   ```bash
   copy backend\.env.example backend\.env
   ```

2. 编辑 `backend/.env`，确保以下配置：
   ```env
   AI_MODEL_PROVIDER=ollama
   AI_MODEL_NAME=qwen2.5:7b-q4_0
   AI_BASE_URL=http://localhost:11434
   ```

#### 步骤 5: 测试连接

```bash
# 在 conda 环境中运行
python backend/check_ai_service.py
```

---

## 📋 安装脚本说明

### install_ollama.bat

**功能**：
- 检查 Ollama 是否已安装
- 下载并安装 Ollama（如果需要）
- 下载推荐模型
- 测试 Ollama 服务连接

**使用方法**：
```bash
install_ollama.bat
```

### setup_ai_config.bat

**功能**：
- 创建 `backend/.env` 文件
- 引导选择 AI 提供商（Ollama / LM Studio / OpenAI）
- 自动配置默认设置

**使用方法**：
```bash
setup_ai_config.bat
```

**支持的选择**：
1. **Ollama** (默认)
   - 模型: `qwen2.5:7b-q4_0`
   - URL: `http://localhost:11434`

2. **LM Studio**
   - 模型: `qwen2.5-7b-instruct`
   - URL: `http://localhost:1234`

3. **OpenAI**
   - 模型: `gpt-3.5-turbo`
   - URL: `https://api.openai.com/v1`
   - 需要输入 API Key

### test_ai_service.bat

**功能**：
- 检查 Ollama 是否安装
- 检查 Ollama 服务是否运行
- 检查模型是否可用
- 运行 Python 测试脚本

**使用方法**：
```bash
test_ai_service.bat
```

---

## 🔧 故障排除

### 问题 1: 脚本无法运行

**原因**：可能是权限问题或路径问题

**解决方案**：
1. 以管理员身份运行 PowerShell
2. 确保在项目根目录运行脚本
3. 检查脚本文件是否存在

### 问题 2: Ollama 安装失败

**原因**：网络问题或下载失败

**解决方案**：
1. 手动下载安装程序：https://ollama.ai/download
2. 运行安装程序
3. 重新运行 `install_ollama.bat`

### 问题 3: 模型下载失败

**原因**：网络问题或磁盘空间不足

**解决方案**：
1. 检查网络连接
2. 检查磁盘空间（模型约 4.5GB）
3. 手动下载：`ollama pull qwen2.5:7b-q4_0`

### 问题 4: 服务连接失败

**原因**：Ollama 服务未运行

**解决方案**：
1. 检查系统托盘是否有 Ollama 图标
2. 运行 `ollama serve` 启动服务
3. 浏览器访问 http://localhost:11434 验证

### 问题 5: Python 测试脚本失败

**原因**：conda 环境未激活或依赖未安装

**解决方案**：
1. 激活 conda 环境：`conda activate structforge-ai`
2. 安装依赖：`pip install -r backend/requirements.txt`
3. 重新运行测试脚本

---

## 📝 验证清单

安装完成后，请确认：

- [ ] Ollama 已安装（运行 `ollama --version`）
- [ ] 模型已下载（运行 `ollama list`）
- [ ] Ollama 服务正在运行（访问 http://localhost:11434）
- [ ] `backend/.env` 文件已创建
- [ ] Python 测试脚本通过（运行 `python backend/check_ai_service.py`）

---

## 🆘 需要帮助？

如果遇到问题，请：

1. 查看详细文档：
   - [AI 服务配置指南](AI_SERVICE_SETUP.md)
   - [快速启动指南](../backend/QUICK_START_AI.md)
   - [配置说明](../backend/README_AI_CONFIG.md)

2. 检查日志：
   - 后端日志：`logs/app.log`
   - Ollama 日志：系统托盘右键菜单

3. 提交 Issue：
   - 描述问题
   - 提供错误信息
   - 附上相关日志

---

**完成安装后，请启动后端服务并开始使用！** 🎉

