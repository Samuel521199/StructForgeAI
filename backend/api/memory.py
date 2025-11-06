"""
Memory API - 工作流记忆管理
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from storage.memory_storage import get_memory_storage
from core.logging_config import logger

router = APIRouter()
memory_storage = get_memory_storage()


class StoreMemoryRequest(BaseModel):
    """存储记忆请求"""
    memory_type: str  # workflow, session, global
    key: str
    value: Any
    workflow_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ttl: Optional[int] = None  # 过期时间（秒）


class RetrieveMemoryRequest(BaseModel):
    """检索记忆请求"""
    memory_type: Optional[str] = None
    key: Optional[str] = None
    workflow_id: Optional[str] = None
    session_id: Optional[str] = None
    limit: int = 100


class SearchMemoryRequest(BaseModel):
    """搜索记忆请求"""
    query: str
    memory_type: Optional[str] = None
    workflow_id: Optional[str] = None
    limit: int = 10


class DeleteMemoryRequest(BaseModel):
    """删除记忆请求"""
    memory_type: Optional[str] = None
    key: Optional[str] = None
    workflow_id: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/store")
async def store_memory(request: StoreMemoryRequest):
    """
    存储记忆
    
    支持三种记忆类型：
    - workflow: 工作流记忆（绑定到特定工作流）
    - session: 会话记忆（绑定到会话）
    - global: 全局记忆（跨工作流）
    """
    try:
        result = memory_storage.store(
            memory_type=request.memory_type,
            key=request.key,
            value=request.value,
            workflow_id=request.workflow_id,
            session_id=request.session_id,
            metadata=request.metadata,
            ttl=request.ttl
        )
        
        return {
            "success": True,
            "message": "记忆已存储",
            "data": result
        }
    except Exception as e:
        logger.error(f"存储记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"存储记忆失败: {str(e)}")


@router.post("/retrieve")
async def retrieve_memory(request: RetrieveMemoryRequest):
    """
    检索记忆
    
    根据条件检索记忆，支持多种过滤条件
    """
    try:
        results = memory_storage.retrieve(
            memory_type=request.memory_type,
            key=request.key,
            workflow_id=request.workflow_id,
            session_id=request.session_id,
            limit=request.limit
        )
        
        return {
            "success": True,
            "message": f"检索到 {len(results)} 条记忆",
            "data": {
                "memories": results,
                "count": len(results)
            }
        }
    except Exception as e:
        logger.error(f"检索记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"检索记忆失败: {str(e)}")


@router.post("/search")
async def search_memory(request: SearchMemoryRequest):
    """
    搜索记忆
    
    使用关键词搜索记忆（简单文本匹配）
    """
    try:
        results = memory_storage.search(
            query=request.query,
            memory_type=request.memory_type,
            workflow_id=request.workflow_id,
            limit=request.limit
        )
        
        return {
            "success": True,
            "message": f"搜索到 {len(results)} 条记忆",
            "data": {
                "memories": results,
                "count": len(results)
            }
        }
    except Exception as e:
        logger.error(f"搜索记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索记忆失败: {str(e)}")


@router.post("/delete")
async def delete_memory(request: DeleteMemoryRequest):
    """
    删除记忆
    
    根据条件删除记忆，至少需要提供一个条件
    """
    try:
        deleted_count = memory_storage.delete(
            memory_type=request.memory_type,
            key=request.key,
            workflow_id=request.workflow_id,
            session_id=request.session_id
        )
        
        return {
            "success": True,
            "message": f"已删除 {deleted_count} 条记忆",
            "data": {
                "deleted_count": deleted_count
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"删除记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"删除记忆失败: {str(e)}")


@router.post("/clear-expired")
async def clear_expired_memory():
    """
    清理过期记忆
    
    自动清理所有过期的记忆记录
    """
    try:
        deleted_count = memory_storage.clear_expired()
        
        return {
            "success": True,
            "message": f"已清理 {deleted_count} 条过期记忆",
            "data": {
                "deleted_count": deleted_count
            }
        }
    except Exception as e:
        logger.error(f"清理过期记忆失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"清理过期记忆失败: {str(e)}")

