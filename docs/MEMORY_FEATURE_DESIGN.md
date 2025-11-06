# Memory 功能设计文档

## 一、Memory 的作用

在 AI Agent 工作流中，Memory（记忆）功能用于在多个对话轮次或工作流执行之间保持上下文信息。主要作用包括：

### 1.1 对话上下文保持
- **短期记忆**：在同一工作流执行过程中，保持对话历史
- **长期记忆**：跨工作流执行，记住之前的交互和结果

### 1.2 数据关联性
- **工作流状态记忆**：记住之前处理的文件、分析结果、配置选择
- **用户偏好记忆**：记住用户常用的配置、操作习惯
- **错误恢复记忆**：记住之前的错误和处理方式

### 1.3 智能决策支持
- **历史经验**：基于之前的工作流执行结果，优化当前决策
- **上下文理解**：理解当前操作在整个工作流中的位置和作用

## 二、Memory 的实现方式建议

### 2.1 方案一：基于向量数据库（推荐）

**优点**：
- 支持语义搜索，可以找到相似的历史记录
- 存储容量大，支持长期记忆
- 可以关联多个上下文片段

**实现**：
```python
# 存储格式
{
  "session_id": "workflow_123",
  "timestamp": "2024-01-01T10:00:00",
  "content": "用户选择了XML文件，AI分析结果：字段类型为整数，取值范围0-100",
  "embedding": [...],  # 向量嵌入
  "metadata": {
    "node_type": "analyze_xml_structure",
    "file_path": "data/uploads/file.xml",
    "tags": ["xml", "analysis", "structure"]
  }
}
```

**使用场景**：
- 查找相似的历史工作流执行
- 基于历史结果优化当前分析
- 跨会话记忆

### 2.2 方案二：基于键值存储（简单快速）

**优点**：
- 实现简单，查询快速
- 适合短期记忆和简单场景

**实现**：
```python
# 存储格式
{
  "workflow_id": "workflow_123",
  "node_id": "node_456",
  "key": "last_analysis_result",
  "value": {
    "xml_structure": {...},
    "timestamp": "2024-01-01T10:00:00"
  },
  "ttl": 3600  # 过期时间（秒）
}
```

**使用场景**：
- 节点间的数据传递
- 工作流执行过程中的状态保持
- 临时数据缓存

### 2.3 方案三：混合方案（最佳实践）

结合两种方案：
- **短期记忆**：使用键值存储（Redis 或内存）
- **长期记忆**：使用向量数据库（ChromaDB/FAISS）
- **元数据**：使用 SQLite 存储关系型数据

## 三、Memory 节点设计建议

### 3.1 Memory 节点类型

#### 类型一：Workflow Memory（工作流记忆）
- **作用**：存储整个工作流的执行状态和结果
- **存储内容**：
  - 工作流执行历史
  - 节点执行结果
  - 用户配置选择
- **生命周期**：与工作流绑定，可手动清除

#### 类型二：Session Memory（会话记忆）
- **作用**：存储当前会话的对话历史
- **存储内容**：
  - AI Agent 的对话历史
  - 用户指令历史
  - 执行结果摘要
- **生命周期**：会话结束时自动清除或保存

#### 类型三：Global Memory（全局记忆）
- **作用**：跨工作流的全局记忆
- **存储内容**：
  - 用户偏好设置
  - 常用配置模板
  - 历史成功案例
- **生命周期**：持久化存储，长期保存

### 3.2 Memory 节点配置

```typescript
interface MemoryConfig {
  memory_type: 'workflow' | 'session' | 'global'
  storage_type: 'vector' | 'keyvalue' | 'hybrid'
  max_entries: number  // 最大条目数
  ttl?: number  // 过期时间（秒）
  enable_embedding: boolean  // 是否启用向量嵌入
  retrieval_strategy: 'similarity' | 'recent' | 'relevance'  // 检索策略
}
```

### 3.3 Memory 节点操作

1. **存储（Store）**：保存当前上下文信息
2. **检索（Retrieve）**：根据查询获取相关记忆
3. **更新（Update）**：更新已有记忆
4. **清除（Clear）**：清除指定范围的记忆
5. **搜索（Search）**：语义搜索相关记忆

## 四、实现建议

### 4.1 第一阶段：简单实现

先实现基于 SQLite 的键值存储：
- 存储结构简单
- 查询快速
- 易于调试和维护

### 4.2 第二阶段：增强功能

添加向量数据库支持：
- 语义搜索
- 相似度匹配
- 上下文关联

### 4.3 第三阶段：高级功能

- 记忆压缩和摘要
- 自动记忆管理（LRU、TTL）
- 记忆关联图谱
- 记忆可视化

## 五、使用示例

### 5.1 在工作流中使用 Memory

```
解析文件 → AI分析XML结构 → Memory（存储分析结果）
                                      ↓
智能编辑 ← Memory（检索历史分析结果）→ 生成编辑器配置
```

### 5.2 Memory 节点配置示例

```json
{
  "memory_type": "workflow",
  "storage_type": "hybrid",
  "max_entries": 100,
  "enable_embedding": true,
  "retrieval_strategy": "similarity",
  "store_on": ["analyze_xml_structure", "generate_editor_config"],
  "retrieve_on": ["smart_edit"]
}
```

## 六、总结

Memory 功能是 AI Agent 工作流中的重要组件，建议：
1. **先实现简单版本**：基于 SQLite 的键值存储
2. **逐步增强**：添加向量数据库和语义搜索
3. **灵活配置**：支持多种 Memory 类型和存储策略
4. **易于使用**：提供简单的 API 和工作流集成

