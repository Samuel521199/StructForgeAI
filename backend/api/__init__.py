"""
API路由模块
"""
from fastapi import APIRouter

from api import files, schemas, workflows, ai, data_operations, ai_workflow, chat_model, memory

router = APIRouter()

# 注册子路由
router.include_router(files.router, prefix="/files", tags=["文件管理"])
router.include_router(schemas.router, prefix="/schemas", tags=["Schema管理"])
router.include_router(workflows.router, prefix="/workflows", tags=["工作流"])
router.include_router(ai.router, prefix="/ai", tags=["AI服务"])
router.include_router(data_operations.router, prefix="/data", tags=["数据操作"])
router.include_router(ai_workflow.router, prefix="/ai-workflow", tags=["AI工作流"])
router.include_router(chat_model.router, prefix="/chat-model", tags=["Chat Model"])
router.include_router(memory.router, prefix="/memory", tags=["Memory"])

