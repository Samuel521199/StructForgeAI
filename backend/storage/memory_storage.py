"""
Memory 存储模块 - 基于 SQLite 的键值存储
用于存储工作流记忆、会话记忆等
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import sqlite3

from core.config import settings, PROJECT_ROOT
from core.logging_config import logger


class MemoryStorage:
    """Memory 存储实现（基于 SQLite）"""
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        初始化 Memory 存储
        
        Args:
            db_path: 数据库文件路径，默认使用 data/memory.db
        """
        if db_path is None:
            db_path = PROJECT_ROOT / "data" / "memory.db"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库表
        self._init_database()
        
        logger.info(f"Memory 存储已初始化: {self.db_path}")
    
    def _get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_database(self):
        """初始化数据库表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 创建 memory 表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    memory_type TEXT NOT NULL,
                    workflow_id TEXT,
                    session_id TEXT,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    metadata TEXT,
                    ttl INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(memory_type, workflow_id, session_id, key)
                )
            """)
            
            # 创建索引
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memory_type_workflow 
                ON memory(memory_type, workflow_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memory_session 
                ON memory(session_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memory_key 
                ON memory(key)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memory_created_at 
                ON memory(created_at)
            """)
            
            conn.commit()
            logger.debug("Memory 数据库表初始化完成")
        except Exception as e:
            logger.error(f"Memory 数据库表初始化失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def store(
        self,
        memory_type: str,
        key: str,
        value: Any,
        workflow_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        存储记忆
        
        Args:
            memory_type: 记忆类型（workflow, session, global）
            key: 键名
            value: 值（可以是任意 JSON 可序列化的对象）
            workflow_id: 工作流ID（可选）
            session_id: 会话ID（可选）
            metadata: 元数据（可选）
            ttl: 过期时间（秒，可选）
            
        Returns:
            存储结果
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 序列化值
            value_str = json.dumps(value, ensure_ascii=False)
            metadata_str = json.dumps(metadata, ensure_ascii=False) if metadata else None
            
            # 计算过期时间
            expires_at = None
            if ttl:
                expires_at = datetime.now() + timedelta(seconds=ttl)
            
            # 插入或更新
            cursor.execute("""
                INSERT OR REPLACE INTO memory 
                (memory_type, workflow_id, session_id, key, value, metadata, ttl, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (memory_type, workflow_id, session_id, key, value_str, metadata_str, expires_at.isoformat() if expires_at else None))
            
            conn.commit()
            
            logger.debug(f"已存储记忆: {memory_type}/{key}")
            
            return {
                "success": True,
                "memory_type": memory_type,
                "key": key,
                "workflow_id": workflow_id,
                "session_id": session_id,
            }
        except Exception as e:
            logger.error(f"存储记忆失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def retrieve(
        self,
        memory_type: Optional[str] = None,
        key: Optional[str] = None,
        workflow_id: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        检索记忆
        
        Args:
            memory_type: 记忆类型（可选）
            key: 键名（可选，支持精确匹配）
            workflow_id: 工作流ID（可选）
            session_id: 会话ID（可选）
            limit: 返回结果数量限制
            
        Returns:
            记忆列表
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 构建查询条件
            conditions = []
            params = []
            
            if memory_type:
                conditions.append("memory_type = ?")
                params.append(memory_type)
            
            if key:
                conditions.append("key = ?")
                params.append(key)
            
            if workflow_id:
                conditions.append("workflow_id = ?")
                params.append(workflow_id)
            
            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)
            
            # 过滤过期记录
            conditions.append("(ttl IS NULL OR datetime(ttl) > datetime('now'))")
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query = f"""
                SELECT id, memory_type, workflow_id, session_id, key, value, metadata, 
                       created_at, updated_at, ttl
                FROM memory
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            """
            
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # 解析结果
            results = []
            for row in rows:
                try:
                    value = json.loads(row['value'])
                except json.JSONDecodeError:
                    value = row['value']
                
                metadata = None
                if row['metadata']:
                    try:
                        metadata = json.loads(row['metadata'])
                    except json.JSONDecodeError:
                        metadata = row['metadata']
                
                results.append({
                    "id": row['id'],
                    "memory_type": row['memory_type'],
                    "workflow_id": row['workflow_id'],
                    "session_id": row['session_id'],
                    "key": row['key'],
                    "value": value,
                    "metadata": metadata,
                    "created_at": row['created_at'],
                    "updated_at": row['updated_at'],
                    "ttl": row['ttl'],
                })
            
            logger.debug(f"检索到 {len(results)} 条记忆")
            return results
            
        except Exception as e:
            logger.error(f"检索记忆失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def search(
        self,
        query: str,
        memory_type: Optional[str] = None,
        workflow_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        搜索记忆（简单文本匹配）
        
        Args:
            query: 搜索关键词
            memory_type: 记忆类型（可选）
            workflow_id: 工作流ID（可选）
            limit: 返回结果数量限制
            
        Returns:
            匹配的记忆列表
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            conditions = ["(key LIKE ? OR value LIKE ?)"]
            params = [f"%{query}%", f"%{query}%"]
            
            if memory_type:
                conditions.append("memory_type = ?")
                params.append(memory_type)
            
            if workflow_id:
                conditions.append("workflow_id = ?")
                params.append(workflow_id)
            
            conditions.append("(ttl IS NULL OR datetime(ttl) > datetime('now'))")
            
            where_clause = " AND ".join(conditions)
            
            sql = f"""
                SELECT id, memory_type, workflow_id, session_id, key, value, metadata,
                       created_at, updated_at
                FROM memory
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ?
            """
            
            params.append(limit)
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                try:
                    value = json.loads(row['value'])
                except json.JSONDecodeError:
                    value = row['value']
                
                metadata = None
                if row['metadata']:
                    try:
                        metadata = json.loads(row['metadata'])
                    except json.JSONDecodeError:
                        pass
                
                results.append({
                    "id": row['id'],
                    "memory_type": row['memory_type'],
                    "workflow_id": row['workflow_id'],
                    "session_id": row['session_id'],
                    "key": row['key'],
                    "value": value,
                    "metadata": metadata,
                    "created_at": row['created_at'],
                    "updated_at": row['updated_at'],
                })
            
            return results
            
        except Exception as e:
            logger.error(f"搜索记忆失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def delete(
        self,
        memory_type: Optional[str] = None,
        key: Optional[str] = None,
        workflow_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> int:
        """
        删除记忆
        
        Args:
            memory_type: 记忆类型（可选）
            key: 键名（可选）
            workflow_id: 工作流ID（可选）
            session_id: 会话ID（可选）
            
        Returns:
            删除的记录数
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            conditions = []
            params = []
            
            if memory_type:
                conditions.append("memory_type = ?")
                params.append(memory_type)
            
            if key:
                conditions.append("key = ?")
                params.append(key)
            
            if workflow_id:
                conditions.append("workflow_id = ?")
                params.append(workflow_id)
            
            if session_id:
                conditions.append("session_id = ?")
                params.append(session_id)
            
            if not conditions:
                raise ValueError("至少需要提供一个删除条件")
            
            where_clause = " AND ".join(conditions)
            
            cursor.execute(f"DELETE FROM memory WHERE {where_clause}", params)
            deleted_count = cursor.rowcount
            
            conn.commit()
            
            logger.debug(f"已删除 {deleted_count} 条记忆")
            return deleted_count
            
        except Exception as e:
            logger.error(f"删除记忆失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()
    
    def clear_expired(self) -> int:
        """
        清理过期记录
        
        Returns:
            清理的记录数
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM memory 
                WHERE ttl IS NOT NULL AND datetime(ttl) <= datetime('now')
            """)
            
            deleted_count = cursor.rowcount
            conn.commit()
            
            logger.info(f"已清理 {deleted_count} 条过期记忆")
            return deleted_count
            
        except Exception as e:
            logger.error(f"清理过期记录失败: {e}", exc_info=True)
            raise
        finally:
            conn.close()


# 全局 Memory 存储实例
_memory_storage_instance: Optional[MemoryStorage] = None


def get_memory_storage() -> MemoryStorage:
    """获取 Memory 存储实例（单例模式）"""
    global _memory_storage_instance
    
    if _memory_storage_instance is None:
        _memory_storage_instance = MemoryStorage()
    
    return _memory_storage_instance

