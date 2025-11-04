# StructForge AI - 节点和节点关系构建结构

## 📋 概述

StructForge AI 使用 **React Flow** 作为可视化工作流引擎，通过 **节点（Nodes）** 和 **边（Edges）** 来构建工作流。每个节点代表一个数据处理步骤，边表示数据流向和依赖关系。

---

## 🏗️ 数据结构层次

### 1. 前端数据结构

#### 1.1 节点类型定义（NodeType）

```typescript
// frontend/src/components/Workflow/WorkflowNode.tsx
export type NodeType =
  | 'parse_file'              // 解析文件节点
  | 'analyze_schema'          // 分析Schema节点
  | 'process_natural_language' // 自然语言处理节点
  | 'apply_operations'         // 应用操作节点
  | 'export_file'              // 导出文件节点
```

#### 1.2 节点数据接口（NodeData）

```typescript
// frontend/src/components/Workflow/WorkflowNode.tsx
interface NodeData {
  label: string                                    // 节点显示名称
  type: NodeType                                   // 节点类型
  description?: string                            // 节点描述
  config?: Record<string, any>                    // 节点配置（每个节点类型不同）
  status?: 'pending' | 'running' | 'completed' | 'failed'  // 执行状态
}
```

#### 1.3 React Flow 节点结构（Node）

```typescript
// 使用 React Flow 的 Node 类型
import type { Node } from 'reactflow'

// Node 结构：
{
  id: string                    // 节点唯一ID（如 "node_1234567890"）
  type: 'default'               // React Flow 节点类型（固定为 'default'）
  position: {                   // 节点在画布上的位置
    x: number,
    y: number
  }
  data: NodeData                // 自定义节点数据（包含 NodeData）
}
```

**示例节点**：
```typescript
{
  id: "node_1703123456789",
  type: "default",
  position: { x: 100, y: 200 },
  data: {
    label: "解析文件",
    type: "parse_file",
    description: "读取并解析配置文件",
    config: {
      file_path: "data/uploads/file.xml",
      auto_detect: true,
      encoding: "utf-8"
    },
    status: "pending"
  }
}
```

#### 1.4 边结构（Edge）

```typescript
// 使用 React Flow 的 Edge 类型
import type { Edge } from 'reactflow'

// Edge 结构：
{
  id: string                    // 边唯一ID（如 "e{source}-{target}"）
  source: string                // 源节点ID
  target: string                // 目标节点ID
  sourceHandle?: string         // 源节点输出端口ID（可选）
  targetHandle?: string         // 目标节点输入端口ID（可选）
  type?: string                 // 边类型（默认 'smoothstep'）
  animated?: boolean            // 是否显示动画
  markerEnd?: {                 // 箭头标记
    type: MarkerType
  }
}
```

**示例边**：
```typescript
{
  id: "enode_1-node_2",
  source: "node_1703123456789",
  target: "node_1703123456790",
  type: "smoothstep",
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed
  }
}
```

---

### 2. 后端数据结构

#### 2.1 工作流存储结构

```python
# backend/api/workflows.py
_custom_workflows = {
    "workflow_id": {
        "workflow_id": str,
        "name": str,
        "description": str,
        "nodes": List[Dict],      # 前端Node数组的JSON序列化
        "edges": List[Dict],       # 前端Edge数组的JSON序列化
        "is_active": bool,
        "created_at": str,         # ISO格式时间戳
        "updated_at": str,
        "type": "custom"
    }
}
```

**实际存储示例**：
```python
{
    "custom_1703123456789": {
        "workflow_id": "custom_1703123456789",
        "name": "数据处理流程",
        "description": "完整的文件处理工作流",
        "nodes": [
            {
                "id": "node_1703123456789",
                "type": "default",
                "position": {"x": 100, "y": 200},
                "data": {
                    "label": "解析文件",
                    "type": "parse_file",
                    "config": {
                        "file_path": "data/uploads/file.xml",
                        "auto_detect": true
                    }
                }
            },
            {
                "id": "node_1703123456790",
                "type": "default",
                "position": {"x": 300, "y": 200},
                "data": {
                    "label": "分析Schema",
                    "type": "analyze_schema",
                    "config": {
                        "use_ai": true,
                        "depth": "deep"
                    }
                }
            }
        ],
        "edges": [
            {
                "id": "enode_1703123456789-node_1703123456790",
                "source": "node_1703123456789",
                "target": "node_1703123456790"
            }
        ],
        "is_active": True,
        "created_at": "2025-01-20T10:30:00",
        "updated_at": "2025-01-20T10:35:00",
        "type": "custom"
    }
}
```

#### 2.2 工作流执行结构（WorkflowStep）

```python
# backend/workflow/workflow_engine.py
@dataclass
class WorkflowStep:
    name: str                    # 步骤名称（对应节点类型）
    handler: Callable            # 处理函数
    depends_on: List[str]        # 依赖的步骤名称列表
    config: Dict[str, Any]       # 步骤配置
```

