# XML 转编辑器工作流 - 完整流程指南

## 📋 完整工作流节点清单

### 核心流程（必需节点）

1. **Parse File（解析文件）** - 解析 XML 文件
2. **Analyze XML Structure（分析 XML 结构）** - AI 分析结构
3. **Generate Editor Config（生成编辑器配置）** - 生成编辑器配置
4. **Edit Data（编辑数据）** - 编辑、修改数据
5. **Export File（导出文件）** - 保存为 XML 文件

### 可选优化节点

6. **GPT Agent（GPT 代理）** - 优化编辑器配置（可选）
7. **Validate Data（验证数据）** - 数据验证（可选）
8. **Filter Data（过滤数据）** - 数据筛选（可选）

---

## 🔗 完整工作流连接图

```
┌─────────────┐
│ Parse File  │  (1) 解析 XML 文件
│             │
│ 输入: XML    │
└──────┬──────┘
       │ [output] → [input]
       ▼
┌─────────────────────┐
│ Analyze XML         │  (2) AI 分析 XML 结构
│ Structure           │
│                     │
│ 输出: 结构分析       │
└──────┬──────────────┘
       │ [output] → [input]
       ▼
┌─────────────────────┐
│ Generate Editor     │  (3) 生成编辑器配置
│ Config              │
│                     │
│ 输出: 编辑器配置     │
└──────┬──────────────┘
       │ [output] → [input]
       ▼
┌─────────────────────┐
│ Edit Data           │  (4) 编辑数据
│                     │
│ 创建/修改/删除       │
└──────┬──────────────┘
       │ [output] → [input]
       ▼
┌─────────────────────┐
│ Export File         │  (5) 导出为 XML
│                     │
│ 保存文件             │
└─────────────────────┘
```

---

## 🚀 完整流程步骤

### 步骤 1：解析文件（Parse File）

**节点配置**：
- 节点名称：`解析装备表`
- 文件路径：`F:\xml\SkiOL_arm_armors.xml`
- 文件格式：`XML`
- 跳过 Schema 检测：❌（保留 Schema 信息）

**输出**：结构化数据 + Schema

---

### 步骤 2：分析 XML 结构（Analyze XML Structure）

**节点配置**：
- 节点名称：`分析装备表结构`
- 分析深度：`完整分析`
- ✅ 自动推断数据类型
- ✅ 识别枚举值
- ✅ 识别必填字段

**系统提示词**（默认即可）：
```
分析 XML 结构，提取所有字段、类型、嵌套关系和约束。
```

**输出**：结构分析结果（字段类型、枚举值、嵌套关系）

---

### 步骤 3：生成编辑器配置（Generate Editor Config）

**节点配置**：
- 节点名称：`生成装备编辑器配置`
- 编辑器类型：`表单编辑器`
- 布局模式：`主列表视图 + 详情编辑视图`
- ✅ 自动生成字段
- ✅ 生成验证规则

**系统提示词**（默认即可）：
```
根据 XML 结构分析结果，生成完整的编辑器配置。
```

**输出**：编辑器配置 JSON（字段定义、验证规则、布局）

---

### 步骤 4：编辑数据（Edit Data）

**节点配置**：
- 节点名称：`编辑装备数据`
- 操作类型：选择以下之一：
  - `create` - 创建新条目
  - `update` - 修改现有条目
  - `delete` - 删除条目
  - `batch_create` - 批量创建
  - `batch_update` - 批量修改
  - `batch_delete` - 批量删除

**数据路径**：指定要编辑的数据路径
- 例如：`Items.Item[0]` - 编辑第一个 Item
- 例如：`Items.Item` - 编辑所有 Item

**新数据**：输入要创建或修改的数据（JSON 格式）

**输出**：编辑后的数据

---

### 步骤 5：导出文件（Export File）

**节点配置**：
- 节点名称：`导出装备表`
- 输出格式：`XML`
- 输出路径（可选）：`F:\xml\SkiOL_arm_armors_edited.xml`
- ✅ 格式化输出（美化 XML）
- 排序字段（可选）：`@attributes.id`（按 ID 排序）

**输出**：下载 XML 文件

---

## 📝 完整工作流配置示例

