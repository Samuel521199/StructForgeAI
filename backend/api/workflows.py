"""
工作流API
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime

from core.logging_config import logger
from storage import get_storage

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

# 延迟初始化存储后端
_storage = None

def get_storage_backend():
    """获取存储后端实例（延迟初始化）"""
    global _storage
    if _storage is None:
        _storage = get_storage()
    return _storage


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
        storage = get_storage_backend()
        workflow_list = []
        
        # 添加默认工作流（排除被隐藏的）
        for workflow_id in workflow_engine.workflows.keys():
            # 检查存储后端是否支持隐藏功能（用于默认工作流的软删除）
            if hasattr(storage, 'is_hidden') and storage.is_hidden(workflow_id):
                continue
            workflow_list.append({
                "workflow_id": workflow_id,
                "name": workflow_id.replace("_", " ").title(),
                "description": f"默认工作流: {workflow_id}",
                "is_active": False,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "type": "default",
            })
        
        # 添加自定义工作流（从存储后端获取）
        custom_workflows = await storage.list_all()
        workflow_list.extend(custom_workflows)
        
        return {"workflows": workflow_list}
    except Exception as e:
        logger.error(f"获取工作流列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save/{workflow_id}")
async def save_workflow(
    workflow_id: str,
    workflow_data: Dict[str, Any]
):
    """保存自定义工作流定义"""
    try:
        storage = get_storage_backend()
        result = await storage.save(workflow_id, workflow_data)
        logger.info(f"工作流已保存: {workflow_id}")
        return result
    except Exception as e:
        logger.error(f"保存工作流失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/load/{workflow_id}")
async def load_workflow(workflow_id: str):
    """加载工作流定义（支持默认和自定义工作流）"""
    try:
        storage = get_storage_backend()
        
        # 添加调试日志
        logger.debug(f"尝试加载工作流: {workflow_id}")
        
        # 先检查自定义工作流（从存储后端）
        workflow = await storage.load(workflow_id)
        if workflow:
            logger.debug(f"从存储后端加载工作流成功: {workflow_id}")
            return workflow
        
        # 检查存储中是否存在
        exists = await storage.exists(workflow_id)
        logger.debug(f"工作流存在性检查: {workflow_id} -> {exists}")
        
        # 列出所有工作流用于调试
        all_workflows = await storage.list_all()
        workflow_ids = [w["workflow_id"] for w in all_workflows]
        logger.debug(f"存储中的所有工作流ID: {workflow_ids}")
        
        # 检查默认工作流
        workflow_engine = get_engine()
        if workflow_id in workflow_engine.workflows:
            # 默认工作流没有节点和边的定义，返回基本信息
            # 实际使用时，编辑器应该从默认模板创建
            logger.debug(f"工作流是默认工作流: {workflow_id}")
            return {
                "nodes": [],
                "edges": [],
                "name": workflow_id.replace("_", " ").title(),
                "description": f"默认工作流: {workflow_id}",
                "is_active": False,
                "is_default": True,
            }
        else:
            logger.warning(f"工作流不存在: {workflow_id} (存储中: {workflow_ids}, 默认: {list(workflow_engine.workflows.keys())})")
            raise HTTPException(status_code=404, detail=f"工作流不存在: {workflow_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"加载工作流失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """删除工作流（支持默认和自定义工作流）"""
    try:
        storage = get_storage_backend()
        
        # 添加调试日志
        logger.info(f"尝试删除工作流: {workflow_id}")
        
        # 先检查是否为自定义工作流（从存储后端）
        if await storage.exists(workflow_id):
            success = await storage.delete(workflow_id)
            if success:
                logger.info(f"自定义工作流已删除: {workflow_id}")
                return {
                    "workflow_id": workflow_id,
                    "message": "工作流删除成功"
                }
        
        # 尝试获取工作流引擎（可能初始化失败）
        try:
            workflow_engine = get_engine()
            logger.info(f"默认工作流列表: {list(workflow_engine.workflows.keys())}")
            
            # 如果是默认工作流，使用隐藏功能（如果存储后端支持）
            if workflow_id in workflow_engine.workflows:
                if hasattr(storage, 'hide_workflow'):
                    storage.hide_workflow(workflow_id)
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
                if hasattr(storage, 'hide_workflow'):
                    storage.hide_workflow(workflow_id)
                    logger.info(f"默认工作流已隐藏（引擎未初始化）: {workflow_id}")
                    return {
                        "workflow_id": workflow_id,
                        "message": "默认工作流已从列表中移除"
                    }
        
        # 如果找不到，记录详细信息并抛出异常
        logger.warning(f"工作流不存在: {workflow_id}")
        try:
            workflow_engine = get_engine()
            custom_list = await storage.list_all()
            custom_ids = [w["workflow_id"] for w in custom_list]
            logger.warning(f"所有可用的工作流ID: 自定义={custom_ids}, 默认={list(workflow_engine.workflows.keys())}")
        except:
            logger.warning(f"无法获取工作流列表")
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
        storage = get_storage_backend()
        
        # 检查工作流是否存在
        if await storage.exists(workflow_id):
            success = await storage.update_active(workflow_id, is_active)
            if success:
                logger.info(f"工作流状态已更新: {workflow_id} -> {'激活' if is_active else '未激活'}")
                return {
                    "workflow_id": workflow_id,
                    "is_active": is_active,
                    "message": "工作流状态更新成功"
                }
        
        raise HTTPException(status_code=404, detail="工作流不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新工作流状态失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

