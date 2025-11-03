"""
工作流API
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional

from workflow.workflow_engine import WorkflowEngine
from workflow.default_workflows import register_default_workflows
from core.logging_config import logger

router = APIRouter()
engine = WorkflowEngine()

# 注册默认工作流
register_default_workflows(engine)


@router.post("/execute/{workflow_id}")
async def execute_workflow(
    workflow_id: str,
    context: Dict[str, Any]
):
    """执行工作流"""
    try:
        result = await engine.execute(workflow_id, context)
        return result
    except Exception as e:
        logger.error(f"工作流执行失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{execution_id}")
async def get_workflow_status(execution_id: str):
    """获取工作流执行状态"""
    status = engine.get_workflow_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return status


@router.get("/history")
async def get_workflow_history(
    workflow_id: Optional[str] = None,
    limit: int = 10
):
    """获取工作流执行历史"""
    history = engine.get_history(workflow_id, limit)
    return {"history": history}


@router.get("/list")
async def list_workflows():
    """列出所有可用工作流"""
    workflows = list(engine.workflows.keys())
    return {"workflows": workflows}

