#!/usr/bin/env python
"""
工作流存储迁移工具 - 命令行界面
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import asyncio
from backend.storage.migrate import (
    migrate_from_json_to_sqlite,
    migrate_from_json_to_sql,
    migrate_from_sqlite_to_sql,
    StorageMigrator
)
from backend.storage.memory import MemoryStorage
from backend.storage.json_storage import JSONStorage
from backend.storage.sqlite_storage import SQLiteStorage
from backend.storage.sql_storage import SQLStorage
from backend.core.config import PROJECT_ROOT, settings
from backend.core.logging_config import logger


async def migrate_json_to_sqlite():
    """从JSON迁移到SQLite"""
    print("=" * 60)
    print("工作流存储迁移: JSON -> SQLite")
    print("=" * 60)
    
    json_path = PROJECT_ROOT / "data" / "workflows.json"
    sqlite_path = PROJECT_ROOT / "data" / "structforge.db"
    
    print(f"源: {json_path}")
    print(f"目标: {sqlite_path}")
    print()
    
    if not json_path.exists():
        print(f"错误: JSON文件不存在: {json_path}")
        return
    
    try:
        result = await migrate_from_json_to_sqlite(json_path, sqlite_path)
        print_result(result)
    except Exception as e:
        print(f"迁移失败: {e}")
        logger.error(f"迁移失败: {e}", exc_info=True)


async def migrate_json_to_postgresql():
    """从JSON迁移到PostgreSQL"""
    print("=" * 60)
    print("工作流存储迁移: JSON -> PostgreSQL")
    print("=" * 60)
    
    json_path = PROJECT_ROOT / "data" / "workflows.json"
    database_url = input("请输入PostgreSQL连接URL (例如: postgresql://user:password@localhost/dbname): ").strip()
    
    if not database_url:
        print("错误: 数据库连接URL不能为空")
        return
    
    print(f"源: {json_path}")
    print(f"目标: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    print()
    
    if not json_path.exists():
        print(f"错误: JSON文件不存在: {json_path}")
        return
    
    try:
        result = await migrate_from_json_to_sql(json_path, database_url)
        print_result(result)
    except Exception as e:
        print(f"迁移失败: {e}")
        logger.error(f"迁移失败: {e}", exc_info=True)


async def migrate_sqlite_to_postgresql():
    """从SQLite迁移到PostgreSQL"""
    print("=" * 60)
    print("工作流存储迁移: SQLite -> PostgreSQL")
    print("=" * 60)
    
    sqlite_path = PROJECT_ROOT / "data" / "structforge.db"
    database_url = input("请输入PostgreSQL连接URL (例如: postgresql://user:password@localhost/dbname): ").strip()
    
    if not database_url:
        print("错误: 数据库连接URL不能为空")
        return
    
    print(f"源: {sqlite_path}")
    print(f"目标: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    print()
    
    if not sqlite_path.exists():
        print(f"错误: SQLite数据库不存在: {sqlite_path}")
        return
    
    try:
        result = await migrate_from_sqlite_to_sql(sqlite_path, database_url)
        print_result(result)
    except Exception as e:
        print(f"迁移失败: {e}")
        logger.error(f"迁移失败: {e}", exc_info=True)


def print_result(result: dict):
    """打印迁移结果"""
    print("\n" + "=" * 60)
    print("迁移结果")
    print("=" * 60)
    print(f"总计: {result['total']}")
    print(f"成功: {result['migrated']}")
    print(f"失败: {result['failed']}")
    print(f"跳过: {result['skipped']}")
    
    if result.get('verification'):
        verify = result['verification']
        print(f"\n验证结果:")
        print(f"  通过: {verify['verified']}")
        print(f"  失败: {verify['failed']}")
    
    if result['errors']:
        print(f"\n错误列表:")
        for error in result['errors'][:10]:  # 只显示前10个错误
            print(f"  - {error}")
        if len(result['errors']) > 10:
            print(f"  ... 还有 {len(result['errors']) - 10} 个错误")


def main():
    """主函数"""
    print("\n工作流存储迁移工具")
    print("=" * 60)
    print("1. JSON -> SQLite")
    print("2. JSON -> PostgreSQL")
    print("3. SQLite -> PostgreSQL")
    print("0. 退出")
    print("=" * 60)
    
    choice = input("\n请选择迁移类型 (0-3): ").strip()
    
    if choice == "1":
        asyncio.run(migrate_json_to_sqlite())
    elif choice == "2":
        asyncio.run(migrate_json_to_postgresql())
    elif choice == "3":
        asyncio.run(migrate_sqlite_to_postgresql())
    elif choice == "0":
        print("退出")
    else:
        print("无效的选择")


if __name__ == "__main__":
    main()

