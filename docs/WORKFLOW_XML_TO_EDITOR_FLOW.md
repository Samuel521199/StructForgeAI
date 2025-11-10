# XML 转编辑器完整工作流 - 流程简述

## 📋 所有用到的节点

### 核心节点（5个）

1. **Parse File（解析文件）**
   - 功能：解析 XML 文件为结构化数据
   - 输入：XML 文件路径
   - 输出：结构化数据 + Schema

2. **AI Agent（AI 代理）** ⭐ 推荐替代 Analyze XML Structure
   - 功能：一次性向 AI 模型提交分析请求，分析 XML 结构、字段类型、枚举值
   - 输入：解析后的数据
   - 输出：结构分析结果（JSON 格式）
   - **必需连接**：Chat Model 节点（ChatGPT/Gemini/DeepSeek）

3. **Generate Editor Config（生成编辑器配置）**
   - 功能：根据结构分析生成编辑器配置
   - 输入：结构分析结果（来自 AI Agent）
   - 输出：编辑器配置 JSON

4. **Edit Data（编辑数据）**
   - 功能：创建、修改、删除数据条目
   - 输入：解析后的数据
   - 输出：编辑后的数据

5. **Export File（导出文件）**
   - 功能：将数据导出为 XML 文件
   - 输入：编辑后的数据
   - 输出：XML 文件下载

### 替代方案节点

- **Analyze XML Structure（分析 XML 结构）** - 可用 AI Agent 替代

### 可选优化节点

6. **GPT Agent（GPT 代理）** - 优化编辑器配置
7. **Validate Data（验证数据）** - 数据验证
8. **Filter Data（过滤数据）** - 数据筛选

---

## 🔗 完整工作流连接

### 标准流程（生成编辑器配置）- 使用 AI Agent

```
Parse File → AI Agent → Generate Editor Config
            ↑
        Chat Model (必需连接)
```

### 完整编辑流程（生成配置 + 编辑 + 保存）

```
Parse File ──┬──→ AI Agent → Generate Editor Config
             │      ↑
             │   Chat Model
             │
             └──→ Edit Data → Export File
```

### 使用 GPT Agent（替代 AI Agent）

```
Parse File → GPT Agent → Generate Editor Config → Export File
```

**注意**：GPT Agent 内置 API 配置，不需要连接 Chat Model 节点

---

## 📝 节点配置要点

### 1. Parse File
- **文件路径**：`F:\xml\SkiOL_arm_armors.xml`
- **格式**：XML
- **跳过 Schema**：❌（保留 Schema）

### 2. AI Agent（替代 Analyze XML Structure）

**节点连接**：
- **Input**：连接到 Parse File 节点的输出
- **Chat Model**（底部端口，必需）：连接到 ChatGPT/Gemini/DeepSeek 节点

**节点配置**：
- **系统提示词**：
```
你是一个专业的 XML 结构分析专家。请分析以下 XML 文件的结构：

1. 提取所有元素和属性
2. 识别数据类型（字符串、数字、布尔值、枚举）
3. 识别嵌套关系和层级
4. 识别重复元素（数组）
5. 提取字段约束（必填、可选、默认值）
6. 识别枚举值（如 culture、Type、material_type）

请生成详细的 Schema 分析报告，输出格式为 JSON。
```

- **任务目标**（可选）：
```
分析 XML 结构，提取字段类型、枚举值、嵌套关系和约束。
```

- **输出格式**：`JSON`
- **数据处理模式**：`smart`（智能采样）
- **数据 Token 限制**：`4000`（避免超过 API 限制）

**Chat Model 节点配置**（必需连接）：
- 选择 ChatGPT、Gemini 或 DeepSeek 节点
- 配置 API Key 和 API URL
- 从 AI Agent 节点底部 Chat Model 端口连接

### 3. Generate Editor Config
- **编辑器类型**：表单编辑器
- **布局模式**：主列表 + 详情编辑
- **输入**：使用 AI Agent 输出的分析结果

### 4. Edit Data
- **操作类型**：`create` / `update` / `delete` / `batch_*`
- **数据路径**：`Items.Item[0]` 或 `Items.Item`
- **新数据**：JSON 格式

### 5. Export File
- **输出格式**：XML
- **格式化输出**：✅
- **排序字段**：`@attributes.id`（可选）

---

## ✅ 功能完整性

- ✅ **识别**：Parse File 节点
- ✅ **分析**：Analyze XML Structure 节点
- ✅ **生成编辑器**：Generate Editor Config 节点
- ✅ **编辑**：Edit Data 节点
- ✅ **修改**：Edit Data 节点（update 操作）
- ✅ **保存**：Export File 节点

**结论**：所有功能已完整实现！

