# RTX 4060 本地部署指南

## 一、硬件与软件要求

### 硬件要求
- **GPU**: NVIDIA RTX 4060 (8GB VRAM) ✅
- **RAM**: 16GB+ 推荐
- **存储**: 20GB+ 可用空间（用于模型存储）
- **CPU**: 4核+ 推荐

### 软件要求
- **操作系统**: Windows 10/11 (64位)
- **Python**: 3.10 或 3.11
- **CUDA**: 11.8 或 12.1+
- **cuDNN**: 对应版本

## 二、环境配置步骤

### 2.1 安装NVIDIA驱动

1. 访问 [NVIDIA官网](https://www.nvidia.com/Download/index.aspx)
2. 下载并安装最新的RTX 4060驱动
3. 验证安装：
```bash
nvidia-smi
```

### 2.2 安装CUDA（如果使用vLLM）

**选项A：使用Ollama（推荐，自动处理CUDA）**
- 无需手动安装CUDA，Ollama会自动处理

**选项B：手动安装CUDA（用于vLLM）**
1. 下载CUDA Toolkit 11.8或12.1
2. 安装并配置环境变量

### 2.3 安装Python依赖

```bash
# 创建虚拟环境
python -m venv venv
venv\Scripts\activate

# 安装依赖
cd backend
pip install -r requirements.txt

# 安装PyTorch（如果需要直接使用）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

## 三、AI模型部署

### 方案1：Ollama（最简单推荐）

#### 3.1 安装Ollama

**Windows方式：**
1. 访问 https://ollama.ai/download
2. 下载Windows安装包
3. 安装并启动Ollama服务

**验证安装：**
```bash
ollama --version
```

#### 3.2 下载模型

```bash
# 推荐模型：Qwen2.5-7B（中文支持好）
ollama pull qwen2.5:7b-instruct

# 或使用量化版本（更快，占用更少）
ollama pull qwen2.5:7b-instruct-q4

# 备选模型
ollama pull llama3.1:8b-instruct-q4
ollama pull mistral:7b-instruct-q4
```

#### 3.3 验证模型运行

```bash
# 测试模型
ollama run qwen2.5:7b-instruct "你好，请介绍一下你自己"
```

#### 3.4 启动Ollama服务

```bash
# Ollama默认运行在 http://localhost:11434
ollama serve
```

**或配置为Windows服务（后台运行）：**
- 使用NSSM工具将Ollama注册为Windows服务

### 方案2：LM Studio（图形界面）

1. 下载 [LM Studio](https://lmstudio.ai/)
2. 安装并启动
3. 在模型商店搜索并下载：
   - Qwen2.5-7B-Instruct
   - Llama3.1-8B-Instruct
4. 加载模型到GPU
5. 启动本地API服务器（端口通常为1234）

### 方案3：vLLM（高级，性能最优）

```bash
# 安装vLLM
pip install vllm

# 启动服务（需要AWQ量化模型）
vllm serve microsoft/Qwen2.5-7B-Instruct-AWQ \
    --host 0.0.0.0 \
    --port 8000 \
    --gpu-memory-utilization 0.85
```

## 四、配置项目

### 4.1 创建环境变量文件

创建 `backend/.env`：

```env
# AI模型配置
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=qwen2.5:7b-instruct-q4
AI_BASE_URL=http://localhost:11434
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048

# 如果使用LM Studio
# AI_MODEL_PROVIDER=lmstudio
# AI_BASE_URL=http://localhost:1234

# 文件存储
UPLOAD_DIR=F:\StructForgeAI\data\uploads
EXPORT_DIR=F:\StructForgeAI\data\exports
TEMPLATE_DIR=F:\StructForgeAI\templates

# 数据库
DATABASE_URL=sqlite:///F:/StructForgeAI/data/structforge.db

# 向量数据库
VECTOR_DB_TYPE=faiss
VECTOR_DB_PATH=F:\StructForgeAI\data\vector_db

# 日志
LOG_LEVEL=INFO
LOG_FILE=F:\StructForgeAI\logs\app.log
```

### 4.2 创建必要的目录

```bash
mkdir -p data\uploads
mkdir -p data\exports
mkdir -p data\vector_db
mkdir -p logs
mkdir -p templates
```

## 五、启动服务

### 5.1 启动后端服务

```bash
cd backend
python main.py
```

或使用uvicorn：
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

### 5.3 验证部署

1. 访问后端健康检查：http://localhost:8000/health
2. 访问前端：http://localhost:3000
3. 测试AI连接：上传一个配置文件，查看AI分析是否正常

## 六、性能优化建议

### 6.1 模型优化

1. **使用量化模型**
   - Q4量化：精度损失小，速度提升明显
   - Q3量化：更快，但精度略降

2. **批处理设置**
   - 合并多个小请求
   - 使用批处理API（如果支持）

3. **上下文窗口**
   - 根据实际需求设置，不要过大
   - 默认2048 tokens足够

### 6.2 系统优化

1. **关闭不必要的后台程序**，释放GPU资源
2. **设置Windows电源模式**为高性能
3. **NVIDIA控制面板**设置高性能模式
4. **监控GPU使用率**：使用 `nvidia-smi -l 1`

### 6.3 应用优化

1. **启用结果缓存**：相同文件不重复分析
2. **异步处理**：大文件后台处理
3. **流式响应**：AI生成过程实时反馈

## 七、常见问题

### Q1: 模型加载失败
- **检查CUDA驱动**：`nvidia-smi`
- **检查VRAM**：确保有足够空间
- **尝试量化版本**：使用Q4或Q3量化模型

### Q2: 推理速度慢
- **检查GPU使用率**：`nvidia-smi` 查看是否真的在用GPU
- **使用量化模型**：Q4比FP16快很多
- **减少上下文长度**：如果不需要长上下文

### Q3: 内存不足
- **关闭其他应用**
- **使用更小的模型**：如3B模型
- **使用CPU卸载**：部分层放到CPU（但会很慢）

### Q4: Ollama连接失败
- **检查服务是否运行**：`ollama list`
- **检查端口**：默认11434，确认防火墙允许
- **重启服务**：`ollama serve`

## 八、监控与调试

### 8.1 监控GPU

```bash
# 实时监控
nvidia-smi -l 1

# 查看详细信息
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv
```

### 8.2 查看日志

```bash
# 后端日志
tail -f logs\app.log

# Ollama日志（如果配置）
tail -f %USERPROFILE%\.ollama\logs\*
```

### 8.3 性能测试

```python
# 测试AI响应速度
import time
from ai_integration.llm_client import LLMClient

client = LLMClient()
start = time.time()
response = client.chat([{"role": "user", "content": "测试"}])
elapsed = time.time() - start
print(f"响应时间: {elapsed:.2f}秒")
```

