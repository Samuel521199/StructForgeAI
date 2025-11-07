"""
Chat Model API - 支持自定义AI模型配置和调用
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List, Union
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


async def _call_openai_responses_api(request: ChatModelRequest) -> ChatModelResponse:
    """
    使用 HTTP 请求直接调用 OpenAI Responses API
    
    支持：
    - 简单文本输入 (input: str)
    - 消息数组输入 (input: List[Dict])
    - instructions 参数
    - reasoning 参数
    - prompt 模板
    
    注意：OpenAI Python SDK 2.x 版本可能还不支持 responses API，
    因此直接使用 HTTP 请求调用。
    """
    try:
        # 验证 API Key 是否有效
        if not request.api_key or request.api_key.strip() == '':
            raise HTTPException(
                status_code=400,
                detail="API Key 不能为空"
            )
        if '${API_KEY}' in request.api_key:
            logger.warning(f"API Key 可能包含未替换的变量")
        
        # 解析请求体
        body_raw = parse_json_safe(request.request_body)
        
        # 准备变量替换
        variables = {
            'API_KEY': request.api_key,
            'PROMPT': request.prompt,
        }
        
        # 替换变量
        body_str = json.dumps(body_raw)
        body_str = replace_variables(body_str, variables)
        body = json.loads(body_str)
        
        # 检查是否还有未替换的变量
        if '${API_KEY}' in body_str:
            logger.warning("请求体中仍包含未替换的 ${API_KEY} 变量")
        
        # 提取参数
        model = body.get('model', 'gpt-5-nano')
        input_data = body.get('input')
        instructions = body.get('instructions')
        reasoning = body.get('reasoning')
        prompt = body.get('prompt')  # 可重用提示词模板
        temperature = body.get('temperature')
        max_tokens = body.get('max_tokens')
        
        # 如果没有 input，使用 prompt 字段
        if not input_data:
            input_data = request.prompt
        
        # 构建请求体
        request_body = {
            'model': model,
            'input': input_data,
        }
        
        # 添加可选参数
        if instructions:
            request_body['instructions'] = instructions
        if reasoning:
            request_body['reasoning'] = reasoning
        if prompt:
            request_body['prompt'] = prompt
        
        # 某些模型（如 gpt-5-nano）不支持 temperature 参数
        # 只在支持的模型上添加 temperature
        if temperature is not None:
            # gpt-5-nano 和其他某些模型不支持 temperature
            unsupported_models = ['gpt-5-nano']
            if model.lower() not in [m.lower() for m in unsupported_models]:
                request_body['temperature'] = temperature
            else:
                logger.warning(f"模型 {model} 不支持 temperature 参数，已忽略该参数值: {temperature}")
        
        # OpenAI Responses API 不支持 max_tokens 参数
        # 如果提供了 max_tokens，记录警告但不添加到请求中
        if max_tokens is not None:
            logger.warning(f"OpenAI Responses API 不支持 max_tokens 参数，已忽略该参数值: {max_tokens}")
            # Responses API 可能使用其他参数名，但目前文档未明确说明
            # 如果需要限制输出长度，可以在 instructions 中指定
        
        # 确定 API URL
        api_url = request.api_url or 'https://api.openai.com/v1/responses'
        
        # 准备请求头
        headers = {
            'Authorization': f'Bearer {request.api_key}',
            'Content-Type': 'application/json',
        }
        
        # 解析自定义请求头（如果有），并进行变量替换
        if request.request_headers:
            try:
                custom_headers_raw = parse_json_safe(request.request_headers)
                # 将自定义请求头转换为 JSON 字符串，进行变量替换，再解析回来
                custom_headers_str = json.dumps(custom_headers_raw)
                custom_headers_str = replace_variables(custom_headers_str, variables)
                custom_headers = json.loads(custom_headers_str)
                # 更新请求头（自定义请求头会覆盖默认请求头）
                headers.update(custom_headers)
            except Exception as e:
                logger.warning(f"解析自定义请求头失败: {e}")
        
        # 确保 Authorization 头正确设置（如果自定义请求头中没有设置）
        if 'Authorization' not in headers or '${API_KEY}' in headers.get('Authorization', ''):
            headers['Authorization'] = f'Bearer {request.api_key}'
        
        logger.info(f"调用 OpenAI Responses API, 模型: {model}, URL: {api_url}")
        logger.debug(f"请求体: {json.dumps({k: v for k, v in request_body.items() if k != 'input' or isinstance(v, str)}, ensure_ascii=False)[:500]}")
        
        # 发送 HTTP 请求
        response = requests.post(
            api_url,
            headers=headers,
            json=request_body,
            timeout=request.timeout
        )
        
        # 检查响应状态
        if response.status_code != 200:
            error_detail = response.text
            error_type = "API_ERROR"
            error_message = "OpenAI API 调用失败"
            
            try:
                error_json = response.json()
                error_obj = error_json.get('error', {})
                if isinstance(error_obj, dict):
                    error_detail = error_obj.get('message', error_detail)
                    error_type = error_obj.get('type', 'unknown')
                    error_code = error_obj.get('code', '')
                    
                    # 识别常见错误类型
                    if 'rate_limit' in error_type.lower() or 'rate' in error_detail.lower():
                        error_type = "RATE_LIMIT"
                        error_message = "API 调用频率超限，请稍后重试"
                    elif 'token' in error_detail.lower() or 'context_length' in error_detail.lower():
                        error_type = "TOKEN_LIMIT"
                        error_message = "Token 数量超出限制，请减少输入内容或使用更小的模型"
                    elif 'invalid_api_key' in error_type.lower() or 'authentication' in error_detail.lower():
                        error_type = "AUTH_ERROR"
                        error_message = "API Key 无效或已过期"
                    elif 'insufficient_quota' in error_detail.lower() or 'quota' in error_detail.lower():
                        error_type = "QUOTA_EXCEEDED"
                        error_message = "API 配额已用完，请检查账户余额"
            except:
                pass
            
            # 根据状态码补充错误信息
            if response.status_code == 429:
                error_type = "RATE_LIMIT"
                error_message = "请求过于频繁，请稍后重试"
            elif response.status_code == 401:
                error_type = "AUTH_ERROR"
                error_message = "API Key 认证失败"
            elif response.status_code == 400:
                error_type = "BAD_REQUEST"
                error_message = "请求参数错误"
            
            logger.error(f"OpenAI API 响应错误: {response.status_code}, 类型: {error_type}, 详情: {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=json.dumps({
                    "error_type": error_type,
                    "error_message": error_message,
                    "error_detail": error_detail,
                    "status_code": response.status_code
                }, ensure_ascii=False)
            )
        
        # 解析响应
        response_data = response.json()
        
        # 提取内容
        content = ""
        if 'output_text' in response_data:
            content = response_data['output_text']
        elif 'output' in response_data:
            output = response_data['output']
            if isinstance(output, dict) and 'content' in output:
                # output.content 是数组
                content_parts = output['content']
                if isinstance(content_parts, list):
                    text_parts = []
                    for part in content_parts:
                        if isinstance(part, dict) and 'text' in part:
                            text_parts.append(part['text'])
                        elif isinstance(part, str):
                            text_parts.append(part)
                    content = '\n'.join(text_parts) if text_parts else str(content_parts[0] if content_parts else '')
                else:
                    content = str(content_parts)
            elif isinstance(output, str):
                content = output
            else:
                content = str(output)
        
        # 获取模型名称
        model_name = response_data.get('model', model)
        
        # 获取使用情况
        usage = response_data.get('usage')
        if usage and isinstance(usage, dict):
            usage = {
                'prompt_tokens': usage.get('prompt_tokens', 0),
                'completion_tokens': usage.get('completion_tokens', 0),
                'total_tokens': usage.get('total_tokens', 0),
            }
        
        # 构建原始响应（用于调试）
        raw_response = {
            'model': model_name,
            'output_text': content,
            'usage': usage,
            'raw': response_data,
        }
        
        return ChatModelResponse(
            content=content,
            model=model_name,
            usage=usage,
            raw_response=raw_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI Responses API 调用失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API 调用失败: {str(e)}"
        )


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
        
        # 如果是 ChatGPT，使用 OpenAI SDK
        if model_type == 'chatgpt':
            return await _call_openai_responses_api(request)
        
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
            if model_type in ['deepseek']:
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
                # 记录请求详情（用于调试）
                logger.debug(f"发送请求到 {api_url}, 请求体: {json.dumps(body, ensure_ascii=False)[:500]}")
                
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=body,
                    timeout=request.timeout
                )
                
                # 如果状态码不是 2xx，记录详细错误信息
                if not response.ok:
                    error_detail = response.text[:500] if response.text else "无错误详情"
                    logger.error(f"API 返回错误状态码 {response.status_code}: {error_detail}")
                    # 尝试解析错误响应
                    try:
                        error_json = response.json()
                        error_message = error_json.get('error', {}).get('message', error_detail) if isinstance(error_json, dict) else error_detail
                        logger.error(f"API 错误详情: {error_message}")
                    except:
                        pass
                
                response.raise_for_status()
                break
            except requests.exceptions.Timeout as e:
                last_error = e
                logger.warning(f"请求超时，重试 {attempt + 1}/{request.max_retries}: {e}")
                if attempt < request.max_retries - 1:
                    continue
                else:
                    error_detail = json.dumps({
                        "error_type": "TIMEOUT",
                        "error_message": "请求超时",
                        "error_detail": f"请求超时（{request.timeout}秒），请检查网络连接或增加超时时间",
                        "timeout": request.timeout,
                        "retries": request.max_retries
                    }, ensure_ascii=False)
                    raise HTTPException(
                        status_code=504,
                        detail=error_detail
                    )
            except requests.exceptions.HTTPError as e:
                last_error = e
                error_detail = str(e)
                error_type = "HTTP_ERROR"
                error_message = "HTTP 请求错误"
                status_code = 400
                
                if hasattr(e, 'response') and e.response is not None:
                    status_code = e.response.status_code
                    error_detail = e.response.text[:500] if e.response.text else str(e)
                    try:
                        error_json = e.response.json()
                        if isinstance(error_json, dict):
                            error_obj = error_json.get('error', {})
                            if isinstance(error_obj, dict):
                                error_detail = error_obj.get('message', error_detail)
                                error_type = error_obj.get('type', 'http_error')
                                
                                # 识别常见错误类型
                                if 'rate_limit' in error_type.lower() or 'rate' in error_detail.lower():
                                    error_type = "RATE_LIMIT"
                                    error_message = "API 调用频率超限，请稍后重试"
                                elif 'token' in error_detail.lower() or 'context_length' in error_detail.lower():
                                    error_type = "TOKEN_LIMIT"
                                    error_message = "Token 数量超出限制，请减少输入内容"
                                elif 'invalid_api_key' in error_type.lower() or status_code == 401:
                                    error_type = "AUTH_ERROR"
                                    error_message = "API Key 无效或已过期"
                                elif 'insufficient_quota' in error_detail.lower():
                                    error_type = "QUOTA_EXCEEDED"
                                    error_message = "API 配额已用完，请检查账户余额"
                    except:
                        pass
                    
                    # 根据状态码补充错误信息
                    if status_code == 429:
                        error_type = "RATE_LIMIT"
                        error_message = "请求过于频繁，请稍后重试"
                    elif status_code == 401:
                        error_type = "AUTH_ERROR"
                        error_message = "API Key 认证失败"
                    elif status_code == 400:
                        error_type = "BAD_REQUEST"
                        error_message = "请求参数错误"
                
                logger.warning(f"HTTP 错误，重试 {attempt + 1}/{request.max_retries}: {status_code}, 类型: {error_type}, 详情: {error_detail}")
                if attempt < request.max_retries - 1:
                    continue
                else:
                    # 最后一次重试失败，返回详细错误信息
                    error_response = json.dumps({
                        "error_type": error_type,
                        "error_message": error_message,
                        "error_detail": error_detail,
                        "status_code": status_code
                    }, ensure_ascii=False)
                    raise HTTPException(
                        status_code=status_code,
                        detail=error_response
                    )
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(f"请求失败，重试 {attempt + 1}/{request.max_retries}: {e}")
                if attempt < request.max_retries - 1:
                    continue
                else:
                    error_type = "NETWORK_ERROR"
                    error_message = "网络连接错误"
                    if isinstance(e, requests.exceptions.ConnectionError):
                        error_type = "CONNECTION_ERROR"
                        error_message = "无法连接到服务器，请检查网络连接"
                    elif isinstance(e, requests.exceptions.Timeout):
                        error_type = "TIMEOUT"
                        error_message = "请求超时"
                    
                    error_response = json.dumps({
                        "error_type": error_type,
                        "error_message": error_message,
                        "error_detail": str(e),
                        "timeout": request.timeout
                    }, ensure_ascii=False)
                    raise HTTPException(
                        status_code=503,
                        detail=error_response
                    )
        
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
        elif model_type == 'chatgpt':
            # OpenAI Responses API 格式（新格式）
            if 'output' in result and 'content' in result['output']:
                # Responses API 格式: output.content 是数组
                content_parts = result['output']['content']
                if isinstance(content_parts, list) and len(content_parts) > 0:
                    # 提取所有文本内容
                    text_parts = []
                    for part in content_parts:
                        if isinstance(part, dict):
                            if part.get('type') == 'text' and 'text' in part:
                                text_parts.append(part['text'])
                            elif 'content' in part:
                                text_parts.append(str(part['content']))
                    content = '\n'.join(text_parts) if text_parts else str(content_parts[0])
                else:
                    content = str(content_parts)
                model_name = result.get('model', model_type)
                usage = result.get('usage', {})
            # OpenAI Chat Completions API 格式（旧格式，向后兼容）
            elif 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                model_name = result.get('model', model_type)
                usage = result.get('usage', {})
            elif 'message' in result:
                # Ollama 格式兼容
                content = result['message'].get('content', '')
                model_name = result.get('model', model_type)
        else:
            # DeepSeek/其他模型兼容格式
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
        
    except HTTPException:
        # 重新抛出 HTTPException（已经包含详细错误信息）
        raise
    except ValueError as e:
        logger.error(f"Chat Model 配置错误: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except requests.exceptions.RequestException as e:
        logger.error(f"Chat Model API 请求失败: {e}")
        error_message = str(e)
        # 提供更友好的错误信息
        if "timeout" in error_message.lower() or "timed out" in error_message.lower():
            raise HTTPException(
                status_code=504,
                detail=f"请求超时: {error_message}。请检查网络连接或增加超时时间。"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"API 请求失败: {error_message}"
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

