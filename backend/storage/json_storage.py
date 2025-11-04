"""
JSON文件存储后端 - 适合小型项目和开发测试
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from storage.base import WorkflowStorage
from core.config import settings, PROJECT_ROOT
from core.logging_config import logger


class JSONStorage(WorkflowStorage):
    """JSON文件存储实现"""
    
    def __init__(self, storage_path: Optional[Path] = None):
        """
        初始化JSON存储
        
        Args:
            storage_path: 存储文件路径，默认使用 data/workflows.json
        """
        if storage_path is None:
            storage_path = PROJECT_ROOT / "data" / "workflows.json"
        
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._hidden_workflows: set[str] = set()
        
        # 加载现有数据
        self._workflows: Dict[str, Dict[str, Any]] = self._load_from_file()
        
        logger.info(f"使用JSON文件存储后端: {self.storage_path}")
    
    def _load_from_file(self) -> Dict[str, Dict[str, Any]]:
        """从文件加载数据"""
        if not self.storage_path.exists():
            logger.debug(f"JSON存储文件不存在，将创建新文件: {self.storage_path}")
            return {}
        
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                workflows = data.get("workflows", {})
                hidden_workflows = data.get("hidden_workflows", [])
                self._hidden_workflows = set(hidden_workflows)
                logger.debug(f"从JSON文件加载了 {len(workflows)} 个工作流")
                return workflows
        except json.JSONDecodeError as e:
            logger.error(f"JSON存储文件格式错误: {e}，将使用空数据")
            return {}
        except Exception as e:
            logger.error(f"加载JSON存储文件失败: {e}", exc_info=True)
            return {}
    
    def _save_to_file(self):
        """保存数据到文件"""
        try:
            data = {
                "workflows": self._workflows,
                "hidden_workflows": list(self._hidden_workflows),
                "updated_at": datetime.now().isoformat()
            }
            
            # 先写入临时文件，然后重命名（原子操作）
            temp_path = self.storage_path.with_suffix('.tmp')
            with open(temp_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            temp_path.replace(self.storage_path)
            logger.debug(f"JSON存储文件已更新: {self.storage_path}")
        except Exception as e:
            logger.error(f"保存JSON存储文件失败: {e}", exc_info=True)
            raise
    
    async def save(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存工作流"""
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        name = workflow_data.get("name", workflow_id)
        description = workflow_data.get("description", "")
        is_active = workflow_data.get("is_active", False)
        
        # 检查是否已存在，如果是更新，保留created_at
        existing = self._workflows.get(workflow_id)
        created_at = existing.get("created_at", datetime.now().isoformat()) if existing else datetime.now().isoformat()
        
        self._workflows[workflow_id] = {
            "workflow_id": workflow_id,
            "name": name,
            "description": description,
            "nodes": nodes,
            "edges": edges,
            "is_active": is_active,
            "created_at": created_at,
            "updated_at": datetime.now().isoformat(),
            "type": "custom",
        }
        
        self._save_to_file()
        logger.info(f"工作流已保存到JSON文件: {workflow_id}")
        return {
            "workflow_id": workflow_id,
            "message": "工作流保存成功"
        }
    
    async def load(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """加载工作流"""
        # 重新加载文件（支持多进程/多实例场景）
        self._workflows = self._load_from_file()
        
        logger.debug(f"JSON存储中查找工作流: {workflow_id}, 当前工作流数量: {len(self._workflows)}")
        
        workflow = self._workflows.get(workflow_id)
        if workflow:
            logger.debug(f"找到工作流: {workflow_id}")
            return {
                "nodes": workflow.get("nodes", []),
                "edges": workflow.get("edges", []),
                "name": workflow.get("name", workflow_id),
                "description": workflow.get("description", ""),
                "is_active": workflow.get("is_active", False),
            }
        
        logger.debug(f"工作流不存在: {workflow_id}, 可用的工作流ID: {list(self._workflows.keys())}")
        return None
    
    async def delete(self, workflow_id: str) -> bool:
        """删除工作流"""
        if workflow_id in self._workflows:
            del self._workflows[workflow_id]
            self._save_to_file()
            logger.info(f"工作流已从JSON文件删除: {workflow_id}")
            return True
        return False
    
    async def list_all(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
        # 重新加载文件（支持多进程/多实例场景）
        self._workflows = self._load_from_file()
        
        return [
            {
                "workflow_id": workflow_id,
                "name": workflow.get("name", workflow_id),
                "description": workflow.get("description", ""),
                "is_active": workflow.get("is_active", False),
                "created_at": workflow.get("created_at", datetime.now().isoformat()),
                "updated_at": workflow.get("updated_at", workflow.get("created_at", datetime.now().isoformat())),
                "type": workflow.get("type", "custom"),
            }
            for workflow_id, workflow in self._workflows.items()
            if workflow_id not in self._hidden_workflows
        ]
    
    async def exists(self, workflow_id: str) -> bool:
        """检查工作流是否存在"""
        self._workflows = self._load_from_file()
        exists = workflow_id in self._workflows
        logger.debug(f"检查工作流存在性: {workflow_id} -> {exists}")
        return exists
    
    async def update_active(self, workflow_id: str, is_active: bool) -> bool:
        """更新工作流激活状态"""
        self._workflows = self._load_from_file()
        
        if workflow_id in self._workflows:
            self._workflows[workflow_id]["is_active"] = is_active
            self._workflows[workflow_id]["updated_at"] = datetime.now().isoformat()
            self._save_to_file()
            logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
            return True
        return False
    
    def hide_workflow(self, workflow_id: str):
        """隐藏工作流（用于默认工作流的软删除）"""
        self._hidden_workflows.add(workflow_id)
        self._save_to_file()
    
    def is_hidden(self, workflow_id: str) -> bool:
        """检查工作流是否被隐藏"""
        return workflow_id in self._hidden_workflows

