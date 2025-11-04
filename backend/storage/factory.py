"""
存储工厂 - 根据配置自动选择存储后端
"""
from pathlib import Path
from typing import Optional
from enum import Enum

from storage.base import WorkflowStorage
from storage.memory import MemoryStorage
from storage.json_storage import JSONStorage
from storage.sqlite_storage import SQLiteStorage
from storage.sql_storage import SQLStorage
from core.config import settings, PROJECT_ROOT
from core.logging_config import logger


class StorageType(str, Enum):
    """存储类型枚举"""
    MEMORY = "memory"
    JSON = "json"
    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"


# 全局存储实例（单例模式）
_storage_instance: Optional[WorkflowStorage] = None


def get_storage(storage_type: Optional[str] = None) -> WorkflowStorage:
    """
    获取存储实例（单例模式）
    
    Args:
        storage_type: 存储类型（memory, json, sqlite, postgresql, mysql）
                     如果为None，从配置中读取
        
    Returns:
        存储实例
    """
    global _storage_instance
    
    if _storage_instance is not None:
        return _storage_instance
    
    # 从配置中获取存储类型
    if storage_type is None:
        storage_type = getattr(settings, "WORKFLOW_STORAGE_TYPE", "json").lower()
    
    # 根据类型创建存储实例
    if storage_type == StorageType.MEMORY:
        _storage_instance = MemoryStorage()
        logger.info("已初始化内存存储后端")
    
    elif storage_type == StorageType.JSON:
        storage_path = getattr(settings, "WORKFLOW_STORAGE_PATH", None)
        if storage_path:
            storage_path = Path(storage_path)
        else:
            storage_path = PROJECT_ROOT / "data" / "workflows.json"
        _storage_instance = JSONStorage(storage_path)
        logger.info("已初始化JSON文件存储后端")
    
    elif storage_type == StorageType.SQLITE:
        db_path = getattr(settings, "WORKFLOW_STORAGE_PATH", None)
        if db_path:
            db_path = Path(db_path)
        else:
            # 从 DATABASE_URL 中提取路径
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                db_path = Path(db_url.replace("sqlite:///", ""))
            else:
                db_path = PROJECT_ROOT / "data" / "structforge.db"
        _storage_instance = SQLiteStorage(db_path)
        logger.info("已初始化SQLite数据库存储后端")
    
    elif storage_type in (StorageType.POSTGRESQL, StorageType.MYSQL):
        # PostgreSQL/MySQL 存储
        try:
            from storage.sql_storage import SQLStorage
            database_url = getattr(settings, "WORKFLOW_STORAGE_PATH", None) or settings.DATABASE_URL
            _storage_instance = SQLStorage(database_url)
            logger.info(f"已初始化{storage_type.upper()}数据库存储后端")
        except ImportError as e:
            logger.error(f"PostgreSQL/MySQL存储后端初始化失败: {e}")
            logger.warning("使用JSON存储作为后备")
            storage_path = PROJECT_ROOT / "data" / "workflows.json"
            _storage_instance = JSONStorage(storage_path)
    
    else:
        logger.warning(f"未知的存储类型: {storage_type}，使用JSON存储作为后备")
        storage_path = PROJECT_ROOT / "data" / "workflows.json"
        _storage_instance = JSONStorage(storage_path)
    
    return _storage_instance


def reset_storage():
    """重置存储实例（用于测试或切换存储类型）"""
    global _storage_instance
    _storage_instance = None
    logger.info("存储实例已重置")

