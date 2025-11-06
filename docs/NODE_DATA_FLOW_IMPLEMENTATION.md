# StructForge AI - 节点数据流传递实现说明

## ✅ 已实现功能

### 1. 全局执行结果映射

在 `WorkflowEditor` 中维护了全局的节点执行结果映射：
- `nodeExecutionResults: Map<string, ParsedFile>` - 存储每个节点的执行结果
- `getUpstreamResult(nodeId)` - 根据 edges 查找上游节点并获取其执行结果
- `updateNodeExecutionResult(nodeId, result)` - 更新节点的执行结果到全局映射

### 2. 上游数据传递

**NodeDetailPanel** 接收上游数据：
- `upstreamResult?: ParsedFile | null` - 上游节点的执行结果
- `onExecutionResult?: (result: ParsedFile) => void` - 执行结果回调，用于更新全局映射

**执行器上下文** 支持上游数据：
- `ExecutorContext.upstreamResult` - 上游节点的执行结果
- `BaseExecutor.getSourceResult()` - 优先返回上游数据，如果没有则返回当前结果
- `BaseExecutor.validateUpstreamData()` - 优先检查上游数据

### 3. 执行器更新

所有执行器都已更新，优先使用上游数据：
- `AnalyzeXMLStructureExecutor` - 使用 `sourceResult.data` 和 `sourceResult.schema`
- `GenerateEditorConfigExecutor` - 使用 `sourceResult.analysis`
- `EditDataExecutor` - 使用 `sourceResult.data`
- `FilterDataExecutor` - 使用 `sourceResult.data`
- `ValidateDataExecutor` - 使用 `sourceResult.data`
- `SmartEditExecutor` - 使用 `sourceResult.data`

### 4. INPUT 面板显示

- 对于触发节点（`parse_file`）：显示节点配置信息
- 对于非触发节点：如果有上游数据，显示上游数据（data, schema, analysis等）
- 如果没有上游数据，显示提示信息

---

## 📋 操作流程

### 步骤1：添加并配置解析文件节点

1. 点击工具栏“添加节点”
2. 选择“解析文件”节点
3. 双击节点，打开节点详情面板
4. 在 Parameters 标签页：
   - 点击文件路径输入框旁边的文件夹图标
   - 选择 `SkiOL_arm_armors.xml` 文件
   - 文件会自动上传到服务器
5. 点击“执行节点”按钮
6. 验证 OUTPUT 面板显示：
   - Schema：XML 结构
   - Table：解析后的数据表格
   - JSON：完整的解析数据

### 步骤2：添加并连接AI分析节点

1. 点击工具栏“添加节点”
2. 选择“AI分析XML结构”节点
3. **连接节点**：
   - 从“解析文件”节点的右侧输出连接点（蓝色圆点）拖拽
   - 连接到“AI分析XML结构”节点的左侧输入连接点（灰色圆点）
   - 连接线应该显示为蓝色箭头
4. 双击“AI分析XML结构”节点
5. 验证 INPUT 面板：
   - **应该显示上游节点的数据**（data, schema）
   - 而不是显示“暂无输入数据”
6. 在 Parameters 标签页：
   - 可选：添加额外上下文（additional_context）
   - 可选：关闭包含示例内容（include_sample）
7. 点击“执行节点”按钮
8. 验证 OUTPUT 面板显示：
   - Schema：分析结果的结构
   - JSON：完整的分析结果，包含：
     - `business_domain` - 业务领域
     - `enum_fields` - 枚举字段及其值
     - `numeric_ranges` - 数值范围
     - `field_relationships` - 字段关联关系
     - `required_fields` - 必填字段
     - `optional_fields` - 可选字段
     - `edit_suggestions` - 编辑建议

### 步骤3：继续连接后续节点

1. **生成编辑器配置节点**：
   - 添加节点，选择“生成编辑器配置”
   - 从“AI分析XML结构”节点连接到“生成编辑器配置”节点
   - INPUT 面板应显示上游的 `analysis` 数据
   - 执行节点，OUTPUT 应显示编辑器配置

2. **编辑数据节点**：
   - 添加节点，选择“编辑数据”
   - 从“解析文件”或“编辑数据”节点连接
   - INPUT 面板应显示上游的 `data`
   - 配置操作类型和数据路径，执行节点

3. **导出文件节点**：
   - 添加节点，选择“导出文件”
   - 从任意数据节点连接
   - 配置导出格式和路径，执行节点

---

## 🔍 验证要点

### 1. 节点连接验证

- ✅ 节点间有连接线（蓝色箭头）
- ✅ 连接线从源节点的输出点连接到目标节点的输入点
- ✅ 连接后，目标节点的 INPUT 面板显示源节点的数据

### 2. 数据流验证

