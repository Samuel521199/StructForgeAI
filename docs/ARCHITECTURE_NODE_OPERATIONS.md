# 节点操作架构说明

## 📋 架构概览

StructForge AI 采用**前后端分离架构**，遵循核心原则：

> **前端只负责显示和用户操作的传达，所有计算、文件解析、AI调用等都由后端完成。**

### 前端（Frontend）
- **位置**：`frontend/src/components/Workflow/NodeExecutors/`
- **职责**：
  - ✅ 收集配置（从表单获取）
  - ✅ 收集数据（从上游节点获取）
  - ✅ 调用后端API
  - ✅ 更新UI状态
  - ❌ **不执行任何计算逻辑**

### 后端（Backend）
- **位置**：`backend/api/`
- **职责**：
  - ✅ 所有计算逻辑（构建提示词、处理数据等）
  - ✅ 文件解析
  - ✅ AI调用（Chat Model、LLM等）
  - ✅ 数据处理和转换

---

## 🔄 节点操作执行流程

### 完整执行流程

```
用户点击"执行节点"
    ↓
[前端] NodeDetailPanel.handleNodeExecute()
    ↓
[前端] 获取节点执行器 (getNodeExecutor)
    ↓
[前端] Executor.execute()
    ├─ 获取表单配置
    ├─ 验证输入数据
    ├─ 调用后端API (通过 api.ts)
    └─ 处理响应结果
    ↓
[后端] API端点接收请求
    ├─ 验证请求参数
    ├─ 执行实际处理（文件解析、AI调用等）
    └─ 返回处理结果
    ↓
[前端] 接收响应
    ├─ 更新本地状态 (setExecutionResult)
    ├─ 更新全局状态 (nodeExecutionResults)
    └─ 更新UI显示
```

---

## 🎯 职责划分

### 前端执行器（Executors）的职责

**位置**：`frontend/src/components/Workflow/NodeExecutors/`

**主要职责**：
1. **配置获取**：从表单获取节点配置
2. **数据验证**：验证输入数据是否完整
3. **API调用**：调用后端API执行实际处理
4. **结果处理**：处理API响应，格式化数据
5. **状态更新**：更新UI状态和全局执行结果
6. **错误处理**：处理错误并显示给用户

**示例**：`ParseFileExecutor.ts`
```typescript
export class ParseFileExecutor extends BaseExecutor {
  async execute(): Promise<ExecutorResult> {
    // 1. 获取配置（前端）
    const filePath = form.getFieldValue('file_path')
    
    // 2. 调用后端API（前端 → 后端）
    const result = await fileApi.parse(filePath, {...})
    
    // 3. 处理结果（前端）
    setExecutionResult(result)
    
    return { success: true, result }
  }
}
```

### 后端API的职责

**位置**：`backend/api/`

**主要职责**：
1. **请求处理**：接收HTTP请求，验证参数
2. **业务逻辑**：执行实际的数据处理
   - 文件解析（XML、JSON、YAML、CSV、Excel等）
   - AI调用（LLM、嵌入向量等）
   - 数据操作（编辑、过滤、验证等）
3. **结果返回**：返回处理结果

**示例**：`backend/api/files.py`
```python
@router.post("/parse")
async def parse_file(request: ParseFileRequest):
    # 1. 接收请求（后端）
    file_path = request.file_path
    
    # 2. 执行实际处理（后端）
    parser = ParserFactory.create_parser(file_path)
    data = parser.parse(file_path)
    
    # 3. 返回结果（后端 → 前端）
    return {
        "data": data,
        "schema": schema,
        "file_path": file_path,
        ...
    }
```

---

## 📊 各节点类型的执行位置

### 1. 文件操作节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `parse_file` | `ParseFileExecutor.ts` | `backend/api/files.py` | **后端** |
| `export_file` | - | `backend/api/files.py` | **后端** |

**说明**：
- 前端：获取配置、调用API、处理响应
- 后端：实际的文件解析、格式转换、Schema检测

### 2. AI工作流节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `analyze_xml_structure` | `AnalyzeXMLStructureExecutor.ts` | `backend/api/ai_workflow.py` | **后端** |
| `generate_editor_config` | `GenerateEditorConfigExecutor.ts` | `backend/api/ai_workflow.py` | **后端** |
| `smart_edit` | `SmartEditExecutor.ts` | `backend/api/ai_workflow.py` | **后端** |
| `generate_workflow` | `GenerateWorkflowExecutor.ts` | `backend/api/ai_workflow.py` | **后端** |

