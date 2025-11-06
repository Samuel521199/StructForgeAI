# StructForge AI - 节点数据流传递机制分析

## 🔍 问题分析

### 当前实现状态

**问题**：节点间的数据流传递机制不完整

1. **每个节点有独立的执行结果状态**
   - `NodeDetailPanel` 内部维护 `executionResult` 状态
   - 每个节点打开时，执行结果是独立的
   - 无法从上游节点获取数据

2. **缺少全局执行上下文**
   - `WorkflowEditor` 没有维护节点执行结果的全局映射
   - 无法根据 edges 找到上游节点并获取其执行结果

3. **执行器依赖问题**
   - `AnalyzeXMLStructureExecutor` 需要 `executionResult.data` 和 `executionResult.schema`
   - 这些数据应该来自上游的 `parse_file` 节点
   - 但当前实现中，如果用户直接打开 `analyze_xml_structure` 节点，没有上游数据

---

## ✅ 解决方案

### 方案1：全局执行结果映射（推荐）

在 `WorkflowEditor` 中维护一个全局的节点执行结果映射：

```typescript
// WorkflowEditor.tsx
const [nodeExecutionResults, setNodeExecutionResults] = useState<Map<string, ParsedFile>>(new Map())

// 获取上游节点的执行结果
const getUpstreamResult = (nodeId: string): ParsedFile | null => {
  // 找到指向当前节点的边
  const incomingEdge = edges.find(e => e.target === nodeId)
  if (!incomingEdge) return null
  
  // 获取上游节点的执行结果
  return nodeExecutionResults.get(incomingEdge.source) || null
}

// 传递给 NodeDetailPanel
<NodeDetailPanel
  upstreamResult={getUpstreamResult(selectedNodeId)}
  onExecutionResult={(nodeId, result) => {
    setNodeExecutionResults(prev => new Map(prev).set(nodeId, result))
  }}
/>
```

### 方案2：增强执行器上下文（当前可用）

修改执行器，使其能够从上游节点获取数据：

```typescript
// BaseExecutor.ts
export interface ExecutorContext {
  form: FormInstance
  executionResult: ParsedFile | null  // 当前节点的执行结果
  upstreamResult: ParsedFile | null   // 上游节点的执行结果（新增）
  setExecutionResult: (result: ParsedFile) => void
  setExecuting: (executing: boolean) => void
  setExecutionError: (error: string | null) => void
}

// AnalyzeXMLStructureExecutor.ts
async execute(): Promise<ExecutorResult> {
  const { upstreamResult, executionResult } = this.context
  
  // 优先使用上游节点的数据
  const sourceResult = upstreamResult || executionResult
  
  if (!sourceResult || !sourceResult.data) {
    return { success: false, error: '请先执行解析文件节点' }
  }
  
  // 使用 sourceResult.data 和 sourceResult.schema
  const result = await aiWorkflowApi.analyzeXMLStructure(
    sourceResult.data,
    sourceResult.schema,
    ...
  )
}
```

---

## 🎯 推荐实现方案

### 步骤1：在 WorkflowEditor 中维护全局执行结果

```typescript
// 节点执行结果映射：nodeId -> ParsedFile
const [nodeExecutionResults, setNodeExecutionResults] = useState<Map<string, ParsedFile>>(new Map())

// 获取上游节点的执行结果
const getUpstreamResult = useCallback((nodeId: string): ParsedFile | null => {
  // 找到指向当前节点的边（可能有多个，取第一个）
  const incomingEdge = edges.find(e => e.target === nodeId)
  if (!incomingEdge) return null
  
  // 获取上游节点的执行结果
  const upstreamNodeId = incomingEdge.source
  return nodeExecutionResults.get(upstreamNodeId) || null
}, [edges, nodeExecutionResults])

// 更新节点执行结果
const updateNodeExecutionResult = useCallback((nodeId: string, result: ParsedFile) => {
  setNodeExecutionResults(prev => {
    const newMap = new Map(prev)
    newMap.set(nodeId, result)
    return newMap
  })
}, [])
```

### 步骤2：修改 NodeDetailPanel 接收上游数据

```typescript
// NodeDetailPanel.tsx
interface NodeDetailPanelProps {
  // ... 现有属性
  upstreamResult?: ParsedFile | null  // 新增：上游节点的执行结果
}

// 在执行器上下文中使用上游数据
const executorContext: ExecutorContext = {
  form,
  executionResult: upstreamResult || executionResult,  // 优先使用上游数据
  upstreamResult,  // 也传递上游数据，让执行器自己决定
  setExecutionResult: (result) => {
    setExecutionResult(result)
    // 通知父组件更新全局执行结果
    onExecutionResult?.(nodeId, result)
  },
  setExecuting,
  setExecutionError,
}
```

### 步骤3：修改执行器使用上游数据

