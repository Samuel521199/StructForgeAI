"""
工作流存储抽象基类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime


class WorkflowStorage(ABC):
    """工作流存储抽象基类"""
    
    @abstractmethod
    async def save(self, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        保存工作流
        
        Args:
            workflow_id: 工作流ID
            workflow_data: 工作流数据（包含 nodes, edges, name, description, is_active 等）
            
        Returns:
            保存结果
        """
        pass
    
    @abstractmethod
    async def load(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """
        加载工作流
        
        Args:
            workflow_id: 工作流ID
            
        Returns:
            工作流数据，如果不存在返回 None
        """
        pass
    
    @abstractmethod
    async def delete(self, workflow_id: str) -> bool:
        """
        删除工作流
        
        Args:
            workflow_id: 工作流ID
            
        Returns:
            是否删除成功
        """
        pass
    
    @abstractmethod
    async def list_all(self) -> List[Dict[str, Any]]:
        """
        列出所有工作流
        
        Returns:
            工作流列表
        """
        pass
    
    @abstractmethod
    async def exists(self, workflow_id: str) -> bool:
        """
        检查工作流是否存在
        
        Args:
            workflow_id: 工作流ID
            
        Returns:
            是否存在
        """
        pass
    
    @abstractmethod
    async def update_active(self, workflow_id: str, is_active: bool) -> bool:
        """
        更新工作流激活状态
        
        Args:
            workflow_id: 工作流ID
            is_active: 是否激活
            
        Returns:
            是否更新成功
        """
        pass

