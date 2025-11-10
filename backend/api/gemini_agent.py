"""
Gemini Agent API - 支持 Google Gemini API 完整特性
支持：
- 文字、图片、文件内容输入
- 多模态输入（文本、图片）
- 系统提示词和指令
- 数据处理和采样
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field
import json
import requests
from pathlib import Path

from core.logging_config import logger
from api.base import AIWorkflowService
from core.config import settings
from datetime import datetime
import hashlib

router = APIRouter()
ai_service = AIWorkflowService()

# 缓存目录
CACHE_DIR = Path(settings.UPLOAD_DIR).parent / "cache" / "gemini_agent"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class InputContentItem(BaseModel):
    """输入内容项 - 支持文字、图片"""
    type: str  # input_text, input_image
    text: Optional[str] = None  # input_text 时使用
    image_url: Optional[str] = None  # input_image 时使用
    image_data: Optional[str] = None  # input_image 时使用 base64 编码的图片数据


class GeminiAgentRequest(BaseModel):
    """Gemini Agent 请求"""
    # API 配置
    api_key: str
    api_url: str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    model: str = "gemini-pro"
    
    # 系统提示词和指令
    system_prompt: Optional[str] = None
    instructions: Optional[str] = None
    
    # 输入内容（支持多种类型）
    input: Union[str, List[Dict[str, Any]], None] = None
    
    # 输入内容项（结构化输入）
    input_content: Optional[List[InputContentItem]] = None
    
    # 数据处理配置
    input_data: Optional[Dict[str, Any]] = None
    data_processing_mode: str = "smart"  # direct, smart, limit, summary
    data_limit_count: Optional[int] = None
    max_data_tokens: Optional[int] = None
    sample_strategy: str = "head_tail"
    
    # 输出配置
    output_format: str = "json"  # json, text, structured, markdown
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    
    # 请求配置
    timeout: int = 60
    max_retries: int = 3


def _get_gemini_agent_cache_key(
    input_data: Optional[Dict[str, Any]],
    input_content: Optional[List[InputContentItem]],
    system_prompt: Optional[str],
    instructions: Optional[str],
    model: str,
    output_format: str,
    data_processing_mode: str,
    sample_strategy: str
) -> str:
    """生成缓存键"""
    key_parts = []
    
    if input_data:
        key_parts.append(f"input_data:{json.dumps(input_data, sort_keys=True)}")
    
    if input_content:
        content_str = json.dumps([item.dict() for item in input_content], sort_keys=True)
        key_parts.append(f"input_content:{content_str}")
    
    if system_prompt:
        key_parts.append(f"system_prompt:{system_prompt}")
    
    if instructions:
        key_parts.append(f"instructions:{instructions}")
    
    key_parts.append(f"model:{model}")
    key_parts.append(f"output_format:{output_format}")
    key_parts.append(f"data_processing_mode:{data_processing_mode}")
    key_parts.append(f"sample_strategy:{sample_strategy}")
    
    key_str = "|".join(key_parts)
    return hashlib.md5(key_str.encode('utf-8')).hexdigest()


def _load_gemini_agent_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """加载缓存"""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if cache_file.exists():
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
                # 检查缓存是否过期（24小时）
                cached_at = datetime.fromisoformat(cached_data.get('cached_at', ''))
                if (datetime.now() - cached_at).total_seconds() < 86400:
                    logger.info(f"加载 Gemini Agent 缓存: {cache_key}")
                    return cached_data.get('result')
        except Exception as e:
            logger.warning(f"加载 Gemini Agent 缓存失败: {e}")
    return None


def _save_gemini_agent_cache(cache_key: str, result: Dict[str, Any]) -> None:
    """保存缓存"""
    try:
        cache_file = CACHE_DIR / f"{cache_key}.json"
        cache_data = {
            'cached_at': datetime.now().isoformat(),
            'result': result
        }
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        logger.info(f"保存 Gemini Agent 缓存: {cache_key}")
    except Exception as e:
        logger.warning(f"保存 Gemini Agent 缓存失败: {e}，继续执行")


def build_input_content(
    input_data: Optional[Dict[str, Any]],
    input_content: Optional[List[InputContentItem]]
) -> List[Dict[str, Any]]:
    """构建输入内容"""
    content_items = []
    
    # 处理用户配置的输入内容项
    if input_content:
        for item in input_content:
            item_dict = {"type": item.type}
            if item.type == "input_text" and item.text:
                item_dict["text"] = item.text
            elif item.type == "input_image":
                if item.image_url:
                    item_dict["image_url"] = item.image_url
                elif item.image_data:
                    item_dict["image_data"] = item.image_data
            content_items.append(item_dict)
    
    # 处理上游节点的数据
    if not content_items and input_data:
        data_text = json.dumps(input_data, ensure_ascii=False, indent=2)
        content_items.append({
            "type": "input_text",
            "text": data_text
        })
    
    return content_items


def _process_input_data(
    input_data: Dict[str, Any],
    mode: str = "smart",
    limit_count: Optional[int] = None,
    max_tokens: Optional[int] = None,
    sample_strategy: str = "head_tail"
) -> Dict[str, Any]:
    """处理输入数据（与 gpt_agent 相同的逻辑）"""
    from api.ai_workflow import _process_input_data as base_process
    return base_process(input_data, mode, limit_count, max_tokens, sample_strategy)


@router.post("/execute")
async def execute_gemini_agent(request: GeminiAgentRequest):
    """
    执行 Gemini Agent
    
    支持 Google Gemini API 的特性：
    - 文字、图片内容输入
    - 系统提示词和指令
    - 数据处理和采样
    
    缓存机制：
    - 如果输入数据和配置未变化，直接返回缓存结果
    """
    try:
        # 0. 生成缓存键并检查缓存
        cache_key = _get_gemini_agent_cache_key(
            input_data=request.input_data,
            input_content=request.input_content,
            system_prompt=request.system_prompt,
            instructions=request.instructions,
            model=request.model,
            output_format=request.output_format,
            data_processing_mode=request.data_processing_mode,
            sample_strategy=request.sample_strategy
        )
        
        cached_result = _load_gemini_agent_cache(cache_key)
        if cached_result is not None:
            logger.info("使用 Gemini Agent 缓存结果，跳过 API 调用")
            return ai_service.create_success_response(
                message="Gemini Agent 执行成功（使用缓存）",
                data=cached_result
            )
        
        # 1. 验证 API Key
        if not request.api_key or request.api_key.strip() == '':
            raise HTTPException(
                status_code=400,
                detail="API Key 不能为空"
            )
        
        # 2. 处理输入数据
        processed_input_data = None
        if request.input_data:
            processed_input_data = _process_input_data(
                input_data=request.input_data,
                mode=request.data_processing_mode,
                limit_count=request.data_limit_count,
                max_tokens=request.max_data_tokens,
                sample_strategy=request.sample_strategy
            )
        
        # 3. 构建输入内容
        input_content = None
        if request.input_content:
            input_content = request.input_content
        elif request.input:
            if isinstance(request.input, str):
                input_content = [InputContentItem(type="input_text", text=request.input)]
            else:
                input_content = request.input
        else:
            content_items = build_input_content(
                input_data=processed_input_data,
                input_content=None
            )
            if content_items:
                input_content = content_items
        
        # 4. 构建 Gemini API 请求体
        contents = []
        parts = []
        
        # 添加系统提示词和指令
        system_instruction = ""
        if request.instructions:
            if request.system_prompt:
                system_instruction = f"{request.system_prompt}\n\n{request.instructions}"
            else:
                system_instruction = request.instructions
        elif request.system_prompt:
            system_instruction = request.system_prompt
        
        # 构建内容部分
        if input_content:
            for item in input_content:
                # 处理 InputContentItem 对象或字典
                if isinstance(item, InputContentItem):
                    if item.type == "input_text" and item.text:
                        parts.append({"text": item.text})
                    elif item.type == "input_image":
                        if item.image_url:
                            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": item.image_url}})
                        elif item.image_data:
                            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": item.image_data}})
                elif isinstance(item, dict):
                    if item.get("type") == "input_text" and item.get("text"):
                        parts.append({"text": item["text"]})
                    elif item.get("type") == "input_image":
                        if item.get("image_url"):
                            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": item["image_url"]}})
                        elif item.get("image_data"):
                            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": item["image_data"]}})
        
        if parts:
            contents.append({"parts": parts})
        
        # 构建请求体
        request_body = {
            "contents": contents
        }
        
        if system_instruction:
            request_body["system_instruction"] = {
                "parts": [{"text": system_instruction}]
            }
        
        # 添加生成配置
        generation_config = {}
        if request.temperature is not None:
            generation_config["temperature"] = request.temperature
        if request.max_tokens is not None:
            generation_config["maxOutputTokens"] = request.max_tokens
        
        if generation_config:
            request_body["generationConfig"] = generation_config
        
        # 5. 构建 API URL（包含 API Key）
        api_url = request.api_url
        if "key=" not in api_url and "${API_KEY}" not in api_url:
            separator = "&" if "?" in api_url else "?"
            api_url = f"{api_url}{separator}key={request.api_key}"
        elif "${API_KEY}" in api_url:
            api_url = api_url.replace("${API_KEY}", request.api_key)
        
        # 6. 发送请求
        headers = {
            "Content-Type": "application/json"
        }
        
        last_error = None
        for attempt in range(request.max_retries):
            try:
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=request_body,
                    timeout=request.timeout
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    error_type = "API_ERROR"
                    error_message = "Gemini Agent API 调用失败"
                    
                    try:
                        error_json = response.json()
                        error_obj = error_json.get('error', {})
                        if isinstance(error_obj, dict):
                            error_detail = error_obj.get('message', error_detail)
                            error_type = error_obj.get('status', 'unknown')
                    except:
                        pass
                    
                    logger.error(f"Gemini Agent API 响应错误: {response.status_code}, 类型: {error_type}, 详情: {error_detail}")
                    
                    # 对于认证错误，不应该重试
                    if response.status_code in [400, 401, 403]:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=json.dumps({
                                "error_type": error_type,
                                "error_message": error_message,
                                "error_detail": error_detail,
                                "status_code": response.status_code
                            }, ensure_ascii=False)
                        )
                    
                    # 对于其他错误，根据状态码决定是否重试
                    should_retry = (
                        attempt < request.max_retries - 1 and
                        response.status_code not in [400, 401, 403, 404]
                    )
                    
                    if should_retry:
                        if response.status_code in [429, 503]:
                            wait_time = min(2 ** attempt, 60)
                            logger.info(f"遇到速率限制或服务过载，等待 {wait_time} 秒后重试...")
                            import time
                            time.sleep(wait_time)
                        continue
                    else:
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
                if 'candidates' in response_data and len(response_data['candidates']) > 0:
                    candidate = response_data['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        parts = candidate['content']['parts']
                        text_parts = [part.get('text', '') for part in parts if 'text' in part]
                        content = "\n".join(text_parts)
                
                if not content:
                    content = json.dumps(response_data, ensure_ascii=False, indent=2)
                
                # 构建结果
                result = {
                    "content": content,
                    "model": request.model,
                    "raw_response": response_data,
                    "usage": response_data.get('usageMetadata', {})
                }
                
                # 如果输出格式是 JSON，尝试解析
                if request.output_format == "json":
                    try:
                        result["data"] = json.loads(content)
                    except:
                        pass
                
                # 保存缓存
                _save_gemini_agent_cache(cache_key, result)
                
                return ai_service.create_success_response(
                    message="Gemini Agent 执行成功",
                    data=result
                )
                
            except requests.exceptions.Timeout as e:
                last_error = e
                logger.warning(f"请求超时，重试 {attempt + 1}/{request.max_retries}: {e}")
                if attempt < request.max_retries - 1:
                    continue
                else:
                    raise HTTPException(
                        status_code=504,
                        detail=f"请求超时（{request.timeout}秒）"
                    )
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(f"请求失败，重试 {attempt + 1}/{request.max_retries}: {e}")
                if attempt < request.max_retries - 1:
                    continue
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"API 请求失败: {str(e)}"
                    )
        
        if last_error:
            raise HTTPException(
                status_code=500,
                detail=f"Gemini Agent 执行失败: {str(last_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gemini Agent 执行失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"Gemini Agent 执行失败: {str(e)}")

