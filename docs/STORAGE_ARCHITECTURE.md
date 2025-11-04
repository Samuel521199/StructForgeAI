# 工作流存储架构设计

## 概述

StructForge AI 采用**可插拔存储架构**，支持多种存储后端，可以根据项目规模灵活选择：

- **内存存储** (`memory`) - 快速原型、开发测试
- **JSON文件存储** (`json`) - 小型项目、单机部署
- **SQLite数据库** (`sqlite`) - 中小型项目、单文件数据库
- **PostgreSQL/MySQL** (`postgresql`/`mysql`) - 大型项目、生产环境（待实现）

## 架构设计

### 1. 抽象接口层

所有存储后端都实现 `WorkflowStorage` 抽象基类，提供统一的接口：

```python
class WorkflowStorage(ABC):
    async def save(workflow_id, workflow_data) -> Dict
    async def load(workflow_id) -> Optional[Dict]
    async def delete(workflow_id) -> bool
    async def list_all() -> List[Dict]
    async def exists(workflow_id) -> bool
    async def update_active(workflow_id, is_active) -> bool
```

### 2. 存储后端实现

#### 内存存储 (`MemoryStorage`)
- **用途**: 快速原型、开发测试
- **特点**: 数据不持久化，服务器重启后丢失
- **适用场景**: 
  - 开发环境快速测试
  - 临时工作流
  - 演示和教学

#### JSON文件存储 (`JSONStorage`)
- **用途**: 小型项目、单机部署
- **特点**: 
  - 数据持久化到 JSON 文件
  - 易于备份和迁移
  - 支持多进程（通过文件锁）
- **适用场景**:
  - 个人项目
  - 小型团队
  - 开发环境
  - 数据量 < 1000 个工作流

#### SQLite数据库存储 (`SQLiteStorage`)
- **用途**: 中小型项目
- **特点**:
  - 单文件数据库，易于部署
  - 支持事务和并发
  - 性能优于 JSON 文件
- **适用场景**:
  - 中小型企业
  - 单机部署
  - 数据量 < 10万 个工作流
  - 需要事务支持

#### PostgreSQL/MySQL 存储 (`SQLStorage`)
- **用途**: 大型项目、生产环境
- **特点**:
  - 高性能、高并发
  - 支持复杂查询
  - 集群部署
  - 使用 SQLAlchemy ORM
- **适用场景**:
  - 大型企业
  - 多用户并发
  - 数据量 > 10万 个工作流
  - 需要高可用性
- **依赖安装**:
  ```bash
  # PostgreSQL
  pip install psycopg2-binary
  
  # MySQL
  pip install pymysql
  ```

## 配置

在 `backend/core/config.py` 中配置存储类型：

```python
WORKFLOW_STORAGE_TYPE: str = "json"  # memory, json, sqlite, postgresql, mysql
WORKFLOW_STORAGE_PATH: str = ""  # 可选：指定存储路径
```

或通过环境变量 `.env` 文件：

```env
WORKFLOW_STORAGE_TYPE=json
WORKFLOW_STORAGE_PATH=data/workflows.json
```

## 使用示例

### 切换存储后端

1. **JSON 存储**（默认）:
   ```env
   WORKFLOW_STORAGE_TYPE=json
   ```

2. **SQLite 存储**:
   ```env
   WORKFLOW_STORAGE_TYPE=sqlite
   DATABASE_URL=sqlite:///data/structforge.db
   ```

3. **内存存储**（仅测试）:
   ```env
   WORKFLOW_STORAGE_TYPE=memory
   ```

### 在代码中使用

```python
from storage import get_storage

# 获取存储实例（自动根据配置选择）
storage = get_storage()

# 保存工作流
await storage.save("workflow_1", {
    "nodes": [...],
    "edges": [...],
    "name": "我的工作流",
    "description": "工作流描述",
    "is_active": True
})

# 加载工作流
workflow = await storage.load("workflow_1")

# 列出所有工作流
workflows = await storage.list_all()
```

## 数据迁移

### 使用迁移工具

#### 命令行工具

```bash
# 运行迁移工具
python backend/tools/migrate_workflows.py

# 或使用Python模块
python -m backend.storage.migrate --source-type json --target-type sqlite
```

#### 编程方式

```python
from backend.storage.migrate import (
    migrate_from_json_to_sqlite,
    migrate_from_json_to_sql,
    migrate_from_sqlite_to_sql,
    StorageMigrator
)
from backend.storage.json_storage import JSONStorage
from backend.storage.sqlite_storage import SQLiteStorage
from backend.storage.sql_storage import SQLStorage

# JSON -> SQLite
result = await migrate_from_json_to_sqlite(
    json_path=Path("data/workflows.json"),
    sqlite_path=Path("data/structforge.db")
)

# JSON -> PostgreSQL
result = await migrate_from_json_to_sql(
    json_path=Path("data/workflows.json"),
    database_url="postgresql://user:password@localhost/dbname"
)

# SQLite -> PostgreSQL
result = await migrate_from_sqlite_to_sql(
    sqlite_path=Path("data/structforge.db"),
    database_url="postgresql://user:password@localhost/dbname"
)

# 自定义迁移
source = JSONStorage(Path("data/workflows.json"))
target = SQLiteStorage(Path("data/structforge.db"))
migrator = StorageMigrator(source, target)
result = await migrator.migrate()  # 迁移所有工作流
result = await migrator.migrate(["workflow_1", "workflow_2"])  # 迁移指定工作流
verify_result = await migrator.verify()  # 验证迁移结果
```

## 扩展存储后端

要实现新的存储后端，只需：

1. 继承 `WorkflowStorage` 基类
2. 实现所有抽象方法
3. 在 `storage/factory.py` 中注册

示例：

```python
from storage.base import WorkflowStorage

class PostgreSQLStorage(WorkflowStorage):
    def __init__(self, connection_string: str):
        # 初始化数据库连接
        pass
    
    async def save(self, workflow_id: str, workflow_data: Dict[str, Any]):
        # 实现保存逻辑
        pass
    
    # ... 实现其他方法
```

## 性能对比

| 存储类型 | 读取速度 | 写入速度 | 并发支持 | 数据持久化 |
|---------|---------|---------|---------|-----------|
| Memory  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ |
| JSON    | ⭐⭐ | ⭐⭐ | ⭐ | ✅ |
| SQLite  | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ |
| PostgreSQL | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ |

## 最佳实践

1. **开发环境**: 使用 `memory` 或 `json`
2. **测试环境**: 使用 `json` 或 `sqlite`
3. **生产环境**: 使用 `sqlite`（中小型）或 `postgresql`（大型）
4. **数据备份**: JSON 和 SQLite 可以直接备份文件
5. **迁移**: 从小规模存储开始，随需求增长迁移到更强大的存储

## 注意事项

1. **内存存储**: 数据不持久化，仅用于开发测试
2. **JSON 存储**: 多进程环境下需要文件锁（已实现）
3. **SQLite 存储**: 并发写入性能有限，不适合高并发场景
4. **PostgreSQL/MySQL**: 需要额外的数据库服务器，部署复杂度更高

