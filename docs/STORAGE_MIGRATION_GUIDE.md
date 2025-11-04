# 工作流存储迁移指南

## 概述

本指南介绍如何在不同存储后端之间迁移工作流数据。

## 支持的迁移路径

- ✅ JSON → SQLite
- ✅ JSON → PostgreSQL/MySQL
- ✅ SQLite → PostgreSQL/MySQL
- ✅ 任意存储 → 任意存储（通过 `StorageMigrator`）

## 快速开始

### 方法1: 使用命令行工具

```bash
cd backend
python tools/migrate_workflows.py
```

然后按照提示选择迁移类型：
1. JSON -> SQLite
2. JSON -> PostgreSQL
3. SQLite -> PostgreSQL

### 方法2: 使用Python脚本

```python
import asyncio
from pathlib import Path
from backend.storage.migrate import migrate_from_json_to_sqlite

async def main():
    result = await migrate_from_json_to_sqlite(
        json_path=Path("data/workflows.json"),
        sqlite_path=Path("data/structforge.db")
    )
    print(f"迁移完成: {result['migrated']}/{result['total']} 成功")

asyncio.run(main())
```

### 方法3: 使用存储工厂和迁移器

```python
from backend.storage import get_storage, reset_storage
from backend.storage.migrate import StorageMigrator

# 切换到源存储
reset_storage()
source = get_storage("json")  # 或指定 storage_type

# 切换到目标存储
reset_storage()
target = get_storage("sqlite")  # 或指定 storage_type

# 执行迁移
migrator = StorageMigrator(source, target)
result = await migrator.migrate()

# 验证迁移结果
verify_result = await migrator.verify()
```

## 详细迁移步骤

### JSON → SQLite

1. **准备环境**
   ```bash
   # 确保已安装依赖
   pip install sqlalchemy aiosqlite
   ```

2. **执行迁移**
   ```python
   from backend.storage.migrate import migrate_from_json_to_sqlite
   from pathlib import Path
   
   result = await migrate_from_json_to_sqlite(
       json_path=Path("data/workflows.json"),
       sqlite_path=Path("data/structforge.db")
   )
   ```

3. **验证结果**
   ```python
   # 迁移工具会自动验证，也可以手动验证
   from backend.storage.json_storage import JSONStorage
   from backend.storage.sqlite_storage import SQLiteStorage
   
   source = JSONStorage(Path("data/workflows.json"))
   target = SQLiteStorage(Path("data/structforge.db"))
   
   migrator = StorageMigrator(source, target)
   verify_result = await migrator.verify()
   ```

### JSON → PostgreSQL

1. **准备环境**
   ```bash
   # 安装PostgreSQL驱动
   pip install psycopg2-binary sqlalchemy
   ```

2. **配置数据库**
   ```python
   database_url = "postgresql://user:password@localhost:5432/structforge"
   ```

3. **执行迁移**
   ```python
   from backend.storage.migrate import migrate_from_json_to_sql
   
   result = await migrate_from_json_to_sql(
       json_path=Path("data/workflows.json"),
       database_url="postgresql://user:password@localhost:5432/structforge"
   )
   ```

### SQLite → PostgreSQL

1. **准备环境**
   ```bash
   pip install psycopg2-binary sqlalchemy
   ```

2. **执行迁移**
   ```python
   from backend.storage.migrate import migrate_from_sqlite_to_sql
   
   result = await migrate_from_sqlite_to_sql(
       sqlite_path=Path("data/structforge.db"),
       database_url="postgresql://user:password@localhost:5432/structforge"
   )
   ```

## 迁移结果说明

迁移工具返回的结果包含以下信息：

```python
{
    "total": 10,           # 总工作流数
    "migrated": 8,         # 成功迁移数
    "failed": 1,          # 失败数
    "skipped": 1,         # 跳过数（已存在）
    "errors": [...],       # 错误列表
    "verification": {      # 验证结果
        "total": 10,
        "verified": 8,
        "failed": 2,
        "errors": [...]
    },
    "timestamp": "2024-01-01T12:00:00"
}
```

## 注意事项

1. **备份数据**: 迁移前务必备份原始数据
2. **验证结果**: 迁移后务必验证数据完整性
3. **并发访问**: 迁移期间建议停止应用服务
4. **大文件**: 对于大量工作流，建议分批迁移
5. **网络**: PostgreSQL/MySQL迁移需要稳定的网络连接

## 故障排除

### 问题1: 迁移失败

**原因**: 可能是目标存储已存在同名工作流

**解决**: 
- 使用 `--workflow-ids` 参数只迁移特定工作流
- 或先清理目标存储中的冲突数据

### 问题2: PostgreSQL连接失败

**原因**: 数据库连接URL错误或数据库服务未启动

**解决**:
- 检查数据库服务状态
- 验证连接URL格式: `postgresql://user:password@host:port/dbname`
- 检查防火墙和网络设置

### 问题3: 数据验证失败

**原因**: 数据在迁移过程中损坏

**解决**:
- 检查错误日志
- 重新执行迁移
- 检查源数据完整性

## 最佳实践

1. **测试环境先行**: 先在测试环境验证迁移流程
2. **分批迁移**: 对于大量数据，分批迁移更安全
3. **监控进度**: 使用日志监控迁移进度
4. **回滚计划**: 准备回滚方案以防万一
5. **验证数据**: 迁移后全面验证数据完整性

## 示例：完整迁移流程

```python
import asyncio
from pathlib import Path
from backend.storage.migrate import migrate_from_json_to_sqlite
from backend.core.logging_config import logger

async def migrate_workflows():
    """完整的迁移流程"""
    
    # 1. 准备路径
    json_path = Path("data/workflows.json")
    sqlite_path = Path("data/structforge.db")
    
    # 2. 检查源文件
    if not json_path.exists():
        logger.error(f"源文件不存在: {json_path}")
        return
    
    # 3. 执行迁移
    logger.info("开始迁移工作流数据...")
    try:
        result = await migrate_from_json_to_sqlite(json_path, sqlite_path)
        
        # 4. 检查结果
        if result["failed"] > 0:
            logger.warning(f"迁移完成，但有 {result['failed']} 个失败")
            for error in result["errors"]:
                logger.error(error)
        else:
            logger.info(f"迁移成功: {result['migrated']}/{result['total']}")
        
        # 5. 验证结果
        if result.get("verification"):
            verify = result["verification"]
            if verify["failed"] > 0:
                logger.warning(f"验证失败: {verify['failed']} 个工作流")
            else:
                logger.info("验证通过: 所有工作流数据正确")
        
    except Exception as e:
        logger.error(f"迁移失败: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    asyncio.run(migrate_workflows())
```

