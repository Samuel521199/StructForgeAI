# XML编辑器工作流 - 快速指南

## 🎯 目标
通过AI工作流，将任意XML文件（如骑马与砍杀2装备表）自动转换为可编辑工具，支持创建、读取、编辑、删除操作。

**核心特性**：
- ✅ AI智能识别枚举值（如 `culture="Culture.aserai"`）
- ✅ 自动识别布尔值（如 `Civilian="true"`）
- ✅ 根据游戏上下文自动识别字段类型
- ✅ 支持手动调整和纠正类型、取值范围

---

## 📋 核心工作流（5-6个节点）

### 基础工作流（使用全局AI配置）
```
解析文件 → AI分析结构 → 生成编辑器配置 → 编辑数据 → 导出文件
```

### 增强工作流（使用AI Agent，更智能）
```
解析文件 → AI Agent → AI分析结构 → 生成编辑器配置 → 编辑数据 → 导出文件
         ↓
    (ChatGPT/Gemini/DeepSeek)
```

### 1️⃣ **parse_file** - 解析文件
**功能**：读取XML文件，转换为结构化数据  
**配置**：
- `file_path`: 选择要处理的XML文件
- 自动识别XML格式，无需额外配置

**输出**：XML数据 + 基础Schema

---

### 2️⃣ **AI Agent**（可选，推荐）
**功能**：使用专门的AI Agent进行更智能的分析  
**配置**：
- 连接 ChatGPT/Gemini/DeepSeek 节点（必需）
- `system_prompt`：`你是XML数据结构分析专家。分析XML数据，识别枚举值、布尔值、数值范围和字段关联关系。只返回JSON格式结果，不要解释性文字。`
- `goal`：`分析XML数据，提取以下信息并以JSON格式返回：{"enum_fields": {"字段名": ["值1", "值2"]}, "boolean_fields": ["字段1"], "numeric_ranges": {"字段名": {"min": 0, "max": 10, "default": 5}}, "field_relationships": [{"field1": "字段1", "field2": "字段2", "relation_type": "对应", "relation_rules": {}}], "required_fields": ["id"], "optional_fields": [], "validation_rules": {}, "edit_suggestions": {}, "structure": "描述", "fields": [{"name": "字段名", "type": "enum|boolean|number|string"}], "edit_paths": ["Items.Item"]} 只返回JSON，不要其他内容。`
- `temperature`：0.3（降低随机性，提高准确性）

**关键要求**：
- ✅ 输出必须是纯JSON格式，不要解释性文字
- ✅ 枚举值必须从数据中提取所有唯一值
- ✅ 布尔值字段必须正确识别（即使以字符串形式存储）
- ✅ 数值范围必须基于实际数据计算

### 2️⃣/3️⃣ **analyze_xml_structure** - AI分析XML结构
**功能**：AI智能分析XML结构，识别字段含义、枚举值、数值范围、关联关系  
**配置**：
- `additional_context`（重要）：提供业务背景
  - 示例："这是骑马与砍杀2的游戏装备配置XML，Type字段表示装备类型，culture字段是游戏文化枚举，布尔值字段使用'true'/'false'字符串"
- AI会自动识别：
  - **枚举字段**：如 `culture="Culture.aserai"` → 识别为枚举，提取所有可能值
  - **布尔值字段**：如 `Civilian="true"` → 识别为布尔值，而非字符串
  - **数值范围**：如 `weight` 的范围 [0.1, 4.2]
  - **字段关联**：如 `modifier_group` 与 `material_type` 的对应关系

**输出**：详细的结构分析结果（包含枚举值列表、布尔值字段、数值范围等）

**注意**：如果连接了 AI Agent，会使用 AI Agent 的配置；否则使用全局AI配置

---

### 3️⃣/4️⃣ **generate_editor_config** - 生成编辑器配置
**功能**：根据AI分析结果，自动生成编辑器配置（表单字段、验证规则、下拉选项）  
**配置**：
- `editor_type`: 选择编辑器类型（默认 `form`）
- `custom_fields`（可选）：指定需要特殊处理的字段
- AI自动生成：
  - **字段类型**：根据分析结果自动设置（枚举→下拉框，布尔→开关，数字→数字输入）
  - **下拉选项**：从枚举值自动提取（如 `culture` 的所有可能值）
  - **数值范围限制**：根据分析结果设置 min/max
  - **布尔值处理**：自动识别 `"true"`/`"false"` 字符串为布尔类型
  - **布局和分组**：根据字段关联关系自动分组

