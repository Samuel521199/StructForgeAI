# AI Agent 节点执行流程详解

## 🎯 设计目标

AI Agent 节点是一个**智能协调器**，负责：
1. **接收输入数据**：从上游节点（如"解析文件"）获取数据
2. **连接Chat Model**：通过底部Chat Model端口连接大模型节点，获取API配置
3. **智能处理**：使用系统提示词和任务目标，通过大模型处理数据
4. **输出结果**：返回处理后的数据，供下游节点使用

---

## 📊 数据流设计

### 输入（INPUT）
- **来源**：上游节点的执行结果（通过左侧input端口连接）
- **数据格式**：`ParsedFile` 类型
- **必需字段**：
  - `data`：数据内容（对象或数组）
  - 或 `analysis`：分析结果
  - 或 `file_path`：文件路径

### 输出（OUTPUT）
- **数据格式**：`ParsedFile` 类型
- **包含字段**：
  - 保留上游节点的所有数据（`...inputData`）
  - `chat_model_response`：Chat Model的响应信息
  - `data`：处理后的数据（根据`output_format`格式化）
  - `output_format`：输出格式（json/text/structured/markdown）

### Chat Model连接
- **连接方式**：从AI Agent节点底部的Chat Model端口（🤖）连接到ChatGPT/Gemini/DeepSeek节点
- **配置获取**：自动从连接的Chat Model节点获取API配置（API Key、API URL等）
- **执行方式**：AI Agent内部调用Chat Model API，不需要单独执行Chat Model节点

---

## 🔄 完整执行流程

### 步骤1：验证配置
```typescript
// 检查系统提示词（必需）
if (!systemPrompt) {
  return { success: false, error: '缺少系统提示词' }
}
```

### 步骤2：获取输入数据
```typescript
// 从上游节点获取数据
const inputData = this.getSourceResult()

// 验证数据是否存在
if (!hasInputData) {
  // 检查上游节点是否执行失败
  if (upstreamResult?.error) {
    return { 
      success: false, 
      error: `上游节点执行失败：${upstreamResult.error}` 
    }
  }
  // 提示用户先执行上游节点
}
```

### 步骤3：构建提示词
```typescript
// 构建用户提示词
const userPrompt = buildUserPrompt(inputData, goal, outputFormat)
// 格式：任务目标 + 输入数据 + 输出格式要求
```

### 步骤4：检索记忆（可选）
```typescript
if (use_memory && memory_connected) {
  memoryContext = await retrieveMemory(config)
}
```

### 步骤5：获取Chat Model配置
```typescript
// 从连接的Chat Model节点获取配置
const chatModelNodeInfo = getConnectedNode('', 'chat_model')
const chatModelConfig = {
  model_type: chatModelNodeType,  // chatgpt/gemini/deepseek
  api_key: chatModelNodeConfig.api_key,
  api_url: chatModelNodeConfig.api_url,  // 必需
  request_headers: chatModelNodeConfig.request_headers,
  request_body: chatModelNodeConfig.request_body,
}
```

### 步骤6：调用Chat Model
```typescript
// 构建完整提示词
const fullPrompt = systemPrompt + memoryContext + userPrompt

// 调用Chat Model API
const chatResponse = await chatModelApi.chat({
  model_type: chatModelConfig.model_type,
  api_key: chatModelConfig.api_key,
  api_url: chatModelConfig.api_url,
  request_headers: chatModelConfig.request_headers,
  request_body: JSON.stringify({
    ...requestBody,
    temperature: temperature,
    max_tokens: maxTokens,
  }),
  prompt: fullPrompt,
})
```

### 步骤7：处理输出
```typescript
// 根据output_format格式化输出
const processedOutput = processOutput(chatResponse.data, outputFormat)
// json: 解析JSON
// text: 返回文本
// structured: 返回结构化数据
// markdown: 返回Markdown格式
```

### 步骤8：存储记忆（可选）
```typescript
if (use_memory && memory_connected) {
  await storeMemory(userPrompt, processedOutput, config)
}
```

### 步骤9：返回结果
```typescript
const result: ParsedFile = {
  ...inputData,  // 保留上游数据
  hasData: true,
  chat_model_response: {
    model: chatResponse.data.model,
    content: chatResponse.data.content,
    usage: chatResponse.data.usage,
    prompt: userPrompt,
    model_type: chatModelConfig.model_type,
  },
  data: processedOutput,
  output_format: outputFormat,
}
```

---

## ⚠️ 常见问题排查

### 问题1：缺少输入数据
**错误信息**：`缺少输入数据：请先连接并执行上游"解析文件"节点`

**原因**：
- 上游"解析文件"节点未执行
- 上游节点执行失败
- 数据未正确传递

**解决方案**：
1. 双击"解析文件"节点
2. 点击"执行节点"按钮
3. 等待执行成功（检查OUTPUT区域是否有数据）
4. 然后再执行AI Agent节点

### 问题2：缺少Chat Model连接
**错误信息**：`未找到连接的Chat Model节点`

**原因**：
- 未从AI Agent的Chat Model端口连接ChatGPT/Gemini/DeepSeek节点
- 连接未保存

