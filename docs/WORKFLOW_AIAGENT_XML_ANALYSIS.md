# 使用 AI Agent 节点分析 XML 结构

## 🎯 概述

使用 **AI Agent** 节点替代专门的 **Analyze XML Structure** 节点，通过一次性向 AI 模型提交分析请求，完成 XML 结构分析。

## 🔗 节点连接

```
┌─────────────┐
│ Parse File  │  解析 XML 文件
└──────┬──────┘
       │ [output] → [input]
       ▼
┌─────────────┐
│ AI Agent    │  AI 分析 XML 结构
│             │
│ [Chat Model]│ ← 必需连接
│   端口      │
└──────┬──────┘
       │ [output] → [input]
       ▼
┌─────────────────────┐
│ Generate Editor     │  生成编辑器配置
│ Config              │
└─────────────────────┘
```

## 📝 详细配置步骤

### 步骤 1：创建节点

1. **Parse File 节点**
   - 节点名称：`解析装备表`
   - 文件路径：`F:\xml\SkiOL_arm_armors.xml`

2. **Chat Model 节点**（ChatGPT/Gemini/DeepSeek 任选一个）
   - 节点名称：`ChatGPT 模型`
   - API Key：输入你的 API Key
   - API URL：`https://api.openai.com/v1/chat/completions`（ChatGPT）
   - 模型：`gpt-4o` 或 `gpt-4o-mini`

3. **AI Agent 节点**
   - 节点名称：`分析 XML 结构`

### 步骤 2：连接节点

```
Parse File [output] ──→ AI Agent [input]
ChatGPT [output] ──→ AI Agent [Chat Model 端口（底部）]
AI Agent [output] ──→ Generate Editor Config [input]
```

### 步骤 3：配置 AI Agent 节点

#### 基本配置

