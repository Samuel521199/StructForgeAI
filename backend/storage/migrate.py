"""
工作流存储迁移工具
支持在不同存储后端之间迁移数据
"""
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from storage.base import WorkflowStorage
from storage.memory import MemoryStorage
from storage.json_storage import JSONStorage
from storage.sqlite_storage import SQLiteStorage
from storage.sql_storage import SQLStorage
from storage.factory import StorageType
from core.logging_config import logger


class StorageMigrator:
    """存储迁移工具"""
    
    def __init__(self, source: WorkflowStorage, target: WorkflowStorage):
        """
        初始化迁移工具
        
        Args:
            source: 源存储后端
            target: 目标存储后端
        """
        self.source = source
        self.target = target
    
    async def migrate(self, workflow_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        迁移工作流数据
        
        Args:
            workflow_ids: 要迁移的工作流ID列表，如果为None则迁移所有工作流
            
        Returns:
            迁移结果统计
        """
        logger.info(f"开始迁移工作流数据...")
        
        # 获取要迁移的工作流列表
        if workflow_ids is None:
            source_workflows = await self.source.list_all()
            workflow_ids = [w["workflow_id"] for w in source_workflows]
        
        migrated_count = 0
        failed_count = 0
        skipped_count = 0
        errors = []
        
        for workflow_id in workflow_ids:
            try:
                # 检查目标存储中是否已存在
                if await self.target.exists(workflow_id):
                    logger.warning(f"工作流 {workflow_id} 在目标存储中已存在，跳过")
                    skipped_count += 1
                    continue
                
                # 从源存储加载
                workflow_data = await self.source.load(workflow_id)
                if workflow_data is None:
                    logger.warning(f"工作流 {workflow_id} 在源存储中不存在，跳过")
                    skipped_count += 1
                    continue
                
                # 获取完整的工作流信息（包括元数据）
                source_workflows = await self.source.list_all()
                workflow_info = next(
                    (w for w in source_workflows if w["workflow_id"] == workflow_id),
                    None
                )
                
                if workflow_info:
                    # 合并元数据
                    workflow_data.update({
                        "name": workflow_info.get("name", workflow_id),
                        "description": workflow_info.get("description", ""),
                        "is_active": workflow_info.get("is_active", False),
                    })
                
                # 保存到目标存储
                await self.target.save(workflow_id, workflow_data)
                migrated_count += 1
                logger.info(f"已迁移工作流: {workflow_id}")
                
            except Exception as e:
                failed_count += 1
                error_msg = f"迁移工作流 {workflow_id} 失败: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
        
        result = {
            "total": len(workflow_ids),
            "migrated": migrated_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"迁移完成: 总计={result['total']}, 成功={result['migrated']}, "
                   f"失败={result['failed']}, 跳过={result['skipped']}")
        
        return result
    
    async def verify(self, workflow_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        验证迁移结果
        
        Args:
            workflow_ids: 要验证的工作流ID列表，如果为None则验证所有工作流
            
        Returns:
            验证结果
        """
        logger.info("开始验证迁移结果...")
        
        if workflow_ids is None:
            source_workflows = await self.source.list_all()
            workflow_ids = [w["workflow_id"] for w in source_workflows]
        
        verified_count = 0
        failed_count = 0
        errors = []
        
        for workflow_id in workflow_ids:
            try:
                source_data = await self.source.load(workflow_id)
                target_data = await self.target.load(workflow_id)
                
                if source_data is None:
                    continue  # 跳过不存在的
                
                if target_data is None:
                    failed_count += 1
                    errors.append(f"工作流 {workflow_id} 在目标存储中不存在")
                    continue
                
                # 比较关键字段
                if (source_data.get("nodes") == target_data.get("nodes") and
                    source_data.get("edges") == target_data.get("edges") and
                    source_data.get("name") == target_data.get("name")):
                    verified_count += 1
                else:
                    failed_count += 1
                    errors.append(f"工作流 {workflow_id} 数据不匹配")
                    
            except Exception as e:
                failed_count += 1
                error_msg = f"验证工作流 {workflow_id} 失败: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
        
        result = {
            "total": len(workflow_ids),
            "verified": verified_count,
            "failed": failed_count,
            "errors": errors,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"验证完成: 总计={result['total']}, 通过={result['verified']}, "
                   f"失败={result['failed']}")
        
        return result


async def migrate_from_json_to_sqlite(
    json_path: Optional[Path] = None,
    sqlite_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    从JSON文件迁移到SQLite数据库
    
    Args:
        json_path: JSON文件路径
        sqlite_path: SQLite数据库路径
        
    Returns:
        迁移结果
    """
    if json_path is None:
        from core.config import PROJECT_ROOT
        json_path = PROJECT_ROOT / "data" / "workflows.json"
    
    if sqlite_path is None:
        from core.config import PROJECT_ROOT, settings
        db_url = settings.DATABASE_URL
        if db_url.startswith("sqlite:///"):
            sqlite_path = Path(db_url.replace("sqlite:///", ""))
        else:
            sqlite_path = PROJECT_ROOT / "data" / "structforge.db"
    
    source = JSONStorage(json_path)
    target = SQLiteStorage(sqlite_path)
    
    migrator = StorageMigrator(source, target)
    result = await migrator.migrate()
    
    # 验证迁移结果
    verify_result = await migrator.verify()
    result["verification"] = verify_result
    
    return result


async def migrate_from_json_to_sql(
    json_path: Optional[Path] = None,
    database_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    从JSON文件迁移到PostgreSQL/MySQL数据库
    
    Args:
        json_path: JSON文件路径
        database_url: 数据库连接URL
        
    Returns:
        迁移结果
    """
    if json_path is None:
        from core.config import PROJECT_ROOT
        json_path = PROJECT_ROOT / "data" / "workflows.json"
    
    if database_url is None:
        from core.config import settings
        database_url = settings.DATABASE_URL
    
    source = JSONStorage(json_path)
    target = SQLStorage(database_url)
    
    migrator = StorageMigrator(source, target)
    result = await migrator.migrate()
    
    # 验证迁移结果
    verify_result = await migrator.verify()
    result["verification"] = verify_result
    
    return result


async def migrate_from_sqlite_to_sql(
    sqlite_path: Optional[Path] = None,
    database_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    从SQLite数据库迁移到PostgreSQL/MySQL数据库
    
    Args:
        sqlite_path: SQLite数据库路径
        database_url: 数据库连接URL
        
    Returns:
        迁移结果
    """
    if sqlite_path is None:
        from core.config import PROJECT_ROOT, settings
        db_url = settings.DATABASE_URL
        if db_url.startswith("sqlite:///"):
            sqlite_path = Path(db_url.replace("sqlite:///", ""))
        else:
            sqlite_path = PROJECT_ROOT / "data" / "structforge.db"
    
    if database_url is None:
        from core.config import settings
        database_url = settings.DATABASE_URL
    
    source = SQLiteStorage(sqlite_path)
    target = SQLStorage(database_url)
    
    migrator = StorageMigrator(source, target)
    result = await migrator.migrate()
    
    # 验证迁移结果
    verify_result = await migrator.verify()
    result["verification"] = verify_result
    
    return result


# CLI工具入口
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="工作流存储迁移工具")
    parser.add_argument(
        "--source-type",
        type=str,
        choices=["json", "sqlite", "postgresql", "mysql"],
        required=True,
        help="源存储类型"
    )
    parser.add_argument(
        "--target-type",
        type=str,
        choices=["json", "sqlite", "postgresql", "mysql"],
        required=True,
        help="目标存储类型"
    )
    parser.add_argument(
        "--source-path",
        type=str,
        help="源存储路径（JSON文件或SQLite数据库）"
    )
    parser.add_argument(
        "--target-path",
        type=str,
        help="目标存储路径（JSON文件、SQLite数据库或数据库连接URL）"
    )
    parser.add_argument(
        "--workflow-ids",
        type=str,
        nargs="+",
        help="要迁移的工作流ID列表（可选，默认迁移所有）"
    )
    
    args = parser.parse_args()
    
    async def main():
        # 创建源存储
        if args.source_type == "json":
            source_path = Path(args.source_path) if args.source_path else None
            source = JSONStorage(source_path)
        elif args.source_type == "sqlite":
            source_path = Path(args.source_path) if args.source_path else None
            source = SQLiteStorage(source_path)
        elif args.source_type in ("postgresql", "mysql"):
            source = SQLStorage(args.source_path or args.target_path)
        else:
            raise ValueError(f"不支持的源存储类型: {args.source_type}")
        
        # 创建目标存储
        if args.target_type == "json":
            target_path = Path(args.target_path) if args.target_path else None
            target = JSONStorage(target_path)
        elif args.target_type == "sqlite":
            target_path = Path(args.target_path) if args.target_path else None
            target = SQLiteStorage(target_path)
        elif args.target_type in ("postgresql", "mysql"):
            target = SQLStorage(args.target_path or args.target_path)
        else:
            raise ValueError(f"不支持的目标存储类型: {args.target_type}")
        
        # 执行迁移
        migrator = StorageMigrator(source, target)
        result = await migrator.migrate(args.workflow_ids)
        
        # 验证迁移结果
        verify_result = await migrator.verify(args.workflow_ids)
        result["verification"] = verify_result
        
        # 打印结果
        print(f"\n迁移完成:")
        print(f"  总计: {result['total']}")
        print(f"  成功: {result['migrated']}")
        print(f"  失败: {result['failed']}")
        print(f"  跳过: {result['skipped']}")
        print(f"\n验证结果:")
        print(f"  通过: {verify_result['verified']}")
        print(f"  失败: {verify_result['failed']}")
        
        if result["errors"]:
            print(f"\n错误列表:")
            for error in result["errors"]:
                print(f"  - {error}")
    
    asyncio.run(main())