### 节点连接顺序

```
1. Parse File [output] ──→ Analyze XML Structure [input]
2. Analyze XML Structure [output] ──→ Generate Editor Config [input]
3. Generate Editor Config [output] ──→ Edit Data [input] (可选)
4. Parse File [output] ──→ Edit Data [input] (直接编辑原始数据)
5. Edit Data [output] ──→ Export File [input]
   或
   Parse File [output] ──→ Export File [input] (直接导出，不编辑)
```

### 典型工作流配置

#### 场景 A：生成编辑器配置（不编辑）

```
Parse File → Analyze XML Structure → Generate Editor Config
```

**用途**：只生成编辑器配置，不进行数据编辑

#### 场景 B：完整编辑流程

```
Parse File → Analyze XML Structure → Generate Editor Config
Parse File → Edit Data → Export File
```

**用途**：生成配置 + 编辑数据 + 保存文件

#### 场景 C：使用 GPT Agent 优化

```
Parse File → Analyze XML Structure → Generate Editor Config → GPT Agent → Export File
```

**用途**：生成配置后，使用 AI 优化配置，然后导出

---

## 🎯 各节点详细配置

### 节点 1：Parse File（解析文件）

**必填项**：
- ✅ 文件路径：`F:\xml\SkiOL_arm_armors.xml`

**推荐配置**：
- 跳过 Schema 检测：❌（保留 Schema）
- 文件编码：`UTF-8`

---

### 节点 2：Analyze XML Structure（分析 XML 结构）

**必填项**：
- ✅ 分析深度：`完整分析`

**推荐配置**：
- ✅ 自动推断数据类型
- ✅ 识别枚举值
- ✅ 识别必填字段

---

### 节点 3：Generate Editor Config（生成编辑器配置）

**必填项**：
- ✅ 编辑器类型：`表单编辑器`

**推荐配置**：
- 布局模式：`主列表视图 + 详情编辑视图`
- ✅ 自动生成字段
- ✅ 生成验证规则

---

### 节点 4：Edit Data（编辑数据）

**必填项**：
- ✅ 操作类型：`create` / `update` / `delete` / `batch_*`
- ✅ 数据路径：例如 `Items.Item[0]` 或 `Items.Item`

**创建新条目示例**：
- 操作类型：`create`
- 数据路径：`Items.Item`
- 新数据：
```json
{
  "id": "new_bracer",
  "name": "{=armarmor9999}New Bracer",
  "mesh": "sz_hand_999",
  "culture": "Culture.neutral_culture",
  "weight": "1.5",
  "Type": "HandArmor"
}
```

**修改现有条目示例**：
- 操作类型：`update`
- 数据路径：`Items.Item[0]`
- 新数据：
```json
{
  "weight": "2.0",
  "appearance": "2"
}
```

**删除条目示例**：
- 操作类型：`delete`
- 数据路径：`Items.Item[0]`

---

### 节点 5：Export File（导出文件）

**必填项**：
- ✅ 输出格式：`XML`

**推荐配置**：
- ✅ 格式化输出（美化 XML）
- 输出路径（可选）：指定保存路径
- 排序字段（可选）：`@attributes.id`（按 ID 排序）

---

## ✅ 功能完整性检查

### 已实现的功能

- ✅ **识别 XML 文件**：Parse File 节点
- ✅ **分析 XML 结构**：Analyze XML Structure 节点
- ✅ **生成编辑器配置**：Generate Editor Config 节点
- ✅ **编辑数据**：Edit Data 节点（创建/修改/删除）
- ✅ **保存文件**：Export File 节点（导出为 XML）

### 完整流程验证

1. ✅ 可以解析 XML 文件
2. ✅ 可以分析 XML 结构
3. ✅ 可以生成编辑器配置
4. ✅ 可以编辑数据（创建/修改/删除）
5. ✅ 可以保存为 XML 文件

**结论**：当前工作流已完整支持 XML 文件的识别、生成编辑器、编辑、修改、保存等所有功能！

---

## 📋 详细配置说明

### 节点 1：解析文件

**必填项**：
- ✅ 文件路径：`F:\xml\SkiOL_arm_armors.xml`