**解决方案**：
1. 从AI Agent节点底部的Chat Model端口（🤖）拖拽连接到ChatGPT节点
2. 确保连接已保存（连接线显示正常）
3. 在ChatGPT节点中配置API URL（必需）

### 问题3：Chat Model配置缺失
**错误信息**：`连接的Chat Model节点缺少API URL配置`

**原因**：
- 连接的Chat Model节点未配置API URL

**解决方案**：
1. 双击连接的ChatGPT/Gemini/DeepSeek节点
2. 在配置中设置API URL（必需）
3. 可选：设置API Key、请求头、请求体等
4. 保存配置
5. 然后再执行AI Agent节点

### 问题4：上游节点执行失败
**错误信息**：`上游"解析文件"节点执行失败：...`

**原因**：
- 上游节点执行时出错（如文件不存在、格式不支持等）

**解决方案**：
1. 检查上游节点的错误信息
2. 修复上游节点的问题（如检查文件路径、文件格式等）
3. 重新执行上游节点
4. 确保上游节点执行成功后再执行AI Agent节点

---

## 🔍 调试信息

AI Agent执行器会在控制台输出详细的调试信息：

### 输入数据检查
```javascript
[AIAgentExecutor] 输入数据检查: {
  hasInputData: true/false,
  hasUpstreamResult: true/false,
  hasExecutionResult: true/false,
  inputDataKeys: [...],
  hasData: true/false,
  hasDataField: true/false,
  hasAnalysis: true/false,
  hasFilePath: true/false,
  inputDataValue: {...}
}
```

### Chat Model连接检查
```javascript
[AIAgentExecutor] Chat Model连接检查: {
  hasGetConnectedNode: true/false,
  chatModelNodeInfo: {
    hasNode: true/false,
    hasResult: true/false,
    nodeType: 'chatgpt'/'gemini'/'deepseek',
    nodeId: '...'
  }
}
```

### Chat Model配置
```javascript
[AIAgentExecutor] Chat Model配置: {
  nodeType: 'chatgpt',
  hasApiKey: true/false,
  hasApiUrl: true/false,
  apiUrl: '...',
  configKeys: [...]
}
```

---

## ✅ 执行检查清单

在执行AI Agent节点前，请确认：

- [ ] **上游节点已执行成功**
  - "解析文件"节点已执行
  - OUTPUT区域有数据
  - 没有错误提示

- [ ] **AI Agent配置完整**
  - 系统提示词已配置
  - 任务目标已配置（可选）
  - Temperature已设置（默认0.7）

- [ ] **Chat Model节点已连接**
  - 从AI Agent的Chat Model端口（🤖）连接到ChatGPT/Gemini/DeepSeek节点
  - 连接线显示正常

- [ ] **Chat Model节点已配置**
  - API URL已设置（必需）
  - API Key已设置（如果API URL不包含认证信息）
  - 其他配置已设置（可选）

- [ ] **执行顺序正确**
  1. 先执行"解析文件"节点
  2. 等待执行成功
  3. 再执行AI Agent节点

---

## 📝 执行步骤示例

### 完整工作流执行步骤

1. **执行"解析文件"节点**
   ```
   双击"解析文件"节点
   → 配置文件路径
   → 点击"执行节点"
   → 等待执行成功（检查OUTPUT区域）
   ```

2. **配置AI Agent节点**
   ```
   双击"AI Agent"节点
   → 设置系统提示词（必需）
   → 设置任务目标（可选）
   → 设置Temperature（默认0.7）
   → 保存配置
   ```

3. **连接Chat Model节点**
   ```
   从AI Agent的Chat Model端口（🤖）拖拽连接到ChatGPT节点
   → 确保连接线显示正常
   ```

4. **配置Chat Model节点**
   ```
   双击ChatGPT节点
   → 设置API URL（必需）
   → 设置API Key（可选）
   → 保存配置
   ```

5. **执行AI Agent节点**
   ```
   双击"AI Agent"节点
   → 点击"执行节点"
   → 等待执行完成
   → 检查OUTPUT区域的结果
   ```

---

## 🎯 设计原则

1. **数据流清晰**：INPUT → 处理 → OUTPUT
2. **配置分离**：Chat Model配置在连接的节点中，不在AI Agent中
3. **错误处理完善**：能够识别上游节点失败、配置缺失等情况
4. **调试友好**：提供详细的调试日志，便于排查问题
5. **执行顺序明确**：必须先执行上游节点，再执行下游节点

---

## 🔧 技术实现细节

### 数据传递机制
- 使用 `nodeExecutionResults` Map 存储所有节点的执行结果
- `currentUpstreamResult` 从Map中获取上游节点的执行结果
- `getSourceResult()` 优先使用 `upstreamResult`，如果没有则使用 `executionResult`

### Chat Model连接机制
- 使用 `getConnectedNode(nodeId, targetHandle)` 从工作流图中查找连接的节点
- 通过 `edges` 查找 `targetHandle === 'chat_model'` 的边
- 从连接的节点获取配置信息（`node.data.config`）

### 错误处理机制
- 即使节点执行失败，也会存储错误信息到执行结果中
- 下游节点能够识别上游节点失败的情况
- 提供清晰的错误提示和解决建议

---

**最后更新**：2025-01-XX  
**版本**：v1.0.0

