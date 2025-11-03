"""
基础解析器抽象类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pathlib import Path


class BaseParser(ABC):
    """数据解析器基类"""
    
    @abstractmethod
    def parse(self, file_path: Path) -> Dict[str, Any]:
        """
        解析文件并返回结构化数据
        
        Args:
            file_path: 文件路径
            
        Returns:
            解析后的数据结构
        """
        pass
    
    @abstractmethod
    def validate(self, data: Dict[str, Any]) -> bool:
        """
        验证数据结构
        
        Args:
            data: 待验证的数据
            
        Returns:
            是否有效
        """
        pass
    
    @abstractmethod
    def export(self, data: Dict[str, Any], output_path: Path) -> bool:
        """
        导出数据到文件
        
        Args:
            data: 要导出的数据
            output_path: 输出路径
            
        Returns:
            是否成功
        """
        pass
    
    def detect_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        自动检测数据结构（Schema推断）
        
        Args:
            data: 示例数据
            
        Returns:
            推断出的Schema
        """
        raise NotImplementedError("子类需要实现Schema检测")