1. **系统提示词**（必填）：
```
你是一个专业的 XML 结构分析专家。请分析以下 XML 文件的结构：

要求：
1. 提取所有元素和属性
2. 识别数据类型（字符串、数字、布尔值、枚举）
3. 识别嵌套关系和层级
4. 识别重复元素（数组）
5. 提取字段约束（必填、可选、默认值）
6. 识别枚举值（如 culture、Type、material_type）

输出格式：JSON

输出结构要求（AI 需要返回以下格式的 JSON）：
```json
{
  "root_element": "Items",
  "structure": {
    "Items": {
      "type": "object",
      "children": {
        "Item": {
          "type": "array",
          "item_type": "object",
          "attributes": {
            "id": {
              "type": "string",
              "required": true,
              "description": "装备唯一标识符"
            },
            "name": {
              "type": "string",
              "required": true,
              "description": "装备名称"
            },
            "culture": {
              "type": "enum",
              "values": ["Culture.aserai", "Culture.neutral_culture", "Culture.khuzait"],
              "description": "文化类型"
            },
            "weight": {
              "type": "number",
              "required": true,
              "description": "装备重量"
            },
            "Type": {
              "type": "enum",
              "values": ["HandArmor"],
              "required": true,
              "description": "装备类型"
            }
          },
          "children": {
            "ItemComponent": {
              "type": "object",
              "children": {
                "Armor": {
                  "type": "object",
                  "attributes": {
                    "arm_armor": {
                      "type": "number",
                      "required": true,
                      "description": "护甲值"
                    },
                    "modifier_group": {
                      "type": "enum",
                      "values": ["leather", "plate", "cloth"],
                      "description": "修改器组"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "statistics": {
    "total_items": 30,
    "unique_cultures": 3,
    "unique_types": 1,
    "unique_materials": 3
  }
}
```

注意：系统会自动将符合此格式的 JSON 输出提取为 `analysis` 字段，供后续节点使用。

2. **任务目标**（可选）：
```
分析 XML 结构，提取所有字段、类型、枚举值和约束。
```

3. **输出格式**：`JSON`

#### 数据处理配置

4. **数据处理模式**：`smart`（智能采样）
   - 自动处理大数据，避免超过 Token 限制

5. **数据 Token 限制**：`4000`
   - 限制输入数据的 Token 数量

6. **采样策略**：`head_tail`（首尾采样）
   - 保留开头和结尾的数据，确保结构完整

#### Chat Model 连接

7. **连接 Chat Model 节点**：
   - 从 AI Agent 节点底部的 **Chat Model 端口（🤖）** 连接到 ChatGPT/Gemini/DeepSeek 节点
   - 系统会自动检测连接状态

### 步骤 4：配置 Chat Model 节点

**ChatGPT 节点配置**：
- API Key：`sk-...`（你的 OpenAI API Key）
- API URL：`https://api.openai.com/v1/chat/completions`
- 模型：`gpt-4o` 或 `gpt-4o-mini`
- Temperature：`0.7`
- Max Tokens：`4000`

**Gemini 节点配置**：
- API Key：你的 Google API Key
- API URL：`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`
- 模型：`gemini-pro`

**DeepSeek 节点配置**：
- API Key：你的 DeepSeek API Key
- API URL：`https://api.deepseek.com/v1/chat/completions`
- 模型：`deepseek-chat`

---

## 🚀 执行流程

1. **执行 Parse File 节点**
   - 点击"执行节点"按钮
   - 等待解析完成

2. **执行 Chat Model 节点**（如果未配置过）
   - 确保 API Key 正确
   - 测试连接

3. **执行 AI Agent 节点**
   - 点击"执行节点"按钮
   - AI Agent 会：
     - 自动获取 Parse File 的输出数据
     - 智能采样数据（避免超过 Token 限制）
     - 构建分析提示词
     - 调用 Chat Model 进行分析
     - 解析 JSON 输出
     - 保存分析结果

4. **查看分析结果**
   - 在 AI Agent 节点的 OUTPUT 面板查看
   - 结果包含：`analysis` 字段，包含完整的结构分析

5. **继续后续流程**
   - AI Agent 的输出会自动传递给 Generate Editor Config 节点

---

## 📊 输出结果格式

AI Agent 节点的输出格式（自动提取 analysis 字段）：

```json
{
  "hasData": true,
  "input_data": { /* 原始输入数据 */ },
  "ai_agent_output": "AI 生成的原始文本",
  "data": {
    "root_element": "Items",
    "structure": {
      // 完整的结构分析
    },
    "statistics": {
      "total_items": 30,
      "unique_cultures": 3
    }
  },
  "analysis": {  // ⭐ 自动提取，兼容 Generate Editor Config 节点
    "root_element": "Items",
    "structure": {
      // 完整的结构分析
    },
    "statistics": {
      "total_items": 30,
      "unique_cultures": 3
    }
  },
  "output_format": "json"
}
```

**重要**：系统会自动从 JSON 输出中提取 `analysis` 字段，确保与 Generate Editor Config 节点兼容。

---

## ✅ 优势

### 使用 AI Agent 的优势

1. **灵活性**：可以自定义系统提示词，调整分析重点
2. **通用性**：不局限于 XML，可以分析任意格式
3. **可扩展**：可以连接 Memory 和 Tool 节点增强功能
4. **模型选择**：可以选择不同的 AI 模型（ChatGPT/Gemini/DeepSeek）

### 与 Analyze XML Structure 的对比

| 特性 | AI Agent | Analyze XML Structure |
|------|----------|----------------------|
| 自定义提示词 | ✅ | ❌ |
| 模型选择 | ✅ | ❌ |
| Memory 支持 | ✅ | ❌ |
| Tool 支持 | ✅ | ❌ |
| 配置复杂度 | 中等 | 简单 |
| 需要连接 Chat Model | ✅ | ❌ |

---

## 🔧 高级配置

### 使用 Memory 节点（可选）

1. 添加 Memory 节点
2. 从 AI Agent 节点底部的 **Memory 端口（💾）** 连接
3. 在 AI Agent 配置中启用"启用记忆功能"
4. 分析结果会自动存储到 Memory

### 使用 Tool 节点（可选）

1. 添加 Tool 节点（如代码工具）
2. 从 AI Agent 节点底部的 **Tool 端口（🔧）** 连接
3. 在 AI Agent 配置中启用"启用工具功能"
4. AI 可以在分析过程中调用工具

---

## 📝 完整工作流示例

### 使用 AI Agent 的完整流程

```
1. Parse File
   └─> 文件路径：F:\xml\SkiOL_arm_armors.xml

2. ChatGPT (Chat Model)
   └─> API Key: sk-...
   └─> 模型: gpt-4o

3. AI Agent
   └─> 系统提示词：XML 结构分析专家
   └─> 输出格式：JSON
   └─> 连接：Parse File [input] + ChatGPT [Chat Model]
   └─> 输出：结构分析结果

4. Generate Editor Config
   └─> 输入：AI Agent 的分析结果
   └─> 输出：编辑器配置

5. Edit Data (可选)
   └─> 编辑数据

6. Export File
   └─> 导出为 XML
```

---

## 🎯 总结

使用 **AI Agent** 节点替代 **Analyze XML Structure** 节点：

- ✅ **更灵活**：可以自定义分析逻辑
- ✅ **更通用**：支持任意格式分析
- ✅ **可扩展**：支持 Memory 和 Tool
- ✅ **模型可选**：可以选择不同的 AI 模型

**配置要点**：
1. 连接 Parse File 节点（输入数据）
2. 连接 Chat Model 节点（必需，底部端口）
3. 配置系统提示词（XML 结构分析）
4. 设置输出格式为 JSON
5. 执行节点，获取分析结果