```typescript
// AnalyzeXMLStructureExecutor.ts
async execute(): Promise<ExecutorResult> {
  const { upstreamResult, executionResult } = this.context
  
  // 优先使用上游节点的数据
  const sourceResult = upstreamResult || executionResult
  
  if (!sourceResult || !sourceResult.data) {
    message.warning('请先执行解析文件节点，或确保上游节点已执行')
    return { success: false, error: '缺少上游数据：请先执行解析文件节点' }
  }
  
  // 使用 sourceResult 的数据
  const result = await aiWorkflowApi.analyzeXMLStructure(
    sourceResult.data,
    sourceResult.schema,
    sampleContent,
    additionalContext
  )
  
  // 合并结果：保留上游数据，添加新的分析结果
  const updatedResult: ParsedFile = {
    ...sourceResult,  // 保留上游数据
    analysis: result.analysis,  // 添加新的分析结果
  }
  
  setExecutionResult(updatedResult)
  return { success: true, result: updatedResult }
}
```

---

## 📋 操作流程

### 用户操作步骤

1. **添加节点**
   - 点击工具栏“添加节点”
   - 选择“解析文件”节点
   - 双击节点，配置文件路径（选择 `SkiOL_arm_armors.xml`）
   - 点击“执行节点”，验证文件解析成功

2. **添加并连接AI分析节点**
   - 添加“AI分析XML结构”节点
   - 从“解析文件”节点的输出连接点拖到“AI分析XML结构”节点的输入连接点
   - 双击“AI分析XML结构”节点
   - 点击“执行节点”，自动使用上游节点的数据

3. **验证数据流**
   - INPUT 面板应显示上游节点的数据（data, schema）
   - OUTPUT 面板应显示分析结果（analysis）

---

## 🔧 需要修改的文件

1. **frontend/src/pages/WorkflowEditor.tsx**
   - 添加 `nodeExecutionResults` 状态
   - 添加 `getUpstreamResult` 函数
   - 传递 `upstreamResult` 给 `NodeDetailPanel`
   - 处理 `onExecutionResult` 回调

2. **frontend/src/components/Workflow/NodeDetailPanel.tsx**
   - 添加 `upstreamResult` prop
   - 在执行器上下文中使用上游数据
   - 添加 `onExecutionResult` 回调

3. **frontend/src/components/Workflow/NodeExecutors/BaseExecutor.ts**
   - 在 `ExecutorContext` 中添加 `upstreamResult`
   - 更新 `validateUpstreamData` 方法，优先检查上游数据

4. **frontend/src/components/Workflow/NodeExecutors/AnalyzeXMLStructureExecutor.ts**
   - 优先使用 `upstreamResult`
   - 合并上游数据和当前结果

5. **其他依赖上游数据的执行器**
   - `GenerateEditorConfigExecutor` - 需要 `analysis`
   - `EditDataExecutor` - 需要 `data`
   - `FilterDataExecutor` - 需要 `data`
   - `ValidateDataExecutor` - 需要 `data`
   - `SmartEditExecutor` - 需要 `data`

---

## ✅ 功能验证清单

- [ ] 解析文件节点可以独立执行
- [ ] 解析文件节点执行后，结果存储在全局映射中
- [ ] AI分析XML结构节点可以获取上游节点的数据
- [ ] 如果AI分析节点没有上游节点，显示友好的错误提示
- [ ] INPUT 面板正确显示上游节点的数据
- [ ] OUTPUT 面板正确显示当前节点的执行结果
- [ ] 多个节点连接时，数据流正确传递

---

## 🎯 当前状态评估

### ✅ 已实现的功能

1. **节点执行器架构**
   - ✅ 模块化执行器（NodeExecutors）
   - ✅ 统一的执行器接口（BaseExecutor）
   - ✅ 错误处理和验证

2. **节点配置架构**
   - ✅ 模块化配置组件（NodeConfigs）
   - ✅ 统一的配置接口

3. **后端API**
   - ✅ 所有节点API已实现
   - ✅ 数据流传递在后端正常（通过工作流引擎）

### ⚠️ 需要完善的功能

1. **前端数据流传递**
   - ❌ 缺少全局执行结果映射
   - ❌ 无法从上游节点获取数据
   - ❌ 节点间数据流不完整

2. **用户体验**
   - ❌ 执行节点时，如果缺少上游数据，错误提示不够友好
   - ❌ 无法直观看到节点间的数据流

---

## 🚀 实现优先级

### 高优先级（立即实现）

1. **在 WorkflowEditor 中维护全局执行结果映射**
2. **修改 NodeDetailPanel 接收上游数据**
3. **修改执行器使用上游数据**

完成这些后，节点间的数据流传递就能正常工作。

---

**最后更新**：2025-01-XX  
**状态**：需要实现

