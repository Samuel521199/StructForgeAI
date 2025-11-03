"""
AI服务API
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from ai_integration.llm_client import LLMClient
from core.logging_config import logger

router = APIRouter()
llm_client = LLMClient()


@router.post("/chat")
async def chat(messages: List[Dict[str, str]]):
    """AI聊天接口"""
    try:
        response = llm_client.chat(messages)
        return response
    except Exception as e:
        logger.error(f"AI聊天失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_models():
    """列出可用模型"""
    # TODO: 从配置或模型提供商获取模型列表
    return {
        "models": [
            {
                "id": "qwen2.5:7b-instruct-q4",
                "name": "Qwen2.5 7B (Q4量化)",
                "provider": "ollama",
                "recommended": True
            },
            {
                "id": "llama3.1:8b-instruct-q4",
                "name": "Llama3.1 8B (Q4量化)",
                "provider": "ollama"
            }
        ]
    }

