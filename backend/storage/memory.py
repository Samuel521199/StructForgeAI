"""
内存存储后端 - 用于快速原型和开发测试
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from storage.base import WorkflowStorage
from core.logging_config import logger


class MemoryStorage(WorkflowStorage):
    """内存存储实现（数据不持久化）"""
    
    def __init__(self):
        self._workflows: Dict[str, Dict[str, Any]] = {}
        self._hidden_workflows: set[str] = set()
        logger.info("使用内存存储后端（数据不持久化）")
    
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
        
        logger.info(f"工作流已保存到内存: {workflow_id}")
        return {
            "workflow_id": workflow_id,
            "message": "工作流保存成功"
        }
    
    async def load(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """加载工作流"""
        workflow = self._workflows.get(workflow_id)
        if workflow:
            return {
                "nodes": workflow.get("nodes", []),
                "edges": workflow.get("edges", []),
                "name": workflow.get("name", workflow_id),
                "description": workflow.get("description", ""),
                "is_active": workflow.get("is_active", False),
            }
        return None
    
    async def delete(self, workflow_id: str) -> bool:
        """删除工作流"""
        if workflow_id in self._workflows:
            del self._workflows[workflow_id]
            logger.info(f"工作流已从内存删除: {workflow_id}")
            return True
        return False
    
    async def list_all(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
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
        return workflow_id in self._workflows
    
    async def update_active(self, workflow_id: str, is_active: bool) -> bool:
        """更新工作流激活状态"""
        if workflow_id in self._workflows:
            self._workflows[workflow_id]["is_active"] = is_active
            self._workflows[workflow_id]["updated_at"] = datetime.now().isoformat()
            logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
            return True
        return False
    
    def hide_workflow(self, workflow_id: str):
        """隐藏工作流（用于默认工作流的软删除）"""
        self._hidden_workflows.add(workflow_id)
    
    def is_hidden(self, workflow_id: str) -> bool:
        """检查工作流是否被隐藏"""
        return workflow_id in self._hidden_workflows

