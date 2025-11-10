"""
GPT Agent API - 合并 AIAgent 和 ChatModel 功能，支持 ChatGPT Responses API 完整特性
支持：
- 文字、图片、文件内容输入
- Upload file 功能
- 远程调用 MCP 服务
- Agent 作为服务（多 Agent 协作）
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
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

# 缓存目录（与 files.py 保持一致）
CACHE_DIR = Path(settings.UPLOAD_DIR).parent / "cache" / "gpt_agent"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class InputContentItem(BaseModel):
    """输入内容项 - 支持文字、图片、文件"""
    type: str  # input_text, input_image, input_file
    text: Optional[str] = None  # input_text 时使用
    image_url: Optional[str] = None  # input_image 时使用
    file_url: Optional[str] = None  # input_file 时使用 URL
    file_id: Optional[str] = None  # input_file 时使用已上传的文件ID


class MCPServerConfig(BaseModel):
    """MCP 服务器配置"""
    type: str = "mcp"
    server_label: str
    server_description: str
    server_url: str
    require_approval: str = "never"  # never, always, on_first_use


class AgentConfig(BaseModel):
    """Agent 配置（用于多 Agent 协作）"""
    name: str
    instructions: str
    handoffs: Optional[List[str]] = None  # 其他 Agent 的名称列表


class GPTAgentRequest(BaseModel):
    """GPT Agent 请求 - 合并 AIAgent 和 ChatModel 的所有功能"""
    # API 配置
    api_key: str
    api_url: str = "https://api.openai.com/v1/responses"
    model: str = "gpt-5"
    
    # 系统提示词和指令
    system_prompt: Optional[str] = None
    instructions: Optional[str] = None  # 可重用提示词模板
    reasoning: Optional[bool] = None  # 是否启用推理模式
    
    # 输入内容（支持多种类型）
    input: Union[str, List[Dict[str, Any]], None] = None  # 可以是字符串、消息数组或内容项数组
    
    # 输入内容项（结构化输入）
    input_content: Optional[List[InputContentItem]] = None
    
    # 文件上传（用于 input_file）
    file_path: Optional[str] = None  # 本地文件路径
    file_purpose: str = "user_data"  # user_data, assistant
    
    # MCP 服务配置
    mcp_servers: Optional[List[MCPServerConfig]] = None
    
    # Agent 配置（多 Agent 协作）
    agents: Optional[List[AgentConfig]] = None
    agent_handoffs: Optional[Dict[str, List[str]]] = None  # Agent 名称 -> 可转交的 Agent 列表
    
    # 数据处理配置（来自 AIAgent）
    input_data: Optional[Dict[str, Any]] = None  # 上游节点的数据
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
    request_headers: Optional[str] = None  # JSON 字符串
    
    # Memory 配置（外接 Memory 节点）
    use_memory: Optional[bool] = False
    memory_connected: Optional[bool] = False
    memory_config: Optional[Dict[str, Any]] = None  # memory_type, memory_strategy, memory_ttl
    
    # Tool 配置（外接 Tool 节点）
    use_tool: Optional[bool] = False
    tool_connected: Optional[bool] = False
    tool_config: Optional[Dict[str, Any]] = None  # tool_type, tool_functions


class GPTAgentResponse(BaseModel):
    """GPT Agent 响应"""
    content: str
    model: str
    usage: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None
    file_id: Optional[str] = None  # 如果上传了文件，返回文件ID
    agent_output: Optional[str] = None  # Agent 输出（多 Agent 协作时）


async def upload_file_to_openai(file_path: str, api_key: str, purpose: str = "user_data") -> str:
    """
    上传文件到 OpenAI Files API
    
    Args:
        file_path: 本地文件路径
        api_key: OpenAI API Key
        purpose: 文件用途 (user_data, assistant)
        
    Returns:
        文件ID
    """
    try:
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            raise ValueError(f"文件不存在: {file_path}")
        
        with open(file_path_obj, "rb") as f:
            files = {
                "file": (file_path_obj.name, f, "application/octet-stream")
            }
            data = {
                "purpose": purpose
            }
            headers = {
                "Authorization": f"Bearer {api_key}"
            }
            
            response = requests.post(
                "https://api.openai.com/v1/files",
                headers=headers,
                files=files,
                data=data,
                timeout=60
            )
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_obj = error_json.get('error', {})
                    if isinstance(error_obj, dict):
                        error_detail = error_obj.get('message', error_detail)
                except:
                    pass
                
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"文件上传失败: {error_detail}"
                )
            
            result = response.json()
            file_id = result.get('id')
            if not file_id:
                raise ValueError("上传成功但未返回文件ID")
            
            logger.info(f"文件上传成功: {file_path} -> {file_id}")
            return file_id
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"文件上传失败: {str(e)}"
        )


def build_input_content(
    input_data: Optional[Dict[str, Any]] = None,
    input_content: Optional[List[InputContentItem]] = None,
    file_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    构建输入内容数组
    
    Args:
        input_data: 上游节点的数据
        input_content: 用户配置的输入内容项
        file_id: 上传的文件ID
        
    Returns:
        输入内容数组
    """
    content_items = []
    
    # 1. 处理用户配置的输入内容项
    if input_content:
        for item in input_content:
            item_dict = {"type": item.type}
            if item.type == "input_text" and item.text:
                item_dict["text"] = item.text
            elif item.type == "input_image" and item.image_url:
                item_dict["image_url"] = item.image_url
            elif item.type == "input_file":
                if item.file_id:
                    item_dict["file_id"] = item.file_id
                elif item.file_url:
                    item_dict["file_url"] = item.file_url
                elif file_id:
                    item_dict["file_id"] = file_id
            content_items.append(item_dict)
    
    # 2. 处理上游节点的数据（如果没有配置 input_content）
    if not content_items and input_data:
        # 检测是否为 XML 结构分析场景
        is_xml = (
            input_data.get("original_format") == "xml" or 
            input_data.get("output_format") == "xml" or
            (input_data.get("file_path") and input_data["file_path"].endswith(".xml"))
        )
        
        # 检查数据信息，判断是否进行了采样
        data_info = input_data.get("_data_info", {})
        is_sampled = data_info.get("all_included", True) == False
        original_count = data_info.get("original_count")
        processed_count = data_info.get("processed_count")
        
        # 将数据转换为文本
        data_text = json.dumps(input_data, ensure_ascii=False, indent=2)
        
        # 构建提示词
        if is_xml and is_sampled and processed_count == 1:
            # XML 结构分析场景：只提供了一个子项，需要推断整个结构
            prompt = f"""请分析以下 XML 文件的结构。这里只提供了一个代表性的子项（共 {original_count} 个子项），请根据这个子项推断出整个 XML 文件的结构：

1. **提取所有元素和属性**：识别子项中的所有字段、属性和嵌套结构
2. **识别数据类型**：确定每个字段的数据类型（字符串、数字、布尔值、枚举等）
3. **识别数据范围**：推断每个字段的可能取值范围（枚举值、数值范围等）
4. **识别嵌套关系**：识别子项中的嵌套子节点和层级关系
5. **识别字段约束**：推断哪些字段是必填的、哪些是可选的、是否有默认值

请生成详细的 Schema 分析报告，输出格式为 JSON。"""
        elif is_xml and is_sampled:
            # XML 数据，但采样了多个子项
            prompt = f"""请分析以下 XML 文件的结构。这里提供了 {processed_count} 个代表性子项（共 {original_count} 个子项），请根据这些子项推断出整个 XML 文件的结构：

1. **提取所有元素和属性**
2. **识别数据类型和范围**
3. **识别嵌套关系**
4. **识别字段约束**

请生成详细的 Schema 分析报告，输出格式为 JSON。"""
        elif is_xml:
            # XML 数据，但未采样（数据量不大）
            prompt = """请分析以下 XML 文件的结构：

1. **提取所有元素和属性**
2. **识别数据类型和范围**
3. **识别嵌套关系**
4. **识别字段约束**

请生成详细的 Schema 分析报告，输出格式为 JSON。"""
        else:
            # 非 XML 数据
            prompt = "请分析以下数据："
        
        content_items.append({
            "type": "input_text",
            "text": f"{prompt}\n\n{data_text}"
        })
    
    # 3. 如果上传了文件但没有配置 input_file，自动添加
    if file_id and not any(item.get("type") == "input_file" for item in content_items):
        content_items.append({
            "type": "input_file",
            "file_id": file_id
        })
    
    return content_items


