# StructForge AI - 工作流节点分析

## 📋 当前已实现的工作流节点

根据项目架构和代码分析，以下是当前已实现的所有工作流节点。

---

## 🔵 一、文件处理类节点

### 1. `parse_file` - 文件解析节点

**功能描述**：读取并解析各种格式的配置文件

**实现位置**：`backend/workflow/default_workflows.py:15`

**输入参数**（从 context 获取）：
- `file_path` (str): 文件路径

**处理流程**：
1. 根据文件扩展名自动选择解析器（XML/JSON/YAML/CSV/Excel）
2. 解析文件内容为结构化数据
3. 自动检测数据结构（Schema推断）

**输出结果**：
```python
{
    "data": Dict[str, Any],      # 解析后的数据结构
    "schema": Dict[str, Any],    # 自动检测的Schema
    "file_path": str             # 文件路径
}
```

**支持的格式**：
- ✅ XML (.xml)
- ✅ JSON (.json)
- ✅ YAML (.yaml, .yml)
- ✅ CSV (.csv)
- ✅ TSV (.tsv)
- ✅ Excel (.xlsx, .xls)

**依赖关系**：无（通常是工作流的起始节点）

**使用示例**：
```python
context = {
    "file_path": "F:/StructForgeAI/data/uploads/weapons.xml"
}
result = await parse_file_step(context)
```

---

### 2. `export_file` - 文件导出节点

**功能描述**：将处理后的数据导出为指定格式的文件

**实现位置**：`backend/workflow/default_workflows.py:123`

**输入参数**（从 context 获取）：
- `step_apply_operations.modified_data` 或 `step_parse_file.data`: 要导出的数据
- `output_format` (str, 默认"json"): 输出格式
- `output_path` (str): 输出文件路径

**处理流程**：
1. 获取要导出的数据（优先从操作步骤，否则从解析步骤）
2. 根据输出格式选择对应的解析器
3. 将数据导出为文件

**输出结果**：
```python
{
    "output_path": str,          # 导出文件的路径
    "success": bool              # 是否成功
}
```

**支持的导出格式**：
- ✅ JSON
- ✅ XML
- ✅ YAML
- ✅ CSV
- ✅ Excel

**依赖关系**：通常依赖于 `apply_operations` 或 `parse_file`

**使用示例**：
```python
context = {
    "step_parse_file": {"data": {...}},
    "output_format": "json",
    "output_path": "./exports/output"
}
result = await export_file_step(context)
```

---

## 🧠 二、Schema分析类节点

### 3. `analyze_schema` - Schema分析节点

**功能描述**：深度分析数据结构，理解字段含义和关系

**实现位置**：`backend/workflow/default_workflows.py:33`

**输入参数**（从 context 获取）：
- `step_parse_file.data`: 解析后的数据
- `step_parse_file.schema`: 基础Schema
- `use_ai` (bool, 默认True): 是否使用AI分析

**处理流程**：
1. 选择学习器（AI模式或规则模式）
2. 使用学习器分析数据结构
3. 理解字段间的逻辑关系

**输出结果**：
```python
{
    "learned_schema": Dict[str, Any],    # AI/规则学习后的Schema
    "relationships": Dict[str, Any],     # 字段关系图谱
    "base_schema": Dict[str, Any]        # 基础Schema（备用）
}
```

**分析能力**：
- ✅ 字段类型推断
- ✅ 字段含义理解（AI模式）
- ✅ 约束条件识别
- ✅ 引用关系检测
- ✅ 依赖关系分析
- ✅ 组合关系识别

**依赖关系**：必须依赖于 `parse_file`

**模式说明**：
- **AI模式**：使用 `AISchemaLearner`，深度理解语义
- **规则模式**：使用 `RuleBasedSchemaLearner`，快速基础分析

**使用示例**：
```python
context = {
    "step_parse_file": {
        "data": {...},
        "schema": {...}
    },
    "use_ai": True
}
result = await analyze_schema_step(context)
```

---

## 💬 三、自然语言处理类节点

### 4. `process_natural_language` - 自然语言处理节点

**功能描述**：将自然语言指令转换为结构化的操作意图

**实现位置**：`backend/workflow/default_workflows.py:64`

**输入参数**（从 context 获取）：
- `instruction` (str): 自然语言指令
- `step_analyze_schema.learned_schema` 或 `base_schema`: Schema信息
- `use_ai` (bool, 默认True): 是否使用AI

**处理流程**：
1. 获取用户输入的自然语言指令
2. 结合Schema上下文
3. 使用学习器推断操作意图

**输出结果**：
```python
{
    "intent": Dict[str, Any],    # 解析后的操作意图
    "instruction": str           # 原始指令
}
```

**意图结构示例**：
```python
{
    "action": "update",           # 操作类型（update/copy/create/delete）
    "target": "weapon.damage",   # 目标字段路径
    "value": 60,                 # 新值
    "modifications": [...]       # 修改列表
}
```

**支持的操作类型**：
- ✅ 更新字段值（update）
- ✅ 复制记录（copy）
- ✅ 创建新记录（create）
- ✅ 删除记录（delete）
- ✅ 批量修改（batch_update）

**依赖关系**：必须依赖于 `analyze_schema`

**使用示例**：
```python
context = {
    "instruction": "将所有的剑的重量减少10%",
    "step_analyze_schema": {
        "learned_schema": {...}
    },
    "use_ai": True
}
result = await process_natural_language_step(context)
```

---

## ⚙️ 四、数据操作类节点

### 5. `apply_operations` - 应用操作节点

**功能描述**：根据意图对数据进行实际修改操作