- ✅ 解析文件节点执行后，数据存储在全局映射中
- ✅ AI分析节点执行时，自动从上游节点获取数据
- ✅ 如果上游节点未执行，显示友好的错误提示
- ✅ 执行结果会合并上游数据和当前结果

### 3. INPUT 面板验证

- ✅ 触发节点（parse_file）：显示节点配置
- ✅ 非触发节点且有上游连接：显示上游数据
- ✅ 非触发节点但无上游连接：显示提示信息

### 4. OUTPUT 面板验证

- ✅ 显示当前节点的执行结果
- ✅ 对于 AI 节点，显示分析结果、配置、工作流等
- ✅ 对于数据处理节点，显示处理后的数据

---

## 🎯 功能评估

### ✅ 已实现的功能

1. **节点间数据流传递** ✅
   - 通过 edges 查找上游节点
   - 从全局映射获取上游节点执行结果
   - 执行器优先使用上游数据

2. **INPUT 面板显示** ✅
   - 触发节点显示配置信息
   - 非触发节点显示上游数据

3. **执行结果合并** ✅
   - 保留上游数据（data, schema, file_path等）
   - 添加当前节点的结果（analysis, editor_config等）

4. **错误提示** ✅
   - 如果缺少上游数据，显示友好的错误提示
   - 提示用户先执行上游节点或连接节点

### ⚠️ 需要注意的事项

1. **节点执行顺序**：
   - 用户需要先执行上游节点，再执行下游节点
   - 如果跳过了上游节点，会显示错误提示

2. **多个上游节点**：
   - 当前实现只取第一个上游节点（`edges.find(e => e.target === nodeId)`）
   - 如果节点有多个上游连接，可能需要增强逻辑

3. **数据更新**：
   - 如果上游节点重新执行，下游节点需要手动刷新或重新执行
   - 可以考虑添加自动刷新机制

---

## 📝 使用示例

### 完整工作流示例

```
parse_file (执行) 
  ↓ 连接
analyze_xml_structure (执行，自动使用上游数据)
  ↓ 连接
generate_editor_config (执行，自动使用上游的 analysis)
  ↓ 连接
edit_data (执行，自动使用上游的 data)
  ↓ 连接
export_file (执行，自动使用上游的 data)
```

### 操作步骤

1. **执行 parse_file**：
   - 选择文件：`SkiOL_arm_armors.xml`
   - 执行节点
   - 验证 OUTPUT 显示解析结果

2. **连接并执行 analyze_xml_structure**：
   - 从 parse_file 拖拽连接到 analyze_xml_structure
   - 双击 analyze_xml_structure，验证 INPUT 显示上游数据
   - 执行节点
   - 验证 OUTPUT 显示分析结果

3. **连接并执行 generate_editor_config**：
   - 从 analyze_xml_structure 连接到 generate_editor_config
   - 双击 generate_editor_config，验证 INPUT 显示上游的 analysis
   - 执行节点
   - 验证 OUTPUT 显示编辑器配置

4. **连接并执行 edit_data**：
   - 从 parse_file 或 generate_editor_config 连接到 edit_data
   - 配置操作类型（如 create）和数据路径（如 Items.Item）
   - 执行节点
   - 验证 OUTPUT 显示更新后的数据

5. **连接并执行 export_file**：
   - 从 edit_data 连接到 export_file
   - 配置导出格式（xml）和路径
   - 执行节点
   - 验证文件已导出

---

## ✅ 功能满足度评估

### 核心功能 ✅

1. **解析文件节点选择XML后连接到AI分析节点** ✅
   - 可以通过拖拽连接节点
   - 连接后，AI分析节点自动获取上游数据
   - INPUT 面板正确显示上游数据

2. **保证步骤的实现** ✅
   - 执行器验证上游数据存在
   - 如果缺少数据，显示错误提示
   - 执行结果合并上游数据和当前结果

3. **界面操作** ✅
   - 双击节点打开详情面板
   - INPUT 面板显示上游数据
   - OUTPUT 面板显示执行结果
   - 执行节点按钮正常工作

### 功能完整性 ✅

- ✅ 节点连接机制正常工作
- ✅ 数据流传递机制正常工作
- ✅ 执行器使用上游数据
- ✅ INPUT 面板显示上游数据
- ✅ OUTPUT 面板显示执行结果
- ✅ 错误提示友好

---

## 🚀 下一步优化建议

1. **自动刷新机制**：
   - 当上游节点重新执行时，自动更新下游节点的 INPUT 显示
   - 可以考虑添加“刷新上游数据”按钮

2. **多个上游节点支持**：
   - 如果节点有多个上游连接，允许用户选择使用哪个上游数据
   - 或者自动合并多个上游数据

3. **数据流可视化**：
   - 在节点上显示数据流状态（有数据/无数据）
   - 在连接线上显示数据流方向

---

**最后更新**：2025-01-XX  
**状态**：✅ 已实现并验证

