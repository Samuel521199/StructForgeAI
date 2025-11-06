# StructForge AI - 工作流功能测试指南

## ✅ 已完成的功能完善

### 后端完善（4个节点）

1. **analyze_xml_structure** - 增强业务逻辑理解
   - ✅ 识别业务领域
   - ✅ 识别枚举字段及其所有可能值
   - ✅ 识别数值字段范围
   - ✅ 识别字段关联关系
   - ✅ 识别必填字段和可选字段
   - ✅ 提供编辑建议

2. **generate_editor_config** - 生成智能配置
   - ✅ 利用结构分析结果生成配置
   - ✅ 为枚举字段生成下拉选项
   - ✅ 为数值字段生成范围验证
   - ✅ 为嵌套字段生成分组布局
   - ✅ 生成字段默认值建议
   - ✅ 生成字段关联验证规则

3. **edit_data** - 批量操作支持
   - ✅ 支持 `batch_create`（批量创建）
   - ✅ 支持 `batch_update`（批量更新）
   - ✅ 支持 `batch_delete`（批量删除）
   - ✅ `item_data` 支持数组类型

4. **export_file** - XML格式化
   - ✅ 支持 `pretty_print`（美化输出）
   - ✅ 支持 `sort_by`（排序字段）
   - ✅ 使用 `etree.indent()` 进行格式化

### 前端更新

1. **API 更新**：
   - ✅ `dataApi.edit` 支持批量操作类型
   - ✅ `fileApi.export` 支持 `prettyPrint` 和 `sortBy` 参数

2. **配置组件更新**：
   - ✅ `EditDataConfig` 添加批量操作选项
   - ✅ `export_file` 配置添加排序字段选项

---

## 🧪 测试工作流

### 测试用例：编辑手臂铠甲XML

#### 准备工作

1. **准备测试文件**：
   - 将 `SkiOL_arm_armors.xml` 上传到 `data/uploads/`

2. **创建工作流**：
   ```
   parse_file → analyze_xml_structure → generate_editor_config 
   → edit_data → validate_data → export_file
   ```

#### 测试步骤

**步骤1：解析文件**
- 节点类型：`parse_file`
- 配置：
  - 文件路径：`data/uploads/SkiOL_arm_armors.xml`
- 执行并验证：
  - ✅ 文件解析成功
  - ✅ 输出包含 `data` 和 `schema`
  - ✅ INPUT 面板显示文件内容

**步骤2：AI分析XML结构**
- 节点类型：`analyze_xml_structure`
- 配置：
  - 使用默认配置（自动获取上游数据）
- 执行并验证：
  - ✅ 分析完成
  - ✅ OUTPUT 显示结构分析结果
  - ✅ 包含 `enum_fields`（Type, culture, modifier_group, material_type）
  - ✅ 包含 `numeric_ranges`（weight, arm_armor）
  - ✅ 包含 `field_relationships`（modifier_group ↔ material_type）
  - ✅ 包含 `required_fields` 和 `optional_fields`

**步骤3：生成编辑器配置**
- 节点类型：`generate_editor_config`
- 配置：
  - 编辑器类型：`form`
- 执行并验证：
  - ✅ 配置生成完成
  - ✅ OUTPUT 显示编辑器配置
  - ✅ `fields` 包含下拉选项（Type, culture, modifier_group, material_type）
  - ✅ `fields` 包含验证规则（weight, arm_armor 的范围）
  - ✅ `layout` 包含分组配置
  - ✅ `operations` 包含批量操作支持

**步骤4：编辑数据（单个操作）**
- 节点类型：`edit_data`
- 配置：
  - 操作类型：`create`
  - 数据路径：`Items.Item`
  - 条目数据（JSON）：
    ```json
    {
      "@attributes": {
        "id": "test_bracer",
        "name": "{=test}Test Bracer",
        "Type": "HandArmor",
        "culture": "Culture.neutral_culture",
        "weight": "1.5"
      },
      "ItemComponent": {
        "Armor": {
          "arm_armor": "20",
          "modifier_group": "leather",
          "material_type": "Leather"
        }
      },
      "Flags": {
        "Civilian": "true"
      }
    }
    ```
- 执行并验证：
  - ✅ 创建成功
  - ✅ 返回 `created_count: 1`
  - ✅ OUTPUT 显示更新后的数据

**步骤5：编辑数据（批量操作）**
- 节点类型：`edit_data`
- 配置：
  - 操作类型：`batch_create`
  - 数据路径：`Items.Item`
  - 条目数据（JSON数组）：
    ```json
    [
      {
        "@attributes": {
          "id": "test_bracer_1",
          "name": "{=test1}Test Bracer 1",
          "Type": "HandArmor",
          "weight": "1.5"
        }
      },
      {
        "@attributes": {
          "id": "test_bracer_2",
          "name": "{=test2}Test Bracer 2",
          "Type": "HandArmor",
          "weight": "1.6"
        }
      }
    ]
    ```
- 执行并验证：
  - ✅ 批量创建成功
  - ✅ 返回 `created_count: 2`
  - ✅ OUTPUT 显示更新后的数据