**说明**：
- 前端：获取配置、构建请求、调用API
- 后端：实际的AI调用（LLM）、数据处理

### 3. 数据操作节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `edit_data` | `EditDataExecutor.ts` | `backend/api/data_operations.py` | **后端** |
| `filter_data` | `FilterDataExecutor.ts` | `backend/api/data_operations.py` | **后端** |
| `validate_data` | `ValidateDataExecutor.ts` | `backend/api/data_operations.py` | **后端** |

**说明**：
- 前端：获取配置、验证数据、调用API
- 后端：实际的数据编辑、过滤、验证逻辑

### 4. Chat Model节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `chatgpt` | `ChatGPTExecutor.ts` | `backend/api/chat_model.py` | **后端** |
| `gemini` | `GeminiExecutor.ts` | `backend/api/chat_model.py` | **后端** |
| `deepseek` | `DeepSeekExecutor.ts` | `backend/api/chat_model.py` | **后端** |
| `chat_model` | `ChatModelExecutor.ts` | `backend/api/chat_model.py` | **后端** |

**说明**：
- 前端：获取配置、构建请求、调用API
- 后端：实际的Chat Model API调用（OpenAI、Gemini等）

### 5. AI Agent节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `ai_agent` | `AIAgentExecutor.ts` | `backend/api/ai_workflow.py` | **后端** |

**说明**：
- **前端**：收集配置、收集输入数据、获取Chat Model配置、调用后端API、更新UI状态
- **后端**：构建提示词、调用Chat Model、处理输出等**所有计算逻辑**

### 6. Memory节点

| 节点类型 | 前端执行器 | 后端API | 实际处理位置 |
|---------|-----------|---------|------------|
| `memory` | `MemoryExecutor.ts` | `backend/api/memory.py` | **后端** |

**说明**：
- 前端：获取配置、调用API
- 后端：实际的记忆存储、检索、搜索逻辑

---

## 🔍 详细执行示例

### 示例1：解析文件节点

**前端执行器** (`ParseFileExecutor.ts`)：
```typescript
async execute() {
  // 1. 获取配置（前端）
  const filePath = form.getFieldValue('file_path')
  
  // 2. 调用后端API（前端 → 后端）
  const result = await fileApi.parse(filePath, {
    convert_format: convertFormat,
    output_format: outputFormat,
    skip_schema: skipSchema,
  })
  
  // 3. 处理结果（前端）
  setExecutionResult(result)
  return { success: true, result }
}
```

**后端API** (`backend/api/files.py`)：
```python
@router.post("/parse")
async def parse_file(request: ParseFileRequest):
    # 1. 接收请求（后端）
    file_path = Path(request.file_path)
    
    # 2. 执行实际处理（后端）
    parser = ParserFactory.create_parser(file_path)
    data = parser.parse(file_path)
    schema = parser.detect_schema(data) if not request.skip_schema else None
    
    # 3. 格式转换（后端）
    if request.convert_format:
        data = _convert_to_format(data, request.output_format)
    
    # 4. 返回结果（后端 → 前端）
    return {
        "data": data,
        "schema": schema,
        "file_path": str(file_path),
        "original_format": parser.get_format(),
        "output_format": request.output_format,
    }
```

### 示例2：AI Agent节点

**前端执行器** (`AIAgentExecutor.ts`)：
```typescript
async execute() {
  // 1. 收集配置（前端）
  const systemPrompt = form.getFieldValue('system_prompt')
  const goal = form.getFieldValue('goal')
  const inputData = this.getSourceResult()
  const chatModelConfig = getChatModelConfig()  // 从连接的节点获取
  
  // 2. 调用后端API（前端 → 后端）
  // 所有计算逻辑都在后端完成
  const response = await aiWorkflowApi.executeAIAgent({
    input_data: inputData,
    system_prompt: systemPrompt,
    goal: goal,
    chat_model_config: chatModelConfig,
    ...
  })
  
  // 3. 更新UI状态（前端）
  setExecutionResult(response.data)
  return { success: true, result: response.data }
}
```