def _process_input_data(
    input_data: Dict[str, Any],
    mode: str = "smart",
    limit_count: Optional[int] = None,
    max_tokens: Optional[int] = None,
    sample_strategy: str = "head_tail"
) -> Dict[str, Any]:
    """
    处理输入数据，根据配置限制数据量（复用 AIAgent 的逻辑）
    """
    from api.ai_workflow import _process_input_data as process_data
    return process_data(input_data, mode, limit_count, max_tokens, sample_strategy)


def _get_gpt_agent_cache_key(
    input_data: Optional[Dict[str, Any]],
    input_content: Optional[List[InputContentItem]],
    system_prompt: Optional[str],
    instructions: Optional[str],
    model: str,
    output_format: str,
    data_processing_mode: str,
    sample_strategy: str
) -> str:
    """
    生成 GPT Agent 缓存键
    
    Args:
        input_data: 输入数据
        input_content: 输入内容项
        system_prompt: 系统提示词
        instructions: 高级指令
        model: 模型名称
        output_format: 输出格式
        data_processing_mode: 数据处理模式
        sample_strategy: 采样策略
    
    Returns:
        缓存键（MD5哈希值）
    """
    # 构建缓存键字符串
    key_parts = []
    
    # 输入数据（只使用关键信息，避免过大）
    if input_data:
        # 提取关键信息：文件路径、数据摘要
        data_key = {
            "file_path": input_data.get("file_path"),
            "original_format": input_data.get("original_format"),
            "output_format": input_data.get("output_format"),
            "data_hash": hashlib.md5(
                json.dumps(input_data.get("data"), sort_keys=True, ensure_ascii=False).encode()
            ).hexdigest()[:16] if input_data.get("data") else None,
        }
        key_parts.append(json.dumps(data_key, sort_keys=True, ensure_ascii=False))
    
    # 输入内容（提取文本摘要）
    if input_content:
        text_parts = []
        for item in input_content:
            if hasattr(item, 'text') and item.text:
                text_parts.append(item.text[:200])  # 只取前200字符
            elif isinstance(item, dict) and item.get('text'):
                text_parts.append(item['text'][:200])
        if text_parts:
            key_parts.append("|".join(text_parts))
    
    # 配置信息
    config_key = {
        "system_prompt": system_prompt[:500] if system_prompt else None,  # 只取前500字符
        "instructions": instructions[:500] if instructions else None,
        "model": model,
        "output_format": output_format,
        "data_processing_mode": data_processing_mode,
        "sample_strategy": sample_strategy,
    }
    key_parts.append(json.dumps(config_key, sort_keys=True, ensure_ascii=False))
    
    # 生成MD5哈希
    key_str = "||".join(key_parts)
    return hashlib.md5(key_str.encode('utf-8')).hexdigest()


