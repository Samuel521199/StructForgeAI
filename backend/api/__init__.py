"""
API路由模块
"""
from fastapi import APIRouter

from api import files, schemas, workflows, ai

router = APIRouter()

# 注册子路由
router.include_router(files.router, prefix="/files", tags=["文件管理"])
router.include_router(schemas.router, prefix="/schemas", tags=["Schema管理"])
router.include_router(workflows.router, prefix="/workflows", tags=["工作流"])
router.include_router(ai.router, prefix="/ai", tags=["AI服务"])

