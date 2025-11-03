"""
Schema管理API
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from schema_learner.ai_learner import AISchemaLearner
from schema_learner.rule_learner import RuleBasedSchemaLearner
from ai_integration.vector_db import VectorDB
from core.logging_config import logger

router = APIRouter()
vector_db = VectorDB()


@router.post("/analyze")
async def analyze_schema(
    data: Dict[str, Any],
    use_ai: bool = True,
    metadata: Optional[Dict] = None
):
    """分析Schema"""
    try:
        if use_ai:
            learner = AISchemaLearner()
        else:
            learner = RuleBasedSchemaLearner()
        
        schema = learner.learn_schema(data, metadata)
        relationships = learner.understand_relationships(schema)
        
        return {
            "schema": schema,
            "relationships": relationships
        }
    except Exception as e:
        logger.error(f"Schema分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/infer-intent")
async def infer_intent(
    instruction: str,
    schema: Dict[str, Any],
    use_ai: bool = True
):
    """从自然语言推断操作意图"""
    try:
        if use_ai:
            learner = AISchemaLearner()
        else:
            learner = RuleBasedSchemaLearner()
        
        intent = learner.infer_intent(instruction, schema)
        
        return {
            "intent": intent,
            "instruction": instruction
        }
    except Exception as e:
        logger.error(f"意图推断失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar")
async def find_similar_schemas(
    schema: Dict[str, Any],
    top_k: int = 5
):
    """查找相似的Schema"""
    try:
        results = vector_db.search_similar(schema, top_k)
        return {
            "similar_schemas": results
        }
    except Exception as e:
        logger.error(f"相似Schema查找失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_schema(
    schema: Dict[str, Any],
    metadata: Optional[Dict] = None
):
    """保存Schema到向量库"""
    try:
        schema_id = vector_db.add_schema(schema, metadata)
        return {
            "schema_id": schema_id,
            "message": "Schema已保存"
        }
    except Exception as e:
        logger.error(f"Schema保存失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

