"""
Schema管理API
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional

from schema_learner.ai_learner import AISchemaLearner
from schema_learner.rule_learner import RuleBasedSchemaLearner
from core.logging_config import logger
from api.models import (
    SchemaAnalysisRequest,
    SchemaAnalysisResponse,
    IntentInferenceRequest,
    IntentInferenceResponse,
    SimilarSchemasRequest,
    SimilarSchemasResponse,
    SaveSchemaRequest,
    SaveSchemaResponse,
)

router = APIRouter()

# Lazy initialization of VectorDB
_vector_db = None

def get_vector_db():
    """延迟初始化VectorDB（可选功能）"""
    global _vector_db
    if _vector_db is None:
        try:
            from ai_integration.vector_db import VectorDB
            _vector_db = VectorDB()
        except Exception as e:
            logger.warning(f"VectorDB initialization failed: {e}")
            logger.warning("VectorDB features (similar schema search) will be unavailable")
            _vector_db = None
    return _vector_db


@router.post("/analyze", response_model=SchemaAnalysisResponse)
async def analyze_schema(request: SchemaAnalysisRequest):
    """分析Schema"""
    try:
        if request.use_ai:
            learner = AISchemaLearner()
        else:
            learner = RuleBasedSchemaLearner()
        
        schema = learner.learn_schema(request.data, request.metadata)
        relationships = learner.understand_relationships(schema)
        
        return SchemaAnalysisResponse(
            schema=schema,
            relationships=relationships
        )
    except Exception as e:
        logger.error(f"Schema分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/infer-intent", response_model=IntentInferenceResponse)
async def infer_intent(request: IntentInferenceRequest):
    """从自然语言推断操作意图"""
    try:
        if request.use_ai:
            learner = AISchemaLearner()
        else:
            learner = RuleBasedSchemaLearner()
        
        intent = learner.infer_intent(request.instruction, request.schema_data)
        
        return IntentInferenceResponse(
            intent=intent,
            instruction=request.instruction
        )
    except Exception as e:
        logger.error(f"意图推断失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar", response_model=SimilarSchemasResponse)
async def find_similar_schemas(request: SimilarSchemasRequest):
    """查找相似的Schema"""
    try:
        db = get_vector_db()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="VectorDB is not available. Schema similarity search is disabled."
            )
        results = db.search_similar(request.schema_data, request.top_k)
        return SimilarSchemasResponse(similar_schemas=results)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Similar schema search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save", response_model=SaveSchemaResponse)
async def save_schema(request: SaveSchemaRequest):
    """保存Schema到向量库"""
    try:
        db = get_vector_db()
        if db is None:
            raise HTTPException(
                status_code=503,
                detail="VectorDB is not available. Schema saving is disabled."
            )
        schema_id = db.add_schema(request.schema_data, request.metadata)
        return SaveSchemaResponse(
            schema_id=schema_id,
            message="Schema saved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Schema save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