**后端API** (`backend/api/ai_workflow.py`)：
```python
@router.post("/ai-agent")
async def execute_ai_agent(request: AIAgentRequest):
    # 1. 接收请求（后端）
    input_data = request.input_data
    system_prompt = request.system_prompt
    goal = request.goal
    
    # 2. 构建用户提示词（后端完成）
    user_prompt = _build_user_prompt(input_data, goal, output_format)
    
    # 3. 构建完整提示词（系统提示词 + 用户提示词）
    full_prompt = f"# 系统角色\n{system_prompt}\n\n---\n\n{user_prompt}"
    
    # 4. 调用Chat Model（后端完成）
    chat_response = await chat_with_custom_model(ChatModelRequest(
        model_type=request.chat_model_config["model_type"],
        api_url=request.chat_model_config["api_url"],
        prompt=full_prompt,
        ...
    ))
    
    # 5. 处理输出数据（后端完成）
    processed_output = _process_output(chat_response.content, output_format)
    
    # 6. 返回结果（后端 → 前端）
    return {
        "input_data": input_data,
        "chat_model_response": {...},
        "data": processed_output,
        "ai_agent_output": chat_response.content,
        ...
    }
```

---

## 💡 为什么这样设计？

### 架构原则

**核心原则**：前端只负责显示和用户操作的传达，所有计算、文件解析、AI调用等都由后端完成。

### 优势

1. **职责分离**
   - **前端**：专注于UI交互、用户操作传达、状态管理
   - **后端**：专注于所有计算逻辑、数据处理、业务逻辑

2. **安全性**
   - API密钥、敏感配置在后端处理
   - 前端不直接访问文件系统或外部API
   - 所有计算逻辑在后端，前端无法篡改

3. **可扩展性**
   - 前端执行器易于添加新节点类型（只需收集配置和调用API）
   - 后端API易于添加新的处理逻辑
   - 计算逻辑集中管理，易于优化

4. **可维护性**
   - 前后端代码分离，职责清晰
   - 模块化设计，易于测试
   - 计算逻辑统一在后端，易于调试和优化

5. **性能**
   - 后端可以处理大量数据
   - 前端只负责展示和交互，不占用计算资源
   - 计算密集型任务在后端执行，前端响应更快

### 前端执行器的职责

前端执行器负责：

1. **配置收集**
   - 从表单获取节点配置
   - 验证必需配置是否存在

2. **数据收集**
   - 获取上游节点的执行结果
   - 获取连接的节点配置（如Chat Model配置）

3. **API调用**
   - 调用后端API，传递配置和数据
   - 不执行任何计算逻辑

4. **状态管理**
   - 更新本地UI状态
   - 更新全局执行结果Map
   - 处理错误状态

5. **用户体验**
   - 显示加载状态
   - 显示成功/错误消息
   - 格式化数据显示

### 后端API的职责

后端API负责：

1. **所有计算逻辑**
   - 构建提示词（AI Agent）
   - 处理数据转换
   - 调用外部API（Chat Model、文件解析等）

2. **业务逻辑**
   - 文件解析
   - 数据验证
   - AI调用

3. **安全性**
   - 处理API密钥
   - 验证请求参数
   - 防止恶意请求

---

## 📝 总结

### 节点操作的执行位置

| 操作类型 | 执行位置 | 说明 |
|---------|---------|------|
| **UI交互** | 前端 | 用户点击、表单输入、状态更新 |
| **工作流协调** | 前端 | 节点连接、数据传递、执行顺序 |
| **配置获取** | 前端 | 从表单获取节点配置 |
| **数据验证** | 前端 | 验证输入数据是否完整 |
| **API调用** | 前端 → 后端 | 前端执行器调用后端API |
| **实际处理** | 后端 | 文件解析、AI调用、数据操作 |
| **结果返回** | 后端 → 前端 | 后端返回处理结果 |
| **结果处理** | 前端 | 格式化数据、更新状态 |
| **UI更新** | 前端 | 显示结果、更新界面 |

### 关键点

1. **前端执行器**：负责协调和调用，不执行实际处理
2. **后端API**：负责实际的数据处理和业务逻辑
3. **前后端分离**：清晰的职责划分，易于维护和扩展

---

**最后更新**：2025-01-XX  
**版本**：v1.0.0

