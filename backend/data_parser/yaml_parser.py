"""
YAML解析器
"""
from pathlib import Path
from typing import Dict, Any
import yaml

from data_parser.base_parser import BaseParser
from core.logging_config import logger


class YAMLParser(BaseParser):
    """YAML文件解析器"""
    
    def parse(self, file_path: Path) -> Dict[str, Any]:
        """解析YAML文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            logger.error(f"YAML解析失败: {e}")
            raise
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """验证YAML数据"""
        try:
            yaml.safe_dump(data)  # 尝试序列化验证
            return True
        except Exception:
            return False
    
    def export(self, data: Dict[str, Any], output_path: Path) -> bool:
        """导出为YAML文件"""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                yaml.safe_dump(data, f, allow_unicode=True, default_flow_style=False)
            return True
        except Exception as e:
            logger.error(f"YAML导出失败: {e}")
            return False
    
    def detect_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """检测YAML结构Schema（与JSON类似）"""
        def infer_schema(obj: Any) -> Dict[str, Any]:
            if isinstance(obj, dict):
                schema = {"type": "object", "properties": {}}
                for key, value in obj.items():
                    schema["properties"][key] = infer_schema(value)
                return schema
            elif isinstance(obj, list):
                if obj:
                    return {"type": "array", "items": infer_schema(obj[0])}
                return {"type": "array"}
            else:
                return {"type": type(obj).__name__}
        
        return infer_schema(data)