**可选配置**：
- 保留属性：✅（推荐）
- 保留命名空间：✅（如果 XML 有命名空间）

### 节点 2：分析 XML 结构

**必填项**：
- ✅ 分析深度：`完整分析`

**推荐配置**：
- ✅ 自动推断数据类型
- ✅ 识别枚举值
- ✅ 识别必填字段

**系统提示词**（默认即可，也可自定义）：
```
分析 XML 结构，提取所有字段、类型、嵌套关系和约束。
```

### 节点 3：生成编辑器配置

**必填项**：
- ✅ 编辑器类型：`表单编辑器`

**推荐配置**：
- 布局模式：`主列表视图 + 详情编辑视图`
- ✅ 自动生成字段
- ✅ 生成验证规则

**系统提示词**（默认即可，也可自定义）：
```
根据 XML 结构分析结果，生成完整的编辑器配置，包括：
- 表单字段定义
- 输入组件类型
- 验证规则
- 布局配置
- 枚举选项
```

---

## 🎯 可选：使用 GPT Agent 优化

如果你想进一步优化编辑器配置，可以添加 GPT Agent 节点：

### 节点 4：GPT Agent（可选）

**连接方式**：
```
生成装备编辑器配置 [output] ──→ GPT Agent [input]
```

**配置步骤**：
1. **API 配置**：
   - API Key：输入你的 OpenAI API Key（`sk-...`）
   - API URL：`https://api.openai.com/v1/responses`
   - 模型：`gpt-5` 或 `gpt-4o`

2. **系统提示词**：
```
优化编辑器配置：
1. 添加详细的帮助文本
2. 优化字段分组
3. 添加智能验证规则
4. 优化 UI 组件选择
```

3. **输入内容**：
   - 选择"使用上游数据"（自动使用 Generate Editor Config 的输出）

4. **输出格式**：`JSON`

---

## 📊 输出结果示例

### 编辑器配置结构

```json
{
  "editor_config": {
    "editor_type": "form_editor",
    "layout": {
      "master_view": {
        "type": "table",
        "columns": [
          { "field": "id", "label": "ID" },
          { "field": "name", "label": "名称" },
          { "field": "weight", "label": "重量", "type": "number" }
        ]
      },
      "detail_view": {
        "type": "form",
        "sections": [
          {
            "title": "基本信息",
            "fields": [
              {
                "field": "id",
                "label": "装备 ID",
                "type": "text",
                "component": "Input",
                "required": true,
                "validation": {
                  "required": true,
                  "pattern": "^[a-z0-9_]+$"
                }
              }
              // ... 更多字段
            ]
          }
        ]
      }
    }
  }
}
```

---

## 🔧 常见问题

### Q1: 如何修改字段标签？
A: 在"生成编辑器配置"节点的系统提示词中添加：
```
将字段标签改为中文，例如：
- id → 装备ID
- name → 装备名称
- weight → 重量
```

### Q2: 如何添加自定义验证规则？
A: 在 GPT Agent 节点中添加：
```
添加以下验证规则：
- weight 必须大于 0
- arm_armor 必须在 0-100 之间
- id 必须唯一
```

### Q3: 如何处理嵌套结构？
A: 编辑器配置会自动处理嵌套结构，生成对应的分组和子表单。

### Q4: 如何导出编辑器配置？
A: 在最后一个节点的 OUTPUT 面板中，点击"导出"按钮，选择 JSON 格式。

---

## 🎨 使用生成的编辑器配置

生成的编辑器配置可以：

1. **保存为 JSON 文件**
2. **集成到前端应用**：
   ```typescript
   import editorConfig from './editor_config.json'
   
   // 使用配置渲染编辑器
   <FormGenerator config={editorConfig.editor_config} />
   ```
3. **进一步定制**：根据需求手动修改配置

---

## 📝 工作流模板

保存这个工作流作为模板，以后可以直接使用：

1. 创建新工作流
2. 添加相同的节点
3. 修改文件路径
4. 执行即可

---

## 🚀 下一步

- 查看完整文档：`docs/WORKFLOW_XML_TO_EDITOR.md`
- 尝试其他格式：JSON、YAML、CSV
- 添加更多节点：数据验证、数据转换、导出等

