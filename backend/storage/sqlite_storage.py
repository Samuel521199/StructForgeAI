"""
SQLite数据库存储后端 - 适合中小型项目
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import sqlite3

from storage.base import WorkflowStorage
from core.config import settings, PROJECT_ROOT
from core.logging_config import logger


class SQLiteStorage(WorkflowStorage):
    """SQLite数据库存储实现"""
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        初始化SQLite存储
        
        Args:
            db_path: 数据库文件路径，默认使用 data/structforge.db
        """
        if db_path is None:
            # 从配置中获取数据库路径，或使用默认路径
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                db_path = Path(db_url.replace("sqlite:///", ""))
            else:
                db_path = PROJECT_ROOT / "data" / "structforge.db"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 初始化数据库表
        self._init_database()
        
        logger.info(f"使用SQLite数据库存储后端: {self.db_path}")
    
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
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS workflows (
                    workflow_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    nodes TEXT NOT NULL,
                    edges TEXT NOT NULL,
                    is_active INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    type TEXT DEFAULT 'custom'
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS hidden_workflows (
                    workflow_id TEXT PRIMARY KEY,
                    hidden_at TEXT NOT NULL
                )
            """)
            
            conn.commit()
        finally:
            conn.close()
    
    async def save(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存工作流"""
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        name = workflow_data.get("name", workflow_id)
        description = workflow_data.get("description", "")
        is_active = workflow_data.get("is_active", False)
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 检查是否已存在
            cursor.execute("SELECT created_at FROM workflows WHERE workflow_id = ?", (workflow_id,))
            existing = cursor.fetchone()
            created_at = existing["created_at"] if existing else datetime.now().isoformat()
            
            # 插入或更新
            cursor.execute("""
                INSERT OR REPLACE INTO workflows 
                (workflow_id, name, description, nodes, edges, is_active, created_at, updated_at, type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                workflow_id,
                name,
                description,
                json.dumps(nodes, ensure_ascii=False),
                json.dumps(edges, ensure_ascii=False),
                1 if is_active else 0,
                created_at,
                datetime.now().isoformat(),
                "custom"
            ))
            
            conn.commit()
            logger.info(f"工作流已保存到SQLite: {workflow_id}")
            return {
                "workflow_id": workflow_id,
                "message": "工作流保存成功"
            }
        finally:
            conn.close()
    
    async def load(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """加载工作流"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflows WHERE workflow_id = ?", (workflow_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    "nodes": json.loads(row["nodes"]),
                    "edges": json.loads(row["edges"]),
                    "name": row["name"],
                    "description": row["description"] or "",
                    "is_active": bool(row["is_active"]),
                }
            return None
        finally:
            conn.close()
    
    async def delete(self, workflow_id: str) -> bool:
        """删除工作流"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM workflows WHERE workflow_id = ?", (workflow_id,))
            conn.commit()
            
            deleted = cursor.rowcount > 0
            if deleted:
                logger.info(f"工作流已从SQLite删除: {workflow_id}")
            return deleted
        finally:
            conn.close()
    
    async def list_all(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 获取隐藏的工作流ID列表
            cursor.execute("SELECT workflow_id FROM hidden_workflows")
            hidden_ids = {row["workflow_id"] for row in cursor.fetchall()}
            
            # 获取所有工作流（排除隐藏的）
            cursor.execute("SELECT * FROM workflows")
            workflows = []
            
            for row in cursor.fetchall():
                workflow_id = row["workflow_id"]
                if workflow_id not in hidden_ids:
                    workflows.append({
                        "workflow_id": workflow_id,
                        "name": row["name"],
                        "description": row["description"] or "",
                        "is_active": bool(row["is_active"]),
                        "created_at": row["created_at"],
                        "updated_at": row["updated_at"],
                        "type": row["type"] or "custom",
                    })
            
            return workflows
        finally:
            conn.close()
    
    async def exists(self, workflow_id: str) -> bool:
        """检查工作流是否存在"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM workflows WHERE workflow_id = ?", (workflow_id,))
            return cursor.fetchone() is not None
        finally:
            conn.close()
    
    async def update_active(self, workflow_id: str, is_active: bool) -> bool:
        """更新工作流激活状态"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE workflows 
                SET is_active = ?, updated_at = ?
                WHERE workflow_id = ?
            """, (1 if is_active else 0, datetime.now().isoformat(), workflow_id))
            
            conn.commit()
            updated = cursor.rowcount > 0
            if updated:
                logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
            return updated
        finally:
            conn.close()
    
    def hide_workflow(self, workflow_id: str):
        """隐藏工作流（用于默认工作流的软删除）"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO hidden_workflows (workflow_id, hidden_at)
                VALUES (?, ?)
            """, (workflow_id, datetime.now().isoformat()))
            conn.commit()
        finally:
            conn.close()
    
    def is_hidden(self, workflow_id: str) -> bool:
        """检查工作流是否被隐藏"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM hidden_workflows WHERE workflow_id = ?", (workflow_id,))
            return cursor.fetchone() is not None
        finally:
            conn.close()

