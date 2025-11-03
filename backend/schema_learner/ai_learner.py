"""
基于AI的Schema学习器
"""
from typing import Dict, Any, Optional, List
import json

from schema_learner.base_learner import BaseSchemaLearner
from ai_integration.llm_client import LLMClient
from core.config import settings
from core.logging_config import logger


class AISchemaLearner(BaseSchemaLearner):
    """使用AI模型进行Schema学习"""
    
    def __init__(self):
        self.llm_client = LLMClient()
        self.system_prompt = """你是一个专业的游戏配置文件结构分析专家。
你的任务是：
1. 理解游戏配置文件的数据结构
2. 识别字段间的逻辑关系
3. 将自然语言指令转换为结构化的数据操作

请始终以JSON格式返回结果。"""
    
    def learn_schema(self, data: Dict[str, Any], metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """使用AI学习Schema"""
        try:
            prompt = f"""分析以下游戏配置数据结构，生成详细的Schema描述：

数据示例：
{json.dumps(data, ensure_ascii=False, indent=2)}

元数据：
{json.dumps(metadata or {}, ensure_ascii=False, indent=2)}

请返回JSON格式的Schema，包含：
1. 字段类型和约束
2. 字段含义说明
3. 字段间的依赖关系
4. 可能的枚举值或取值范围
"""
            
            response = self.llm_client.chat(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            
            # 解析AI返回的Schema
            schema_text = response.get("content", "{}")
            try:
                schema = json.loads(schema_text)
            except json.JSONDecodeError:
                # 尝试提取JSON部分
                import re
                json_match = re.search(r'\{.*\}', schema_text, re.DOTALL)
                if json_match:
                    schema = json.loads(json_match.group())
                else:
                    schema = {"raw_response": schema_text}
            
            return schema
            
        except Exception as e:
            logger.error(f"AI Schema学习失败: {e}")
            return {}
    
    def understand_relationships(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """理解字段间的关系"""
        try:
            prompt = f"""分析以下Schema，识别字段间的逻辑关系：

Schema:
{json.dumps(schema, ensure_ascii=False, indent=2)}

请返回JSON格式的关系图谱，包含：
1. 引用关系（如 piece_id 引用其他文件）
2. 依赖关系（如 damage 依赖于 weapon_type）
3. 组合关系（如 weapon = blade + guard + handle）
4. 约束关系（如 weight 与 material 的关联）
"""
            
            response = self.llm_client.chat(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            
            relationship_text = response.get("content", "{}")
            try:
                relationships = json.loads(relationship_text)
            except json.JSONDecodeError:
                relationships = {"raw_response": relationship_text}
            
            return relationships
            
        except Exception as e:
            logger.error(f"关系理解失败: {e}")
            return {}
    
    def infer_intent(self, natural_language: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """从自然语言推断操作意图"""
        try:
            prompt = f"""将以下自然语言指令转换为结构化操作：

用户指令："{natural_language}"

数据结构Schema：
{json.dumps(schema, ensure_ascii=False, indent=2)}

请返回JSON格式的操作指令，包含：
1. 操作类型（create/update/delete/copy）
2. 目标字段路径
3. 新值或修改规则
4. 需要验证的约束条件

示例格式：
{{
    "action": "update",
    "target": "weapon.weight",
    "value": 2.5,
    "constraints": ["weight > 0", "weight < 10"]
}}
"""
            
            response = self.llm_client.chat(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            
            intent_text = response.get("content", "{}")
            try:
                intent = json.loads(intent_text)
            except json.JSONDecodeError:
                intent = {"raw_response": intent_text}
            
            return intent
            
        except Exception as e:
            logger.error(f"意图推断失败: {e}")
            return {
                "action": "error",
                "message": str(e)
            }