**实现位置**：`backend/workflow/default_workflows.py:87`

**输入参数**（从 context 获取）：
- `step_process_natural_language.intent`: 操作意图
- `step_parse_file.data`: 原始数据

**处理流程**：
1. 获取操作意图
2. 从上下文中获取原始数据
3. 应用操作（当前为简化实现）
4. 返回修改后的数据

**输出结果**：
```python
{
    "modified_data": Dict[str, Any],    # 修改后的数据
    "operations_applied": Dict[str, Any],  # 应用的操作信息
    "modified": bool                     # 是否有修改
}
```

**当前实现状态**：
- ⚠️ **简化实现**：仅支持基本的路径更新（TODO: 实现完整的操作应用逻辑）
- ⚠️ **功能限制**：复杂操作（复制、批量修改）需要完善

**支持的操作**（当前）：
- ✅ 简单字段更新（`action == "update"`）
- ⚠️ 路径更新（支持嵌套路径如 `weapon.damage`）

**待完善功能**：
- ⬜ 复制记录操作
- ⬜ 创建新记录
- ⬜ 删除记录
- ⬜ 批量修改
- ⬜ 数组操作
- ⬜ 条件筛选

**依赖关系**：必须依赖于 `process_natural_language`

**使用示例**：
```python
context = {
    "step_process_natural_language": {
        "intent": {
            "action": "update",
            "target": "weapon.damage",
            "value": 60
        }
    },
    "step_parse_file": {
        "data": {...}
    }
}
result = await apply_operations_step(context)
```

---

## 📊 节点分类总结

### 按功能分类

| 类别 | 节点名称 | 状态 | 完成度 |
|------|---------|------|--------|
| **文件处理** | `parse_file` | ✅ 完成 | 100% |
| **文件处理** | `export_file` | ✅ 完成 | 100% |
| **Schema分析** | `analyze_schema` | ✅ 完成 | 95% |
| **自然语言** | `process_natural_language` | ✅ 完成 | 90% |
| **数据操作** | `apply_operations` | ⚠️ 部分 | 50% |

### 按依赖层级

```
第1层（无依赖）:
├── parse_file ─────────┐
                        │
第2层:                  │
├── analyze_schema ─────┤
                        │
第3层:                  │
├── process_natural_language ───┐
                                │
第4层:                          │
├── apply_operations ───────────┤
                                │
第5层:                          │
└── export_file ────────────────┘
```

---

## 🔧 节点技术特性

### 节点接口规范

所有节点都遵循统一接口：

```python
async def node_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    节点处理函数
    
    Args:
        context: 工作流执行上下文
            - 包含之前步骤的结果（step_<节点名>）
            - 包含用户输入的参数
            
    Returns:
        节点执行结果（字典）
    """
    pass
```

### 上下文传递机制

- 节点结果自动保存到上下文：`context["step_<节点名>"] = result`
- 后续节点通过 `context.get("step_<节点名>")` 访问
- 支持嵌套路径访问：`context.get("step_parse_file.data")`

### 依赖管理

- 使用 `WorkflowStep` 的 `depends_on` 参数定义依赖
- 工作流引擎自动拓扑排序
- 确保依赖节点先执行

---

## 📝 节点使用场景

### 1. 完整处理流程

```
parse_file → analyze_schema → process_natural_language → apply_operations → export_file
```

**场景**：用户上传文件 → AI分析 → 自然语言编辑 → 应用修改 → 导出结果

### 2. 仅分析流程

```
parse_file → analyze_schema
```

**场景**：只需要了解文件结构和Schema，不进行修改

### 3. 批量处理流程

```
parse_file → analyze_schema → export_file
```

**场景**：批量文件格式转换，不进行Schema深度分析

---

## 🚀 可扩展的节点类型建议

基于项目架构，可以扩展以下节点：

### 文件类节点
- ⬜ `read_file_content` - 读取文件原始内容（不解析）
- ⬜ `validate_file` - 文件格式验证
- ⬜ `merge_files` - 合并多个文件

### Schema类节点
- ⬜ `compare_schemas` - Schema对比
- ⬜ `merge_schemas` - Schema合并
- ⬜ `validate_schema` - Schema验证

### 数据处理类节点
- ⬜ `transform_data` - 数据转换
- ⬜ `filter_data` - 数据筛选
- ⬜ `aggregate_data` - 数据聚合
- ⬜ `validate_data` - 数据验证

### AI类节点
- ⬜ `ai_generate` - AI生成内容
- ⬜ `ai_translate` - AI翻译
- ⬜ `ai_summarize` - AI摘要

### 流程控制类节点
- ⬜ `condition` - 条件分支
- ⬜ `loop` - 循环处理
- ⬜ `parallel` - 并行执行
- ⬜ `retry` - 重试机制

---

## 📌 总结

### 当前实现情况

- ✅ **5个核心节点**已实现并可用
- ✅ **依赖管理**机制完善
- ✅ **节点接口**统一规范
- ⚠️ **操作节点**需要完善

### 核心能力

1. ✅ **文件自动识别与解析**（支持6+格式）
2. ✅ **AI/规则双模式Schema分析**
3. ✅ **自然语言意图理解**
4. ✅ **多格式文件导出**
5. ⚠️ **数据操作**（部分实现，需完善）

### 技术亮点

- 🎯 **统一的节点接口**：所有节点遵循相同规范
- 🔗 **灵活的依赖管理**：支持复杂依赖关系
- 📦 **上下文传递机制**：节点间数据共享
- 🤖 **AI能力集成**：无缝融入工作流

---

**最后更新**：2024年  
**版本**：v0.1.0-alpha

