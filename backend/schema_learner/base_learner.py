"""
Schema学习器基类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseSchemaLearner(ABC):
    """Schema学习器抽象基类"""
    
    @abstractmethod
    def learn_schema(self, data: Dict[str, Any], metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        学习数据结构Schema
        
        Args:
            data: 示例数据
            metadata: 元数据（如文件路径、游戏类型等）
            
        Returns:
            学习到的Schema
        """
        pass
    
    @abstractmethod
    def understand_relationships(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        理解字段间的关系
        
        Args:
            schema: 数据结构Schema
            
        Returns:
            关系图谱
        """
        pass
    
    @abstractmethod
    def infer_intent(self, natural_language: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        从自然语言推断操作意图
        
        Args:
            natural_language: 自然语言指令
            schema: 数据结构Schema
            
        Returns:
            结构化操作指令
        """
        pass