**执行时的工作流步骤**：
```python
WorkflowStep(
    name="parse_file",
    handler=parse_file_step,
    depends_on=[],              # 触发节点，无依赖
    config={"file_path": "data/uploads/file.xml"}
)

WorkflowStep(
    name="analyze_schema",
    handler=analyze_schema_step,
    depends_on=["parse_file"],  # 依赖 parse_file 节点
    config={"use_ai": True}
)
```

---

## 🔗 节点关系构建机制

### 1. 前端关系构建

#### 1.1 视觉连接（React Flow）

- **用户操作**：用户在画布上从源节点的输出端口拖拽到目标节点的输入端口
- **事件处理**：`onConnect` 回调函数捕获连接事件
- **边创建**：自动生成 Edge 对象并添加到 `edges` 状态

```typescript
// frontend/src/pages/WorkflowEditor.tsx
const handleConnect = useCallback((connection: Connection) => {
  const source = connection.source as string
  const target = connection.target as string
  setEdges((eds) => {
    const newEdge: Edge = {
      id: `e${source}-${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    }
    return [...eds, newEdge]
  })
}, [])
```

#### 1.2 数据流向

- **输入端口（Handle）**：位于节点左侧，接收上游节点的输出数据
- **输出端口（Handle）**：位于节点右侧，向下游节点传递数据
- **连接验证**：通过 `isValidConnection` 可以验证连接是否合法

```typescript
// frontend/src/components/Workflow/WorkflowNode.tsx
// 输入端口
<Handle
  type="target"
  position={Position.Left}
  style={{ 
    background: '#555',
    width: 8,
    height: 8
  }}
/>

// 输出端口
<Handle
  type="source"
  position={Position.Right}
  style={{ 
    background: '#555',
    width: 8,
    height: 8
  }}
/>
```

### 2. 后端执行关系

#### 2.1 依赖关系构建

后端执行时，通过 `edges` 数组构建节点依赖关系：

```python
# 从 edges 构建依赖关系
def build_dependencies(nodes: List[Dict], edges: List[Dict]) -> Dict[str, List[str]]:
    """
    根据 edges 构建节点依赖关系
    
    Returns:
        {
            "node_id": ["depends_on_node_id1", "depends_on_node_id2"]
        }
    """
    dependencies = {}
    for edge in edges:
        target_id = edge["target"]
        source_id = edge["source"]
        if target_id not in dependencies:
            dependencies[target_id] = []
        dependencies[target_id].append(source_id)
    return dependencies
```

#### 2.2 执行顺序

工作流引擎使用**拓扑排序**确定节点执行顺序：

```python
# backend/workflow/workflow_engine.py
def _get_execution_order(self, steps: List[WorkflowStep]) -> List[WorkflowStep]:
    """获取执行顺序（考虑依赖关系）"""
    executed = set()
    order = []
    
    def add_step(step: WorkflowStep):
        if step.name in executed:
            return
        # 先执行依赖的步骤
        for dep_name in step.depends_on:
            dep_step = next((s for s in steps if s.name == dep_name), None)
            if dep_step and dep_step.name not in executed:
                add_step(dep_step)
        order.append(step)
        executed.add(step.name)
    
    for step in steps:
        add_step(step)
    return order
```

---

## 📊 节点配置结构

### 不同节点类型的配置

每个节点类型都有独特的配置结构：

#### 1. parse_file（解析文件节点）

```typescript
config: {
  file_path: string          // 文件路径（必需）
  auto_detect: boolean       // 是否自动检测格式
  encoding: string          // 文件编码（默认 "utf-8"）
}
```

#### 2. analyze_schema（分析Schema节点）

```typescript
config: {
  use_ai: boolean           // 是否使用AI分析
  depth: 'shallow' | 'deep' // 分析深度
  include_examples: boolean  // 是否包含示例数据
}
```

#### 3. process_natural_language（自然语言处理节点）

```typescript
config: {
  use_ai: boolean           // 是否使用AI
  instruction: string       // 自然语言指令（必需）
  model: string            // AI模型名称
}
```

#### 4. apply_operations（应用操作节点）

```typescript
config: {
  validate_before_apply: boolean  // 应用前验证
  rollback_on_error: boolean      // 错误时回滚
  batch_size: number              // 批处理大小
}
```

#### 5. export_file（导出文件节点）

```typescript
config: {
  output_format: 'json' | 'xml' | 'yaml' | 'csv' | 'excel'  // 导出格式
  output_path: string      // 输出路径（必需）
  pretty_print: boolean    // 是否格式化输出
}
```

---

## 🔄 数据流转机制

### 1. 执行上下文（Context）

后端执行时，所有节点结果存储在 `execution_context` 中：

```python
execution_context = {
    "execution_id": "workflow_20250120_103000",
    "workflow_id": "custom_1703123456789",
    "status": "running",
    "started_at": "2025-01-20T10:30:00",
    
    # 节点执行结果（自动添加）
    "step_parse_file": {
        "data": {...},
        "schema": {...},
        "file_path": "data/uploads/file.xml"
    },
    "step_analyze_schema": {
        "learned_schema": {...},
        "relationships": {...}
    },
    # ... 其他节点结果
    
    "steps": [
        {
            "step": "parse_file",
            "status": "completed",
            "result": {...}
        },
        # ... 其他步骤状态
    ]
}
```

### 2. 节点间数据传递

- **上游节点**：将结果存储在 `context["step_<节点名>"]`
- **下游节点**：通过 `context.get("step_<上游节点名>")` 访问数据

```python
# analyze_schema 节点访问 parse_file 的输出
async def analyze_schema_step(context: Dict[str, Any]):
    parse_result = context.get("step_parse_file", {})
    data = parse_result.get("data")
    schema = parse_result.get("schema")
    # ... 处理逻辑
