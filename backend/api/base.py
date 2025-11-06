"""
API基础类和工具函数
提供统一的响应格式、错误处理和AI节点公共逻辑
"""
from fastapi import HTTPException
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import json
import re

from core.logging_config import logger


class BaseAPIResponse(BaseModel):
    """统一API响应基类"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class AIWorkflowNodeBase:
    """AI工作流节点基类
    提供AI节点共用的方法和工具函数
    """
    
    @staticmethod
    def parse_ai_response(response: Dict[str, Any]) -> Dict[str, Any]:
        """
        解析AI响应中的JSON
        
        Args:
            response: LLMClient返回的响应字典
            
        Returns:
            解析后的JSON字典，如果解析失败则返回空字典
        """
        try:
            # LLMClient返回格式: {"content": "...", "model": "...", "usage": ...}
            content = response.get("content", "") if isinstance(response, dict) else str(response)
            
            # 尝试从响应中提取JSON
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                logger.warning("无法从AI响应中提取JSON，使用默认结构")
                return {}
        except Exception as e:
            logger.warning(f"解析AI响应失败: {e}，使用空字典")
            return {}
    
    @staticmethod
    def build_ai_messages(system_role: str, user_prompt: str) -> List[Dict[str, str]]:
        """
        构建AI提示词消息列表
        
        Args:
            system_role: 系统角色提示词
            user_prompt: 用户提示词
            
        Returns:
            AI消息列表
        """
        return [
            {"role": "system", "content": system_role},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def create_error_response(detail: str, status_code: int = 500) -> HTTPException:
        """
        创建统一的错误响应
        
        Args:
            detail: 错误详情
            status_code: HTTP状态码
            
        Returns:
            HTTPException实例
        """
        logger.error(f"API错误: {detail}")
        return HTTPException(status_code=status_code, detail=detail)
    
    @staticmethod
    def create_success_response(
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        创建统一的成功响应
        
        Args:
            message: 成功消息
            data: 响应数据
            
        Returns:
            成功响应字典
        """
        response = {
            "success": True,
            "message": message
        }
        if data:
            response["data"] = data
        return response


class AIWorkflowService(AIWorkflowNodeBase):
    """AI工作流服务类
    封装LLM调用和响应处理
    """
    
    def __init__(self, llm_client=None):
        """
        初始化AI工作流服务
        
        Args:
            llm_client: LLM客户端实例，如果为None则自动创建
        """
        if llm_client is None:
            from ai_integration.llm_client import LLMClient
            self.llm_client = LLMClient()
        else:
            self.llm_client = llm_client
    
    async def call_ai(
        self,
        system_role: str,
        user_prompt: str,
        operation_name: str = "AI操作"
    ) -> Dict[str, Any]:
        """
        调用AI并解析响应
        
        Args:
            system_role: 系统角色提示词
            user_prompt: 用户提示词
            operation_name: 操作名称（用于日志）
            
        Returns:
            解析后的AI响应字典
            
        Raises:
            HTTPException: 如果AI调用失败
        """
        try:
            logger.info(f"开始{operation_name}...")
            messages = self.build_ai_messages(system_role, user_prompt)
            response = self.llm_client.chat(messages)
            result = self.parse_ai_response(response)
            logger.info(f"{operation_name}完成")
            return result
        except ConnectionError as e:
            # 连接错误（如 AI 服务未启动）提供更友好的错误信息
            error_msg = str(e)
            logger.error(f"连接错误: {operation_name}失败: {error_msg}")
            raise self.create_error_response(error_msg)
        except Exception as e:
            logger.error(f"API错误: {operation_name}失败: {e}", exc_info=True)
            raise self.create_error_response(f"{operation_name}失败: {str(e)}")

