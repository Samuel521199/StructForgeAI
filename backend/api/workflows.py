"""
工作流API
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime

from core.logging_config import logger

router = APIRouter()

# 延迟初始化工作流引擎，避免导入时出错
engine = None

def get_engine():
    """获取工作流引擎实例（延迟初始化）"""
    global engine
    if engine is None:
        try:
            from workflow.workflow_engine import WorkflowEngine
            from workflow.default_workflows import register_default_workflows
            
            engine = WorkflowEngine()
            # 注册默认工作流
            register_default_workflows(engine)
            logger.info("工作流引擎初始化成功")
        except Exception as e:
            logger.error(f"工作流引擎初始化失败: {e}", exc_info=True)
            raise
    return engine


@router.post("/execute/{workflow_id}")
async def execute_workflow(
    workflow_id: str,
    context: Dict[str, Any]
):
    """执行工作流"""
    try:
        workflow_engine = get_engine()
        result = await workflow_engine.execute(workflow_id, context)
        return result
    except Exception as e:
        logger.error(f"工作流执行失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{execution_id}")
async def get_workflow_status(execution_id: str):
    """获取工作流执行状态"""
    try:
        workflow_engine = get_engine()
        status = workflow_engine.get_workflow_status(execution_id)
        if not status:
            raise HTTPException(status_code=404, detail="执行记录不存在")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取工作流状态失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_workflow_history(
    workflow_id: Optional[str] = None,
    limit: int = 10
):
    """获取工作流执行历史"""
    try:
        workflow_engine = get_engine()
        history = workflow_engine.get_history(workflow_id, limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"获取工作流历史失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_workflows():
    """列出所有可用工作流（返回详细信息）"""
    try:
        workflow_engine = get_engine()
        workflow_list = []
        
        # 添加默认工作流（排除被隐藏的）
        for workflow_id in workflow_engine.workflows.keys():
            if workflow_id not in _hidden_default_workflows:
                workflow_list.append({
                    "workflow_id": workflow_id,
                    "name": workflow_id.replace("_", " ").title(),
                    "description": f"默认工作流: {workflow_id}",
                    "is_active": False,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "type": "default",
                })
        
        # 添加自定义工作流
        custom_workflows = _get_custom_workflows()
        for workflow_id, workflow in custom_workflows.items():
            workflow_list.append({
                "workflow_id": workflow_id,
                "name": workflow.get("name", workflow_id),
                "description": workflow.get("description", ""),
                "is_active": workflow.get("is_active", False),
                "created_at": workflow.get("created_at", datetime.now().isoformat()),
                "updated_at": workflow.get("updated_at", workflow.get("created_at", datetime.now().isoformat())),
                "type": "custom",
            })
        
        return {"workflows": workflow_list}
    except Exception as e:
        logger.error(f"获取工作流列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# 自定义工作流存储（简单实现，实际应该用数据库）
_custom_workflows: Dict[str, Dict[str, Any]] = {}

# 被用户删除的默认工作流列表（隐藏列表）
_hidden_default_workflows: set[str] = set()


def _get_custom_workflows() -> Dict[str, Dict[str, Any]]:
    """获取自定义工作流"""
    return _custom_workflows


@router.post("/save/{workflow_id}")
async def save_workflow(
    workflow_id: str,
    workflow_data: Dict[str, Any]
):
    """保存自定义工作流定义"""
    try:
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        name = workflow_data.get("name", workflow_id)
        description = workflow_data.get("description", "")
        is_active = workflow_data.get("is_active", False)
        
        # 检查是否已存在，如果是更新，保留created_at
        existing = _custom_workflows.get(workflow_id)
        created_at = existing.get("created_at", datetime.now().isoformat()) if existing else datetime.now().isoformat()
        
        _custom_workflows[workflow_id] = {
            "workflow_id": workflow_id,
            "name": name,
            "description": description,
            "nodes": nodes,
            "edges": edges,
            "is_active": is_active,
            "created_at": created_at,
            "updated_at": datetime.now().isoformat(),
        }
        
        logger.info(f"工作流已保存: {workflow_id}")
        return {
            "workflow_id": workflow_id,
            "message": "工作流保存成功"
        }
    except Exception as e:
        logger.error(f"保存工作流失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/load/{workflow_id}")
async def load_workflow(workflow_id: str):
    """加载工作流定义（支持默认和自定义工作流）"""
    try:
        # 先检查自定义工作流
        custom_workflows = _get_custom_workflows()
        if workflow_id in custom_workflows:
            workflow = custom_workflows[workflow_id]
            return {
                "nodes": workflow.get("nodes", []),
                "edges": workflow.get("edges", []),
                "name": workflow.get("name", workflow_id),
                "description": workflow.get("description", ""),
                "is_active": workflow.get("is_active", False),
            }
        
        # 检查默认工作流
        workflow_engine = get_engine()
        if workflow_id in workflow_engine.workflows:
            # 默认工作流没有节点和边的定义，返回基本信息
            # 实际使用时，编辑器应该从默认模板创建
            return {
                "nodes": [],
                "edges": [],
                "name": workflow_id.replace("_", " ").title(),
                "description": f"默认工作流: {workflow_id}",
                "is_active": False,
                "is_default": True,
            }
        else:
            raise HTTPException(status_code=404, detail="工作流不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"加载工作流失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """删除工作流（支持默认和自定义工作流）"""
    try:
        custom_workflows = _get_custom_workflows()
        
        # 添加调试日志
        logger.info(f"尝试删除工作流: {workflow_id}")
        logger.info(f"自定义工作流列表: {list(custom_workflows.keys())}")
        
        # 如果是自定义工作流，直接删除
        if workflow_id in custom_workflows:
            del custom_workflows[workflow_id]
            logger.info(f"自定义工作流已删除: {workflow_id}")
            return {
                "workflow_id": workflow_id,
                "message": "工作流删除成功"
            }
        
        # 尝试获取工作流引擎（可能初始化失败）
        try:
            workflow_engine = get_engine()
            logger.info(f"默认工作流列表: {list(workflow_engine.workflows.keys())}")
            logger.info(f"已隐藏的默认工作流: {list(_hidden_default_workflows)}")
            
            # 如果是默认工作流，添加到隐藏列表
            if workflow_id in workflow_engine.workflows:
                _hidden_default_workflows.add(workflow_id)
                logger.info(f"默认工作流已隐藏: {workflow_id}")
                return {
                    "workflow_id": workflow_id,
                    "message": "默认工作流已从列表中移除"
                }
        except Exception as engine_error:
            logger.error(f"获取工作流引擎失败: {engine_error}", exc_info=True)
            # 如果引擎初始化失败，但工作流可能是默认工作流，仍然尝试添加到隐藏列表
            # 默认工作流ID列表
            default_workflow_ids = ["full_pipeline", "analyze_only", "batch_process"]
            if workflow_id in default_workflow_ids:
                _hidden_default_workflows.add(workflow_id)
                logger.info(f"默认工作流已隐藏（引擎未初始化）: {workflow_id}")
                return {
                    "workflow_id": workflow_id,
                    "message": "默认工作流已从列表中移除"
                }
        
        # 如果找不到，记录详细信息并抛出异常
        logger.warning(f"工作流不存在: {workflow_id}")
        try:
            workflow_engine = get_engine()
            logger.warning(f"所有可用的工作流ID: 自定义={list(custom_workflows.keys())}, 默认={list(workflow_engine.workflows.keys())}")
        except:
            logger.warning(f"所有可用的工作流ID: 自定义={list(custom_workflows.keys())}, 默认工作流引擎未初始化")
        raise HTTPException(status_code=404, detail="工作流不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除工作流失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{workflow_id}/active")
async def toggle_workflow_active(
    workflow_id: str,
    data: Dict[str, Any]
):
    """切换工作流激活状态"""
    try:
        is_active = data.get("is_active", False)
        custom_workflows = _get_custom_workflows()
        if workflow_id in custom_workflows:
            custom_workflows[workflow_id]["is_active"] = is_active
            custom_workflows[workflow_id]["updated_at"] = datetime.now().isoformat()
            logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
            return {
                "workflow_id": workflow_id,
                "is_active": is_active,
                "message": "工作流状态更新成功"
            }
        else:
            raise HTTPException(status_code=404, detail="工作流不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新工作流状态失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