```

---

## 💾 持久化存储

### 1. 前端 → 后端

保存工作流时，前端将 `nodes` 和 `edges` 数组序列化为 JSON：

```typescript
// frontend/src/pages/WorkflowEditor.tsx
await workflowApi.save(workflowId, {
  nodes,      // Node[] 数组
  edges,      // Edge[] 数组
  name: workflowName,
  description: workflowDescription,
  is_active: isActive
})
```

### 2. 后端存储

后端将 JSON 数据存储在内存字典中（后续可改为数据库）：

```python
# backend/api/workflows.py
_custom_workflows[workflow_id] = {
    "workflow_id": workflow_id,
    "name": name,
    "description": description,
    "nodes": nodes,      # 直接存储 JSON 数组
    "edges": edges,      # 直接存储 JSON 数组
    "is_active": is_active,
    "created_at": created_at,
    "updated_at": datetime.now().isoformat(),
}
```

### 3. 后端 → 前端

加载工作流时，后端返回完整的 `nodes` 和 `edges` 数组：

```python
# backend/api/workflows.py
return {
    "nodes": workflow.get("nodes", []),
    "edges": workflow.get("edges", []),
    "name": workflow.get("name", workflow_id),
    "description": workflow.get("description", ""),
    "is_active": workflow.get("is_active", False),
}
```

---

## 🎯 节点功能差异化

### 1. 配置差异化

每个节点类型通过 `renderNodeSpecificConfig()` 函数渲染不同的配置表单：

```typescript
// frontend/src/components/Workflow/NodeDetailPanel.tsx
const renderNodeSpecificConfig = () => {
  switch (nodeData.type) {
    case 'parse_file':
      return (
        <Form.Item name="file_path" label="文件路径">
          <Input />
        </Form.Item>
      )
    case 'analyze_schema':
      return (
        <Form.Item name="use_ai" label="使用AI分析">
          <Switch />
        </Form.Item>
      )
    // ... 其他节点类型
  }
}
```

### 2. 验证差异化

每个节点类型有独立的验证规则：

```typescript
// frontend/src/components/Workflow/WorkflowNode.tsx
const validateNodeConfig = (type: NodeType, config?: Record<string, any>) => {
  switch (type) {
    case 'parse_file':
      if (!config.file_path) {
        missingFields.push('file_path')
      }
      break
    case 'export_file':
      if (!config.output_path) {
        missingFields.push('output_path')
      }
      break
    // ... 其他节点类型
  }
}
```

### 3. 执行差异化

后端每个节点类型有独立的处理函数：

```python
# backend/workflow/default_workflows.py
async def parse_file_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """解析文件节点处理函数"""
    file_path = context.get("file_path")
    # ... 解析逻辑
    return {"data": parsed_data, "schema": schema}

async def analyze_schema_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """分析Schema节点处理函数"""
    parse_result = context.get("step_parse_file", {})
    # ... 分析逻辑
    return {"learned_schema": schema}
```

---

## 📝 总结

### 关键设计特点

1. **前后端分离**：
   - 前端使用 React Flow 管理可视化节点和边
   - 后端使用 WorkflowEngine 管理执行逻辑

2. **统一数据结构**：
   - 所有节点共享 `NodeData` 接口
   - 通过 `type` 字段区分节点类型
   - 通过 `config` 字段存储类型特定的配置

3. **灵活的关系构建**：
   - 前端通过拖拽创建连接（边）
   - 后端通过边构建依赖关系
   - 自动拓扑排序确定执行顺序

4. **可扩展性**：
   - 新增节点类型只需：
     - 在前端添加 `NodeType` 类型
     - 在 `nodeConfig` 中添加图标和颜色
     - 在 `renderNodeSpecificConfig` 中添加配置表单
     - 在后端添加对应的处理函数

### 数据流向图

```
前端（React Flow）
  ↓
节点（Node） + 边（Edge）
  ↓ (保存时序列化)
后端（JSON存储）
  ↓ (加载时反序列化)
前端（React Flow）
  ↓ (执行时)
后端（WorkflowEngine）
  ↓ (构建依赖关系)
执行节点（按拓扑排序）
  ↓ (结果存储在 context)
下一个节点（从 context 读取数据）
```

---

**文档版本**：v1.0  
**最后更新**：2025-01-20

