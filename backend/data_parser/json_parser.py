"""
JSON解析器
"""
from pathlib import Path
from typing import Dict, Any
import json

from data_parser.base_parser import BaseParser
from core.logging_config import logger


class JSONParser(BaseParser):
    """JSON文件解析器"""
    
    def parse(self, file_path: Path) -> Dict[str, Any]:
        """解析JSON文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"JSON解析失败: {e}")
            raise
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """验证JSON数据"""
        try:
            json.dumps(data)  # 尝试序列化验证
            return True
        except Exception:
            return False
    
    def export(self, data: Dict[str, Any], output_path: Path) -> bool:
        """导出为JSON文件"""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"JSON导出失败: {e}")
            return False
    
    def detect_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """检测JSON结构Schema"""
        from jsonschema import Draft7Validator
        
        def infer_schema(obj: Any) -> Dict[str, Any]:
            if isinstance(obj, dict):
                schema = {"type": "object", "properties": {}, "required": []}
                for key, value in obj.items():
                    schema["properties"][key] = infer_schema(value)
                return schema
            elif isinstance(obj, list):
                if obj:
                    return {"type": "array", "items": infer_schema(obj[0])}
                return {"type": "array"}
            elif isinstance(obj, bool):
                return {"type": "boolean"}
            elif isinstance(obj, int):
                return {"type": "integer"}
            elif isinstance(obj, float):
                return {"type": "number"}
            elif isinstance(obj, str):
                return {"type": "string"}
            else:
                return {"type": "null"}
        
        return infer_schema(data)