def _load_gpt_agent_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    加载 GPT Agent 缓存
    
    Args:
        cache_key: 缓存键
    
    Returns:
        缓存的执行结果，如果不存在则返回 None
    """
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None
    
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        logger.info(f"使用 GPT Agent 缓存结果，缓存键: {cache_key[:16]}...")
        return cache_data.get("result")
    
    except Exception as e:
        logger.warning(f"加载 GPT Agent 缓存失败: {e}")
        # 缓存文件损坏，删除它
        if cache_file.exists():
            cache_file.unlink()
        return None


def _save_gpt_agent_cache(cache_key: str, result: Dict[str, Any]) -> None:
    """
    保存 GPT Agent 缓存
    
    Args:
        cache_key: 缓存键
        result: 执行结果
    """
    try:
        cache_file = CACHE_DIR / f"{cache_key}.json"
        
        cache_data = {
            "cached_at": datetime.now().isoformat(),
            "result": result,
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"GPT Agent 缓存已保存，缓存键: {cache_key[:16]}...")
    
    except Exception as e:
        logger.warning(f"保存 GPT Agent 缓存失败: {e}，继续执行")


@router.post("/execute")
async def execute_gpt_agent(request: GPTAgentRequest):
    """
    执行 GPT Agent
    
    支持 ChatGPT Responses API 的所有特性：
    - 文字、图片、文件内容输入
    - Upload file 功能
    - 远程调用 MCP 服务
    - Agent 作为服务（多 Agent 协作）
    
    缓存机制：
    - 如果输入数据和配置未变化，直接返回缓存结果
    - 缓存键：基于输入数据、系统提示词、模型等生成
    """
    try:
        # 0. 生成缓存键并检查缓存
        cache_key = _get_gpt_agent_cache_key(
            input_data=request.input_data,
            input_content=request.input_content,
            system_prompt=request.system_prompt,
            instructions=request.instructions,
            model=request.model,
            output_format=request.output_format,
            data_processing_mode=request.data_processing_mode,
            sample_strategy=request.sample_strategy
        )
        
        cached_result = _load_gpt_agent_cache(cache_key)
        if cached_result is not None:
            logger.info("使用 GPT Agent 缓存结果，跳过 API 调用")
            return ai_service.create_success_response(
                message="GPT Agent 执行成功（使用缓存）",
                data=cached_result
            )
        
        # 1. 验证 API Key
        if not request.api_key or request.api_key.strip() == '':
            raise HTTPException(
                status_code=400,
                detail="API Key 不能为空"
            )
        
        # 2. 处理文件上传（如果需要）
        file_id = None
        if request.file_path:
            file_id = await upload_file_to_openai(
                request.file_path,
                request.api_key,
                request.file_purpose
            )
        
        # 3. 检索记忆（如果连接了 Memory 节点）
        memory_context = ""
        if request.use_memory and request.memory_connected and request.memory_config:
            try:
                from api.memory import search_memory, SearchMemoryRequest
                memory_config = request.memory_config
                # 构建检索查询（使用输入数据的摘要或关键词）
                query = ""
                if request.input_data:
                    # 从输入数据中提取关键信息作为查询
                    query = json.dumps(request.input_data, ensure_ascii=False)[:500]  # 限制长度
                elif request.input_content:
                    # 从输入内容中提取文本
                    text_parts = [item.text for item in request.input_content if hasattr(item, 'text') and item.text]
                    query = " ".join(text_parts)[:500]
                
                if query:
                    search_request = SearchMemoryRequest(
                        query=query,
                        memory_type=memory_config.get("memory_type", "workflow"),
                        limit=5  # 检索前5条相关记忆
                    )
                    memory_result = await search_memory(search_request)
                    if memory_result and memory_result.get("success"):
                        memories = memory_result.get("data", {}).get("memories", [])
                        if memories:
                            memory_context = "\n\n## 相关记忆\n"
                            for mem in memories:
                                memory_context += f"- {mem.get('content', '')}\n"
                            logger.info(f"检索到 {len(memories)} 条相关记忆")
            except Exception as e:
                logger.warning(f"记忆检索失败: {e}，继续执行")
        
        # 4. 处理输入数据（如果提供了 input_data）
        processed_input_data = None
        if request.input_data:
            processed_input_data = _process_input_data(
                input_data=request.input_data,
                mode=request.data_processing_mode,
                limit_count=request.data_limit_count,
                max_tokens=request.max_data_tokens,
                sample_strategy=request.sample_strategy
            )
        
        # 5. 构建输入内容
        input_content = None
        if request.input_content:
            # 使用用户配置的输入内容项
            input_content = request.input_content
        elif request.input:
            # 如果提供了 input（字符串或数组），直接使用
            if isinstance(request.input, str):
                input_content = [InputContentItem(type="input_text", text=request.input)]
            else:
                # 假设是消息数组或内容项数组
                input_content = request.input
        else:
            # 从 input_data 构建输入内容
            content_items = build_input_content(
                input_data=processed_input_data,
                file_id=file_id
            )
            if content_items:
                input_content = content_items
        
        # 5. 构建请求体
        request_body = {
            "model": request.model,
        }
        
        # 构建 input 字段
        if input_content:
            if isinstance(input_content, list) and len(input_content) > 0:
                # 如果是 InputContentItem 列表，转换为字典
                if isinstance(input_content[0], InputContentItem):
                    input_data = []
                    for item in input_content:
                        item_dict = {"type": item.type}
                        if item.type == "input_text" and item.text:
                            item_dict["text"] = item.text
                        elif item.type == "input_image" and item.image_url:
                            item_dict["image_url"] = item.image_url
                        elif item.type == "input_file":
                            if item.file_id:
                                item_dict["file_id"] = item.file_id
                            elif item.file_url:
                                item_dict["file_url"] = item.file_url
                        input_data.append(item_dict)
                    request_body["input"] = [{"role": "user", "content": input_data}]
                else:
                    # 已经是字典格式
                    request_body["input"] = input_content
            else:
                request_body["input"] = input_content
        
        # 添加可选参数
        # 对于 Responses API，使用 instructions 字段（而不是 system_prompt）
        # 如果提供了 system_prompt 但没有 instructions，将 system_prompt 作为 instructions 使用
        # 如果两者都提供了，合并它们（instructions 优先级更高）
        if request.instructions:
            if request.system_prompt:
                # 合并 system_prompt 和 instructions
                request_body["instructions"] = f"{request.system_prompt}\n\n{request.instructions}"
            else:
                request_body["instructions"] = request.instructions
        elif request.system_prompt:
            # 只有 system_prompt，将其作为 instructions 使用
            request_body["instructions"] = request.system_prompt
        
        if request.reasoning is not None:
            request_body["reasoning"] = request.reasoning
        
        # 检查模型是否支持 temperature 参数
        # GPT-5 系列模型不支持 temperature 参数
        model_name_lower = request.model.lower()
        supports_temperature = not (model_name_lower.startswith("gpt-5") or model_name_lower.startswith("o1"))
        
        if supports_temperature and request.temperature is not None:
            request_body["temperature"] = request.temperature
        
        # 检查模型是否支持 max_tokens 参数
        # GPT-5 系列模型可能不支持 max_tokens 参数
        supports_max_tokens = not (model_name_lower.startswith("gpt-5") or model_name_lower.startswith("o1"))
        
        if supports_max_tokens and request.max_tokens is not None:
            request_body["max_tokens"] = request.max_tokens
        
        # 添加 MCP 服务配置
        if request.mcp_servers:
            tools = []
            for mcp_config in request.mcp_servers:
                tools.append({
                    "type": mcp_config.type,
                    "server_label": mcp_config.server_label,
                    "server_description": mcp_config.server_description,
                    "server_url": mcp_config.server_url,
                    "require_approval": mcp_config.require_approval,
                })
            request_body["tools"] = tools
        
        # 添加 Tool 配置（如果连接了 Tool 节点）
        if request.use_tool and request.tool_connected and request.tool_config:
            tool_functions = request.tool_config.get("tool_functions", [])
            if tool_functions:
                # 将工具函数添加到 tools 数组
                if "tools" not in request_body:
                    request_body["tools"] = []
                # 将工具函数转换为 OpenAI 格式
                for func in tool_functions:
                    tool_def = {
                        "type": "function",
                        "function": {
                            "name": func.get("name", ""),
                            "description": func.get("description", ""),
                            "parameters": func.get("parameters", {}),
                        }
                    }
                    request_body["tools"].append(tool_def)
                logger.info(f"添加了 {len(tool_functions)} 个工具函数")
        
        # 如果有记忆上下文，添加到系统提示词或输入内容中
        if memory_context and request.system_prompt:
            request.system_prompt = request.system_prompt + memory_context
        elif memory_context:
            # 如果没有系统提示词，将记忆上下文添加到输入内容中
            if input_content and isinstance(input_content, list):
                # 在第一个文本输入前添加记忆上下文
                for item in input_content:
                    if isinstance(item, InputContentItem) and item.type == "input_text" and item.text:
                        item.text = memory_context + "\n\n" + item.text
                        break
                    elif isinstance(item, dict) and item.get("type") == "input_text" and item.get("text"):
                        item["text"] = memory_context + "\n\n" + item["text"]
                        break
        
        # 6. 准备请求头
        headers = {
            'Authorization': f'Bearer {request.api_key}',
            'Content-Type': 'application/json',
        }
        
        # 解析自定义请求头（如果有）
        if request.request_headers:
            try:
                custom_headers = json.loads(request.request_headers)
                headers.update(custom_headers)
            except Exception as e:
                logger.warning(f"解析自定义请求头失败: {e}")
        
        # 7. 发送请求
        logger.info(f"调用 GPT Agent API, 模型: {request.model}, URL: {request.api_url}")
        logger.debug(f"请求体: {json.dumps({k: v for k, v in request_body.items() if k != 'input' or isinstance(v, str)}, ensure_ascii=False)[:500]}")
        
        response = None
        last_error = None
        
        for attempt in range(request.max_retries):
            try:
                response = requests.post(
                    request.api_url,
                    headers=headers,
                    json=request_body,
                    timeout=request.timeout
                )
                
                if response.status_code != 200:
                    error_detail = response.text
                    error_type = "API_ERROR"
                    error_message = "GPT Agent API 调用失败"
                    suggestion = ""
                    
                    try:
                        error_json = response.json()
                        error_obj = error_json.get('error', {})
                        if isinstance(error_obj, dict):
                            error_detail = error_obj.get('message', error_detail)
                            error_type = error_obj.get('type', 'unknown')
                    except:
                        pass
                    
                    logger.error(f"GPT Agent API 响应错误: {response.status_code}, 类型: {error_type}, 详情: {error_detail}")
                    
                    # 根据状态码和错误类型提供友好的错误信息
                    if response.status_code == 401:
                        # 401 - Invalid Authentication / Incorrect API key / Organization / IP not authorized
                        if "invalid_api_key" in error_detail.lower() or "incorrect" in error_detail.lower():
                            error_type = "invalid_api_key"
                            error_message = "API Key 无效或错误"
                            suggestion = "请检查 API Key 是否正确，清除浏览器缓存，或生成新的 API Key。"
                        elif "organization" in error_detail.lower():
                            error_type = "organization_required"
                            error_message = "需要加入组织才能使用 API"
                            suggestion = "请联系我们加入新组织，或请组织管理员邀请您加入组织。"
                        elif "ip" in error_detail.lower() or "authorized" in error_detail.lower():
                            error_type = "ip_not_authorized"
                            error_message = "IP 地址未授权"
                            suggestion = "请从正确的 IP 地址发送请求，或更新您的 IP 白名单设置。"
                        else:
                            error_type = "authentication_error"
                            error_message = "身份验证失败"
                            suggestion = "请确保使用正确的 API Key 和请求组织。"
                    
                    elif response.status_code == 403:
                        # 403 - Country, region, or territory not supported
                        error_type = "region_not_supported"
                        error_message = "所在地区不支持 API 访问"
                        suggestion = "您所在的国家、地区或领土不支持访问此 API。请查看 OpenAI 支持的地区列表。"
                    
                    elif response.status_code == 429:
                        # 429 - Rate limit / Quota exceeded
                        if error_type == "insufficient_quota" or "quota" in error_detail.lower():
                            error_type = "insufficient_quota"
                            error_message = "API 配额不足"
                            error_detail = "您的 OpenAI API 配额已用完，请检查您的账户余额和订阅计划。"
                            suggestion = "请购买更多积分或了解如何提高限额。访问 https://platform.openai.com/account/billing"
                        elif "rate_limit" in error_type.lower() or "rate" in error_detail.lower():
                            error_type = "rate_limit"
                            error_message = "请求频率超限"
                            suggestion = "请降低请求频率。阅读速率限制指南。"
                        else:
                            error_type = "rate_limit"
                            error_message = "请求过于频繁"
                            suggestion = "请降低请求频率，稍后重试。"
                    
                    elif response.status_code == 404:
                        # 404 - Model not found
                        if "does not exist" in error_detail or "not found" in error_detail.lower():
                            error_type = "model_not_found"
                            error_message = "模型不存在或无法访问"
                            suggestion = f"模型 {request.model} 不存在或您没有访问权限，请选择其他模型。"
                    
                    elif response.status_code == 500:
                        # 500 - Server error
                        error_type = "server_error"
                        error_message = "服务器处理请求时出错"
                        suggestion = "请稍后重试。如果问题持续，请联系我们。查看状态页面：https://status.openai.com"
                    
                    elif response.status_code == 503:
                        # 503 - Overloaded / Slow Down
                        if "slow down" in error_detail.lower():
                            error_type = "slow_down"
                            error_message = "请求速率过快，请降低速率"
                            suggestion = "请将请求速率降低到原始水平，保持至少 15 分钟，然后逐渐增加。"
                        else:
                            error_type = "service_overloaded"
                            error_message = "服务器当前过载"
                            suggestion = "服务器正在经历高流量，请稍后重试。"
                    
                    # 对于配额错误和认证错误，不应该重试，直接返回友好错误
                    if response.status_code in [401, 403, 404] or (response.status_code == 429 and error_type == "insufficient_quota"):
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=json.dumps({
                                "error_type": error_type,
                                "error_message": error_message,
                                "error_detail": error_detail,
                                "status_code": response.status_code,
                                "suggestion": suggestion
                            }, ensure_ascii=False)
                        )
                    
                    # 对于其他错误，根据状态码决定是否重试
                    # 429 (rate_limit) 可以重试，但需要等待
                    # 500, 503 可以重试
                    # 400, 401, 403, 404 等错误不应该重试
                    should_retry = (
                        attempt < request.max_retries - 1 and
                        response.status_code not in [400, 401, 403, 404]
                    )
                    
                    if should_retry:
                        # 如果是 429 rate_limit 或 503，等待后重试
                        if response.status_code in [429, 503]:
                            wait_time = min(2 ** attempt, 60)  # 指数退避，最多等待60秒
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
                                "status_code": response.status_code,
                                "suggestion": suggestion
                            }, ensure_ascii=False)
                        )
                
                break
                
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
        
        if not response:
            raise Exception(f"请求失败: {last_error}")
        
        # 8. 解析响应
        response_data = response.json()
        
        # 9. 存储记忆（如果连接了 Memory 节点且配置了自动存储）
        if request.use_memory and request.memory_connected and request.memory_config:
            memory_strategy = request.memory_config.get("memory_strategy", "auto")
            if memory_strategy == "auto":
                try:
                    from api.memory import store_memory, StoreMemoryRequest
                    import hashlib
                    # 存储输入和输出
                    memory_key = f"gpt_agent_{hashlib.md5(str(request.input_data or request.input_content).encode()).hexdigest()}"
                    memory_value = {
                        "input": request.input_data or (request.input_content and [item.dict() if hasattr(item, 'dict') else item for item in request.input_content] or []),
                        "output": response_data,  # 存储完整响应
                        "timestamp": "now",
                    }
                    store_request = StoreMemoryRequest(
                        memory_type=request.memory_config.get("memory_type", "workflow"),
                        key=memory_key,
                        value=memory_value,
                        ttl=request.memory_config.get("memory_ttl", 0),
                    )
                    await store_memory(store_request)
                    logger.info("记忆已自动存储")
                except Exception as e:
                    logger.warning(f"记忆存储失败: {e}，继续执行")
        
        # 10. 提取内容
        content = ""
        if 'output_text' in response_data:
            content = response_data['output_text']
        elif 'output' in response_data:
            output = response_data['output']
            if isinstance(output, dict) and 'content' in output:
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
        model_name = response_data.get('model', request.model)
        
        # 获取使用情况
        usage = response_data.get('usage')
        if usage and isinstance(usage, dict):
            usage = {
                'prompt_tokens': usage.get('prompt_tokens', 0),
                'completion_tokens': usage.get('completion_tokens', 0),
                'total_tokens': usage.get('total_tokens', 0),
            }
        
        # 9. 构建返回结果
        result = {
            "input_data": request.input_data,  # 保留输入数据
            "hasData": True,
            "gpt_agent_response": {
                "model": model_name,
                "content": content,
                "usage": usage,
                "raw_response": response_data,
                "system_prompt": request.system_prompt,
                "instructions": request.instructions,
            },
            "data": content,  # 处理后的数据
            "gpt_agent_output": content,  # 原始回答内容
            "output_format": request.output_format,
            "file_id": file_id,  # 上传的文件ID
        }
        
        # 10. 保存缓存
        _save_gpt_agent_cache(cache_key, result)
        
        return ai_service.create_success_response(
            message="GPT Agent 执行成功",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GPT Agent 执行失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"GPT Agent 执行失败: {str(e)}")


@router.get("/cache")
async def get_gpt_agent_cache(
    input_data_hash: Optional[str] = None,
    system_prompt_hash: Optional[str] = None,
    model: Optional[str] = None,
    output_format: Optional[str] = None
):
    """
    获取 GPT Agent 缓存结果（如果存在）
    
    用于前端页面刷新后恢复节点执行结果
    
    Args:
        input_data_hash: 输入数据的哈希值（可选）
        system_prompt_hash: 系统提示词的哈希值（可选）
        model: 模型名称（可选）
        output_format: 输出格式（可选）
    
    Returns:
        缓存结果，如果不存在则返回 None
    """
    try:
        # 注意：这个接口主要用于查询，实际缓存键的生成更复杂
        # 前端应该通过 execute 接口自动使用缓存
        # 这里提供一个简单的查询接口，用于调试
        
        # 如果提供了所有参数，尝试查找缓存
        if input_data_hash and system_prompt_hash and model and output_format:
            # 遍历缓存目录，查找匹配的缓存
            for cache_file in CACHE_DIR.glob("*.json"):
                try:
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        cache_data = json.load(f)
                    result = cache_data.get("result", {})
                    
                    # 简单匹配（实际应该使用更精确的匹配逻辑）
                    if (result.get("gpt_agent_response", {}).get("model") == model and
                        result.get("output_format") == output_format):
                        logger.info(f"找到匹配的缓存: {cache_file.name}")
                        return {"cached": True, "result": result}
                except Exception as e:
                    logger.warning(f"读取缓存文件失败: {e}")
                    continue
        
        return {"cached": False, "result": None}
    
    except Exception as e:
        logger.warning(f"获取 GPT Agent 缓存失败: {e}")
        return {"cached": False, "result": None, "error": str(e)}


@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    api_key: str = None,
    purpose: str = "user_data"
):
    """
    上传文件到 OpenAI Files API
    
    Args:
        file: 上传的文件
        api_key: OpenAI API Key（如果未提供，从请求头获取）
        purpose: 文件用途
        
    Returns:
        文件ID和文件信息
    """
    try:
        # 获取 API Key（从请求参数或请求头）
        if not api_key:
            # TODO: 从请求头获取 API Key
            raise HTTPException(
                status_code=400,
                detail="API Key 不能为空"
            )
        
        # 保存临时文件
        temp_dir = Path(settings.UPLOAD_DIR) / "temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        temp_file_path = temp_dir / file.filename
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 上传到 OpenAI
        file_id = await upload_file_to_openai(
            str(temp_file_path),
            api_key,
            purpose
        )
        
        # 删除临时文件
        temp_file_path.unlink()
        
        return ai_service.create_success_response(
            message="文件上传成功",
            data={
                "file_id": file_id,
                "filename": file.filename,
                "purpose": purpose,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"文件上传失败: {str(e)}")