**输出**：编辑器配置JSON（可手动调整）

**手动调整**：生成后可在配置中手动修改：
- 纠正字段类型（如将字符串改为枚举）
- 调整数值范围（如 weight 的 min/max）
- 添加/删除枚举选项

---

### 4️⃣ **edit_data** - 编辑数据
**功能**：基于编辑器配置，创建/更新/删除数据条目  
**配置**：
- `operation`: 选择操作类型（`create` / `update` / `delete`）
- `target_path`: 指定要编辑的数据路径（如 `Items.Item[0]`）
- `data`: 编辑的数据内容（根据编辑器配置自动验证）

**输出**：修改后的数据

---

### 5️⃣ **export_file** - 导出文件
**功能**：将修改后的数据导出为XML文件  
**配置**：
- `output_format`: `xml`
- `output_path`: 指定导出路径
- `pretty_print`: `true`（美化XML格式）

**输出**：格式化后的XML文件

---

## 🔧 可选增强节点

### **filter_data** - 过滤数据
**用途**：在编辑前筛选需要处理的数据  
**配置**：
- `filter_conditions`: JSON格式的过滤条件
- 例如：`{"Type": "HandArmor", "culture": "Culture.aserai"}`

### **validate_data** - 验证数据
**用途**：在导出前验证数据完整性  
**配置**：
- `validation_rules`: 自定义验证规则（可选）
- 自动使用Schema和编辑器配置中的验证规则

### **smart_edit** - 智能编辑
**用途**：使用自然语言指令批量编辑  
**配置**：
- `instruction`: 自然语言指令，如"将所有HandArmor的weight增加10%"
- AI理解指令并执行批量修改

---

## 🚀 使用流程

### 步骤1：创建工作流
1. 点击"创建工作流"
2. 输入名称："XML编辑器"

### 步骤2：添加节点
按顺序添加5个核心节点：
1. `parse_file` → 配置文件路径
2. `analyze_xml_structure` → 可选添加业务背景
3. `generate_editor_config` → 选择编辑器类型
4. `edit_data` → 配置操作类型
5. `export_file` → 配置输出路径

### 步骤3：连接节点
从左到右依次连接：`parse_file` → `analyze_xml_structure` → `generate_editor_config` → `edit_data` → `export_file`

### 步骤4：执行工作流
1. 双击 `parse_file` 节点，配置XML文件路径
2. 依次执行每个节点（点击节点右侧的"执行"按钮）
3. 在 `edit_data` 节点中编辑数据
4. 执行 `export_file` 导出结果

---

## 💡 关键优势

✅ **智能识别**：AI自动分析XML结构，无需手动配置  
✅ **通用适配**：适用于任意XML格式，不限于特定游戏或格式  
✅ **低代码化**：只需连接节点，AI自动生成编辑器配置  
✅ **可微调**：可在 `generate_editor_config` 后手动调整配置

---

## 📝 参数调整建议

### 如果AI分析不准确
- **添加业务背景**：在 `analyze_xml_structure` 的 `additional_context` 中详细描述
  - 示例："这是骑马与砍杀2的游戏装备配置XML，Type字段表示装备类型（HandArmor/BodyArmor等），culture字段是游戏文化枚举（Culture.aserai/Culture.neutral_culture等），布尔值字段使用'true'/'false'字符串形式存储"
- **使用AI Agent**（推荐）：连接 ChatGPT/Gemini/DeepSeek 节点，提供更专业的分析能力
  - 在 AI Agent 的 `system_prompt` 中设定："你是游戏配置分析专家，擅长识别枚举值和布尔值字段"
  - 在 AI Agent 的 `goal` 中设定："准确识别所有枚举字段的所有可能值，以及所有布尔值字段"

### 如果编辑器配置不理想
- **指定特殊字段**：在 `generate_editor_config` 的 `custom_fields` 中指定需要特殊处理的字段
- **手动调整配置**：生成后可在配置JSON中手动修改：
  - 纠正字段类型（如将字符串改为枚举或布尔值）
  - 调整数值范围（如 weight 的 min/max）
  - 添加/删除枚举选项
  - 修改字段分组和布局

### 如果需要批量操作
- 添加 `filter_data` 节点筛选数据
- 使用 `smart_edit` 节点进行自然语言批量编辑

---

## 🎨 完整工作流示例

```
[解析文件] → [AI分析结构] → [生成编辑器配置] → [过滤数据] → [编辑数据] → [验证数据] → [导出文件]
```

**适用场景**：需要先筛选特定类型的数据，编辑后再验证和导出

