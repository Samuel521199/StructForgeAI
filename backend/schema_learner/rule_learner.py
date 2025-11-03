"""
基于规则的Schema学习器（MVP阶段）
"""
from typing import Dict, Any, Optional
import re

from schema_learner.base_learner import BaseSchemaLearner
from core.logging_config import logger


class RuleBasedSchemaLearner(BaseSchemaLearner):
    """基于规则的Schema学习器（不使用AI，用于MVP）"""
    
    def learn_schema(self, data: Dict[str, Any], metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """基于规则学习Schema"""
        schema = {
            "fields": {},
            "types": {},
            "constraints": {}
        }
        
        def analyze_field(path: str, value: Any, schema_ref: Dict):
            field_type = type(value).__name__
            schema_ref["fields"][path] = {
                "type": field_type,
                "path": path
            }
            schema_ref["types"][path] = field_type
            
            # 简单的约束推断
            if isinstance(value, (int, float)):
                schema_ref["constraints"][path] = {"type": "number"}
            elif isinstance(value, str):
                # 检查是否是ID模式
                if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', value):
                    schema_ref["constraints"][path] = {"type": "identifier"}
            
            if isinstance(value, dict):
                for key, val in value.items():
                    new_path = f"{path}.{key}" if path else key
                    analyze_field(new_path, val, schema_ref)
            elif isinstance(value, list):
                if value:
                    analyze_field(f"{path}[]", value[0], schema_ref)
        
        analyze_field("", data, schema)
        return schema
    
    def understand_relationships(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """理解关系（简单规则）"""
        relationships = {
            "references": [],
            "dependencies": []
        }
        
        fields = schema.get("fields", {})
        
        # 检测ID引用模式
        for field_path, field_info in fields.items():
            if "_id" in field_path.lower() or "id" in field_path.lower():
                relationships["references"].append({
                    "from": field_path,
                    "to": field_path.replace("_id", ""),
                    "type": "reference"
                })
        
        return relationships
    
    def infer_intent(self, natural_language: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """从自然语言推断意图（基于关键词匹配）"""
        intent = {
            "action": "update",
            "target": None,
            "value": None
        }
        
        nl_lower = natural_language.lower()
        
        # 检测操作类型
        if any(word in nl_lower for word in ["创建", "添加", "新建", "create", "add", "new"]):
            intent["action"] = "create"
        elif any(word in nl_lower for word in ["删除", "移除", "delete", "remove"]):
            intent["action"] = "delete"
        elif any(word in nl_lower for word in ["复制", "copy", "clone"]):
            intent["action"] = "copy"
        
        # 提取数值
        number_pattern = r'(\d+\.?\d*)'
        numbers = re.findall(number_pattern, natural_language)
        if numbers:
            intent["value"] = float(numbers[0]) if '.' in numbers[0] else int(numbers[0])
        
        # 提取字段名（简单匹配）
        fields = schema.get("fields", {})
        for field_path in fields.keys():
            field_name = field_path.split('.')[-1]
            if field_name.lower() in nl_lower:
                intent["target"] = field_path
                break
        
        # 如果没找到，尝试关键词匹配
        keyword_map = {
            "重量": "weight", "weight": "weight",
            "攻击": "damage", "damage": "damage",
            "速度": "speed", "speed": "speed",
            "范围": "length", "length": "length",
        }
        
        if not intent["target"]:
            for keyword, field in keyword_map.items():
                if keyword in nl_lower:
                    # 尝试在schema中查找对应字段
                    for field_path in fields.keys():
                        if field in field_path.lower():
                            intent["target"] = field_path
                            break
                    break
        
        return intent

