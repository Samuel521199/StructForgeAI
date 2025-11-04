"""
PostgreSQL/MySQL 数据库存储后端 - 适合大型项目和生产环境
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from urllib.parse import urlparse

from storage.base import WorkflowStorage
from core.config import settings, PROJECT_ROOT
from core.logging_config import logger


class SQLStorage(WorkflowStorage):
    """PostgreSQL/MySQL 数据库存储实现（使用 SQLAlchemy）"""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        初始化SQL数据库存储
        
        Args:
            database_url: 数据库连接URL
                        PostgreSQL: postgresql://user:password@localhost/dbname
                        MySQL: mysql://user:password@localhost/dbname
        """
        try:
            from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime
            from sqlalchemy.ext.declarative import declarative_base
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy.orm.session import Session as SQLSession
        except ImportError:
            raise ImportError(
                "SQLAlchemy 未安装。请运行: pip install sqlalchemy psycopg2-binary  # PostgreSQL\n"
                "或: pip install sqlalchemy pymysql  # MySQL"
            )
        
        self.database_url = database_url or settings.DATABASE_URL
        
        # 解析数据库URL
        parsed = urlparse(self.database_url)
        self.db_type = parsed.scheme.split('+')[0]  # 移除驱动前缀 (postgresql+psycopg2 -> postgresql)
        
        # 创建数据库引擎
        self.engine = create_engine(
            self.database_url,
            pool_pre_ping=True,  # 连接前检查
            pool_size=5,
            max_overflow=10,
            echo=False  # 设置为 True 可以查看SQL语句
        )
        
        # 创建基类和会话
        Base = declarative_base()
        SessionLocal = sessionmaker(bind=self.engine)
        self.SessionLocal = SessionLocal
        
        # 定义数据模型
        class WorkflowModel(Base):
            __tablename__ = 'workflows'
            
            workflow_id = Column(String(255), primary_key=True)
            name = Column(String(255), nullable=False)
            description = Column(Text, nullable=True)
            nodes = Column(Text, nullable=False)  # JSON字符串
            edges = Column(Text, nullable=False)  # JSON字符串
            is_active = Column(Integer, default=0)  # 0=False, 1=True
            created_at = Column(DateTime, nullable=False)
            updated_at = Column(DateTime, nullable=False)
            type = Column(String(50), default='custom')
        
        class HiddenWorkflowModel(Base):
            __tablename__ = 'hidden_workflows'
            
            workflow_id = Column(String(255), primary_key=True)
            hidden_at = Column(DateTime, nullable=False)
        
        self.WorkflowModel = WorkflowModel
        self.HiddenWorkflowModel = HiddenWorkflowModel
        self.Base = Base
        
        # 初始化数据库表
        self._init_database()
        
        logger.info(f"使用{self.db_type.upper()}数据库存储后端: {self.database_url.split('@')[-1] if '@' in self.database_url else self.database_url}")
    
    def _init_database(self):
        """初始化数据库表"""
        try:
            self.Base.metadata.create_all(bind=self.engine)
            logger.debug("数据库表初始化完成")
        except Exception as e:
            logger.error(f"数据库表初始化失败: {e}", exc_info=True)
            raise
    
    def _get_session(self):
        """获取数据库会话"""
        return self.SessionLocal()
    
    async def save(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存工作流"""
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        name = workflow_data.get("name", workflow_id)
        description = workflow_data.get("description", "")
        is_active = workflow_data.get("is_active", False)
        
        session = self._get_session()
        try:
            # 检查是否已存在
            existing = session.query(self.WorkflowModel).filter_by(workflow_id=workflow_id).first()
            created_at = existing.created_at if existing else datetime.now()
            
            # 插入或更新
            workflow = self.WorkflowModel(
                workflow_id=workflow_id,
                name=name,
                description=description,
                nodes=json.dumps(nodes, ensure_ascii=False),
                edges=json.dumps(edges, ensure_ascii=False),
                is_active=1 if is_active else 0,
                created_at=created_at,
                updated_at=datetime.now(),
                type='custom'
            )
            
            session.merge(workflow)  # 使用 merge 实现 upsert
            session.commit()
            
            logger.info(f"工作流已保存到{self.db_type.upper()}数据库: {workflow_id}")
            return {
                "workflow_id": workflow_id,
                "message": "工作流保存成功"
            }
        except Exception as e:
            session.rollback()
            logger.error(f"保存工作流失败: {e}", exc_info=True)
            raise
        finally:
            session.close()
    
    async def load(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """加载工作流"""
        session = self._get_session()
        try:
            workflow = session.query(self.WorkflowModel).filter_by(workflow_id=workflow_id).first()
            
            if workflow:
                return {
                    "nodes": json.loads(workflow.nodes),
                    "edges": json.loads(workflow.edges),
                    "name": workflow.name,
                    "description": workflow.description or "",
                    "is_active": bool(workflow.is_active),
                }
            return None
        finally:
            session.close()
    
    async def delete(self, workflow_id: str) -> bool:
        """删除工作流"""
        session = self._get_session()
        try:
            workflow = session.query(self.WorkflowModel).filter_by(workflow_id=workflow_id).first()
            if workflow:
                session.delete(workflow)
                session.commit()
                logger.info(f"工作流已从{self.db_type.upper()}数据库删除: {workflow_id}")
                return True
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"删除工作流失败: {e}", exc_info=True)
            raise
        finally:
            session.close()
    
    async def list_all(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
        session = self._get_session()
        try:
            # 获取隐藏的工作流ID列表
            hidden_workflows = session.query(self.HiddenWorkflowModel).all()
            hidden_ids = {w.workflow_id for w in hidden_workflows}
            
            # 获取所有工作流（排除隐藏的）
            workflows = session.query(self.WorkflowModel).all()
            
            result = []
            for workflow in workflows:
                if workflow.workflow_id not in hidden_ids:
                    result.append({
                        "workflow_id": workflow.workflow_id,
                        "name": workflow.name,
                        "description": workflow.description or "",
                        "is_active": bool(workflow.is_active),
                        "created_at": workflow.created_at.isoformat() if workflow.created_at else datetime.now().isoformat(),
                        "updated_at": workflow.updated_at.isoformat() if workflow.updated_at else datetime.now().isoformat(),
                        "type": workflow.type or "custom",
                    })
            
            return result
        finally:
            session.close()
    
    async def exists(self, workflow_id: str) -> bool:
        """检查工作流是否存在"""
        session = self._get_session()
        try:
            workflow = session.query(self.WorkflowModel).filter_by(workflow_id=workflow_id).first()
            return workflow is not None
        finally:
            session.close()
    
    async def update_active(self, workflow_id: str, is_active: bool) -> bool:
        """更新工作流激活状态"""
        session = self._get_session()
        try:
            workflow = session.query(self.WorkflowModel).filter_by(workflow_id=workflow_id).first()
            if workflow:
                workflow.is_active = 1 if is_active else 0
                workflow.updated_at = datetime.now()
                session.commit()
                logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
                return True
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"更新工作流状态失败: {e}", exc_info=True)
            raise
        finally:
            session.close()
    
    def hide_workflow(self, workflow_id: str):
        """隐藏工作流（用于默认工作流的软删除）"""
        session = self._get_session()
        try:
            hidden = self.HiddenWorkflowModel(
                workflow_id=workflow_id,
                hidden_at=datetime.now()
            )
            session.merge(hidden)  # 使用 merge 实现 upsert
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"隐藏工作流失败: {e}", exc_info=True)
            raise
        finally:
            session.close()
    
    def is_hidden(self, workflow_id: str) -> bool:
        """检查工作流是否被隐藏"""
        session = self._get_session()
        try:
            hidden = session.query(self.HiddenWorkflowModel).filter_by(workflow_id=workflow_id).first()
            return hidden is not None
        finally:
            session.close()

