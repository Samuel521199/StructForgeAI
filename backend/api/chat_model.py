"""
Chat Model API - 支持自定义AI模型配置和调用
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
import requests
import json
import re

from core.logging_config import logger

router = APIRouter()


class ChatModelRequest(BaseModel):
    """Chat Model 请求"""
    model_config = ConfigDict(
        protected_namespaces=(),  # 允许使用 model_ 开头的字段名
        populate_by_name=True  # 允许使用别名或字段名
    )
    
    provider: str = Field(..., alias="model_type")  # deepseek, chatgpt, gemini，使用别名避免与保护命名空间冲突
    api_key: str
    api_url: str
    request_headers: Optional[str] = None  # JSON 字符串
    request_body: str  # JSON 字符串，支持变量替换
    prompt: str  # 实际提示词
    timeout: int = 60
    max_retries: int = 3
    
    @property
    def model_type(self) -> str:
        """向后兼容属性：返回 provider 值"""
        return self.provider


class ChatModelResponse(BaseModel):
    """Chat Model 响应"""
    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None


def replace_variables(text: str, variables: Dict[str, str]) -> str:
    """
    替换文本中的变量
    
    Args:
        text: 包含变量的文本（如 "${API_KEY}"）
        variables: 变量字典
        
    Returns:
        替换后的文本
    """
    result = text
    for key, value in variables.items():
        # 替换 ${KEY} 格式
        pattern = r'\$\{' + re.escape(key) + r'\}'
        result = re.sub(pattern, str(value), result)
    return result


def parse_json_safe(json_str: str) -> Dict[str, Any]:
    """
    安全解析 JSON 字符串
    
    Args:
        json_str: JSON 字符串
        
    Returns:
        解析后的字典
    """
    if not json_str or not json_str.strip():
        return {}
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"JSON 解析失败: {e}")
        raise ValueError(f"无效的 JSON 格式: {str(e)}")


@router.post("/chat", response_model=ChatModelResponse)
async def chat_with_custom_model(request: ChatModelRequest):
    """
    使用自定义配置的 Chat Model 进行对话
    
    支持：
    - DeepSeek
    - ChatGPT (OpenAI)
    - Google Gemini
    - 自定义 API 格式
    """
    try:
        # 使用 provider 字段（内部使用），但对外仍支持 model_type 别名
        model_type = request.provider
        
        # 准备变量替换
        variables = {
            'API_KEY': request.api_key,
            'PROMPT': request.prompt,
            'MODEL': model_type,
        }
        
        # 处理 Gemini API URL（API Key 作为 query 参数）
        api_url = request.api_url
        if model_type == 'gemini' and '${API_KEY}' in api_url:
            api_url = replace_variables(api_url, variables)
        elif model_type == 'gemini' and 'key=' not in api_url:
            # 如果没有 key 参数，添加它
            separator = '&' if '?' in api_url else '?'
            api_url = f"{api_url}{separator}key={request.api_key}"
        
        # 解析请求头
        headers = {}
        if request.request_headers:
            headers_raw = parse_json_safe(request.request_headers)
            # 替换变量
            headers_str = json.dumps(headers_raw)
            headers_str = replace_variables(headers_str, variables)
            headers = json.loads(headers_str)
        else:
            # 默认请求头
            headers = {
                'Content-Type': 'application/json',
            }
            # 根据模型类型添加认证（Gemini 不使用 Authorization header）
            if model_type in ['deepseek', 'chatgpt']:
                headers['Authorization'] = f'Bearer {request.api_key}'
        
        # 解析请求体
        body_raw = parse_json_safe(request.request_body)
        # 替换变量
        body_str = json.dumps(body_raw)
        body_str = replace_variables(body_str, variables)
        body = json.loads(body_str)
        
        # 发送请求
        logger.info(f"调用 Chat Model: {model_type}, URL: {api_url}")
        
        response = None
        last_error = None
        
        for attempt in range(request.max_retries):
            try:
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=body,
                    timeout=request.timeout
                )
                response.raise_for_status()
                break
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < request.max_retries - 1:
                    logger.warning(f"请求失败，重试 {attempt + 1}/{request.max_retries}: {e}")
                    continue
                else:
                    raise
        
        if not response:
            raise Exception(f"请求失败: {last_error}")
        
        result = response.json()
        
        # 根据不同模型解析响应
        content = ""
        model_name = model_type
        usage = None
        
        if model_type == 'gemini':
            # Gemini 响应格式
            if 'candidates' in result and len(result['candidates']) > 0:
                content = result['candidates'][0]['content']['parts'][0]['text']
                model_name = result.get('model', model_type)
                usage = result.get('usageMetadata', {})
        else:
            # DeepSeek/OpenAI 兼容格式
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                model_name = result.get('model', model_type)
                usage = result.get('usage', {})
            elif 'message' in result:
                # Ollama 格式兼容
                content = result['message'].get('content', '')
                model_name = result.get('model', model_type)
        
        if not content:
            logger.warning(f"未找到响应内容，原始响应: {result}")
            content = json.dumps(result, ensure_ascii=False, indent=2)
        
        return ChatModelResponse(
            content=content,
            model=model_name,
            usage=usage,
            raw_response=result
        )
        
    except ValueError as e:
        logger.error(f"Chat Model 配置错误: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except requests.exceptions.RequestException as e:
        logger.error(f"Chat Model API 请求失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"API 请求失败: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Chat Model 调用失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"调用失败: {str(e)}"
        )


@router.post("/test-connection")
async def test_connection(request: ChatModelRequest):
    """
    测试 Chat Model 连接
    
    发送一个简单的测试请求，验证配置是否正确
    """
    try:
        # 使用简单的测试提示词
        test_request = ChatModelRequest(
            provider=request.provider,  # 使用 provider 字段
            api_key=request.api_key,
            api_url=request.api_url,
            request_headers=request.request_headers,
            request_body=request.request_body,
            prompt="Hello",  # 简单测试
            timeout=30,
            max_retries=1
        )
        
        result = await chat_with_custom_model(test_request)
        
        return {
            "success": True,
            "message": "连接测试成功",
            "model": result.model,
            "response_preview": result.content[:100] + "..." if len(result.content) > 100 else result.content
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"连接测试失败: {str(e)}"
        }