**步骤6：验证数据**
- 节点类型：`validate_data`
- 配置：
  - 必填字段：`["id", "name", "Type"]`
- 执行并验证：
  - ✅ 验证完成
  - ✅ 显示验证结果（通过/失败）
  - ✅ 显示错误和警告列表

**步骤7：导出文件**
- 节点类型：`export_file`
- 配置：
  - 导出格式：`xml`
  - 输出路径：`data/exports/test_output`
  - 格式化输出：`true`（开启）
  - 排序字段：`@attributes.id`（可选）
- 执行并验证：
  - ✅ 导出成功
  - ✅ 文件已下载或保存到 `data/exports/`
  - ✅ XML 格式化正确（缩进、换行）
  - ✅ 如果指定了排序，Item 按 id 排序

---

## 🔍 验证要点

### 1. analyze_xml_structure 验证

检查 OUTPUT 的 JSON 结果，应包含：
```json
{
  "business_domain": "游戏装备配置",
  "enum_fields": {
    "Type": ["HandArmor", "BodyArmor", "LegArmor"],
    "culture": ["Culture.aserai", "Culture.neutral_culture", "Culture.khuzait"],
    "modifier_group": ["leather", "plate", "cloth"],
    "material_type": ["Leather", "Plate", "Cloth"]
  },
  "numeric_ranges": {
    "weight": {"min": 0.1, "max": 4.2, "default": 1.0},
    "arm_armor": {"min": 6, "max": 24, "default": 10}
  },
  "field_relationships": [
    {
      "field1": "modifier_group",
      "field2": "material_type",
      "relation_type": "correspondence",
      "relation_rules": {
        "leather": "Leather",
        "plate": "Plate",
        "cloth": "Cloth"
      }
    }
  ],
  "required_fields": ["id", "name", "Type"],
  "optional_fields": ["is_merchandise", "difficulty"]
}
```

### 2. generate_editor_config 验证

检查 OUTPUT 的 JSON 结果，应包含：
```json
{
  "fields": [
    {
      "name": "Type",
      "label": "装备类型",
      "type": "select",
      "options": ["HandArmor", "BodyArmor", "LegArmor"],
      "default": "HandArmor",
      "required": true
    },
    {
      "name": "weight",
      "label": "重量",
      "type": "number",
      "validation": {"min": 0.1, "max": 10},
      "default": 1.0
    },
    {
      "name": "ItemComponent.Armor.material_type",
      "label": "材质类型",
      "type": "select",
      "options": ["Leather", "Plate", "Cloth"],
      "validation": {
        "depends_on": "ItemComponent.Armor.modifier_group",
        "rules": {"leather": "Leather", "plate": "Plate", "cloth": "Cloth"}
      }
    }
  ],
  "layout": {
    "sections": [
      {
        "title": "基础属性",
        "fields": ["id", "name", "Type", "culture", "weight"]
      },
      {
        "title": "护甲属性",
        "fields": ["ItemComponent.Armor.*"]
      }
    ]
  },
  "operations": ["create", "update", "delete", "batch_create", "batch_update", "batch_delete"]
}
```

### 3. edit_data 批量操作验证

- **batch_create**：
  - 输入：`item_data` 为数组
  - 输出：`created_count` 等于数组长度
  
- **batch_update**：
  - 输入：`filter_condition` 和 `item_data`
  - 输出：`updated_count` 等于匹配的条目数
  
- **batch_delete**：
  - 输入：`filter_condition`
  - 输出：`deleted_count` 等于匹配的条目数

### 4. export_file XML格式化验证

- **pretty_print=true**：
  - XML 文件应该有缩进和换行
  - 使用 Tab 缩进（与原始格式接近）
  
- **sort_by="@attributes.id"**：
  - Item 元素应该按照 id 属性排序

---

## 📝 测试清单

- [ ] 解析文件节点正常工作
- [ ] AI分析XML结构节点识别枚举值、数值范围、字段关联
- [ ] 生成编辑器配置节点生成下拉选项、验证规则、布局
- [ ] 单个编辑操作（create, update, delete）正常工作
- [ ] 批量编辑操作（batch_create, batch_update, batch_delete）正常工作
- [ ] 验证数据节点正常工作
- [ ] 导出文件节点支持XML格式化
- [ ] 导出文件节点支持排序
- [ ] 前端界面正确显示所有配置选项
- [ ] 前端界面正确显示执行结果

---

## 🐛 已知问题和注意事项

1. **AI模型响应**：
   - 如果 AI 模型响应较慢，可能需要等待较长时间
   - 如果 AI 模型无法访问，会返回错误

2. **批量操作**：
   - 批量操作时，`item_data` 必须是数组格式
   - 批量更新/删除时，`filter_condition` 必须能够匹配到条目

3. **XML格式化**：
   - 排序功能仅支持 XML 格式
   - 排序字段路径格式：`@attributes.id` 表示按 id 属性排序

---

## 🚀 下一步

完成测试后，可以：
1. 根据测试结果优化 AI 提示词
2. 根据测试结果优化前端界面
3. 添加更多测试用例
4. 实现动态编辑器界面（基于生成的配置）

---

**最后更新**：2025-01-XX  
**测试版本**：v1.0.0

