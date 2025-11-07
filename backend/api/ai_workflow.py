"""
AI工作流节点API - 用于智能分析和生成工作流
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from api.base import AIWorkflowService
from core.logging_config import logger

router = APIRouter()
ai_service = AIWorkflowService()


class AnalyzeXMLStructureRequest(BaseModel):
    """分析XML结构请求"""
    xml_data: Dict[str, Any]  # 解析后的XML数据
    xml_schema: Optional[Dict[str, Any]] = None  # 可选的Schema
    sample_content: Optional[str] = None  # 可选的XML原始内容示例
    additional_context: Optional[str] = None  # 额外的上下文信息


class GenerateEditorConfigRequest(BaseModel):
    """生成编辑器配置请求"""
    xml_structure: Dict[str, Any]  # XML结构分析结果
    editor_type: str = "form"  # 编辑器类型: form, table, tree等
    custom_fields: Optional[List[str]] = None  # 自定义需要关注的字段


class SmartEditRequest(BaseModel):
    """智能编辑请求"""
    data: Dict[str, Any]  # 要编辑的数据
    instruction: str  # 自然语言指令
    xml_structure: Optional[Dict[str, Any]] = None  # XML结构信息（用于理解字段）
    editor_config: Optional[Dict[str, Any]] = None  # 编辑器配置


class GenerateWorkflowRequest(BaseModel):
    """生成工作流请求"""
    xml_structure: Dict[str, Any]  # XML结构分析结果
    editor_config: Optional[Dict[str, Any]] = None  # 编辑器配置
    workflow_type: str = "edit"  # 工作流类型: edit, validate, export等
    target_format: Optional[str] = None  # 目标格式: xml, json, yaml等


class AIAgentRequest(BaseModel):
    """AI Agent 执行请求"""
    # 输入数据（来自上游节点）
    input_data: Dict[str, Any]  # 解析文件节点的输出数据
    
    # AI Agent 配置
    system_prompt: str  # 系统提示词（必需）
    goal: Optional[str] = None  # 任务目标
    temperature: float = 0.7  # 温度参数
    max_tokens: int = 2000  # 最大输出长度
    output_format: str = "json"  # 输出格式: json, text, structured, markdown
    
    # 数据处理配置（用于控制输入数据量，避免超过Token限制）
    data_processing_mode: str = "smart"  # 数据处理模式: direct, smart, limit, summary
    data_limit_count: Optional[int] = None  # 数据条数限制（limit模式）
    max_data_tokens: Optional[int] = None  # 数据Token限制（smart模式）
    sample_strategy: str = "head_tail"  # 采样策略: head_tail, uniform, head, random
    
    # Chat Model 配置（从连接的节点获取）
    chat_model_config: Dict[str, Any]  # Chat Model 节点的配置
    # {
    #   "model_type": "chatgpt",
    #   "api_key": "...",
    #   "api_url": "...",
    #   "request_headers": "...",
    #   "request_body": "..."
    # }
    
    # Memory 配置（可选）
    use_memory: bool = False
    memory_config: Optional[Dict[str, Any]] = None


@router.post("/analyze-xml-structure")
async def analyze_xml_structure(request: AnalyzeXMLStructureRequest):
    """
    使用AI分析XML文件的完整结构
    
    分析内容包括：
    - 数据结构层次
    - 字段类型和约束
    - 业务逻辑关系
    - 编辑建议
    """
    try:
        # 构建AI提示词（增强版：业务逻辑理解）
        prompt = f"""请深入分析以下XML数据结构，特别关注业务逻辑和字段含义。

XML数据示例：
{request.xml_data}

{"Schema信息：" + str(request.xml_schema) if request.xml_schema else ""}
{"原始内容示例：" + request.sample_content[:2000] if request.sample_content else ""}
{"额外上下文：" + request.additional_context if request.additional_context else ""}

请进行以下深度分析：

1. **业务领域识别**
   - 这是什么类型的数据？（游戏装备、配置文件、数据表等）
   - 主要用途是什么？
   - 业务领域的关键特征

2. **枚举字段识别（重要）**
   - 识别所有可能的枚举字段及其所有可能值
   - **关键**：某些字段看起来是字符串，但实际是枚举值，必须从数据中提取所有唯一值
   - 例如：Type 字段的所有可能值（如 ["HandArmor", "BodyArmor", "LegArmor"]）
   - 例如：culture 字段的所有可能值（如 ["Culture.aserai", "Culture.neutral_culture", "Culture.khuzait"]）
   - 例如：modifier_group 的所有可能值（如 ["leather", "plate", "cloth"]）
   - 例如：material_type 的所有可能值（如 ["Leather", "Plate", "Cloth"]）
   - **必须从XML数据中提取所有唯一值**，不要遗漏任何可能的枚举值
   - 为每个枚举字段列出完整的所有可能值

3. **布尔值字段识别（重要）**
   - 识别所有布尔值字段（即使它们以字符串形式存储，如 "true"/"false"）
   - 例如：Flags 节点中的 Civilian="true" → 识别为布尔值字段
   - 例如：Flags 节点中的 Stealth="true" → 识别为布尔值字段
   - 例如：is_merchandise="false" → 识别为布尔值字段
   - 例如：covers_hands="false" → 识别为布尔值字段
   - **关键**：不要将这些字段识别为字符串，而是布尔值类型
   - 列出所有布尔值字段及其可能的取值（通常是 "true"/"false"）

4. **数值范围识别**
   - 识别所有数值字段的合理范围（基于实际数据计算，不要猜测）
   - 例如：weight 的范围 [min, max] 和典型值（从数据中计算实际范围）
   - 例如：arm_armor 的范围 [min, max] 和典型值
   - 例如：difficulty, appearance, stealth_factor 的范围
   - 为每个数值字段提供 min, max, default 建议（基于实际数据）

5. **字段关联关系**
   - 识别字段间的业务关联关系
   - 例如：modifier_group 和 material_type 的对应关系
   -    modifier_group="leather" → material_type="Leather"
   -    modifier_group="plate" → material_type="Plate"
   -    modifier_group="cloth" → material_type="Cloth"
   - 列出所有字段关联关系

6. **必填字段识别**
   - 哪些字段是必需的？（如 id, name, Type）
   - 哪些字段是可选的？（如 is_merchandise, difficulty）
   - 基于数据示例推断

7. **编辑建议**
   - 为每个字段提供默认值建议
   - 为每个字段提供验证规则建议
   - 为每个字段提供编辑提示（tooltip）

8. **数据路径建议**
   - 可编辑的数据路径（如 "Items.Item" 表示 Item 列表）

请以JSON格式返回分析结果，包含以下字段：
- business_domain: 业务领域描述
- enum_fields: {{字段名: [所有可能值列表]}}  # 必须包含所有枚举字段及其完整值列表
- boolean_fields: [布尔值字段列表]  # 新增：识别为布尔值的字段（如 ["Civilian", "Stealth", "is_merchandise", "covers_hands"]）
- numeric_ranges: {{字段名: {{min, max, default, typical}}}}  # 基于实际数据计算
- field_relationships: [{{field1, field2, relation_type, relation_rules}}]
- required_fields: [必填字段列表]
- optional_fields: [可选字段列表]
- validation_rules: {{字段名: {{规则类型, 规则值}}}}
- edit_suggestions: {{字段名: {{default, validation, hint, tooltip}}}}
- structure: 结构层次描述
- fields: 字段列表及其类型、约束（类型必须准确：enum, boolean, number, string）
- edit_paths: 可编辑的数据路径建议

**特别注意**：
- 枚举字段必须从数据中提取所有唯一值，不要遗漏
- 布尔值字段必须正确识别，即使以字符串形式存储（"true"/"false"）
- 数值范围必须基于实际数据计算，不要猜测
- 字段类型必须准确（enum, boolean, number, string）
"""
        
        system_role = "你是一个专业的XML数据结构分析专家，擅长分析XML文件的结构、字段类型、业务逻辑关系，并给出专业的编辑建议。"
        
        # 使用AI服务调用
        analysis_result = await ai_service.call_ai(
            system_role=system_role,
            user_prompt=prompt,
            operation_name="AI分析XML结构"
        )
        
        # 如果解析结果为空，创建默认结构
        if not analysis_result:
            analysis_result = {
                "structure": {"description": "AI分析结果"},
                "fields": [],
                "relationships": [],
                "required_fields": [],
                "validation_rules": {},
                "edit_paths": ["Items.Item"],
                "suggestions": []
            }
        
        return ai_service.create_success_response(
            message="XML结构分析完成",
            data={"analysis": analysis_result}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI分析XML结构失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"分析失败: {str(e)}")


@router.post("/generate-editor-config")
async def generate_editor_config(request: GenerateEditorConfigRequest):
    """
    根据XML结构分析结果生成编辑器配置
    
    生成适合编辑该XML的编辑器配置，包括：
    - 表单字段配置
    - 验证规则
    - UI布局建议
    - 编辑操作定义
    """
    try:
        prompt = f"""根据以下XML结构分析结果，生成一个完整的、智能的编辑器配置。

XML结构分析：
{request.xml_structure}

编辑器类型：{request.editor_type}
{"自定义字段：" + ", ".join(request.custom_fields) if request.custom_fields else ""}

特别注意：请充分利用结构分析中的以下信息：
- enum_fields: 为枚举字段生成下拉选项（type="select"）
- boolean_fields: 为布尔值字段生成开关控件（type="switch"）
- numeric_ranges: 为数值字段生成范围验证（type="number"，设置 min/max）
- field_relationships: 生成字段关联验证规则
- edit_suggestions: 使用建议的默认值和验证规则

**字段类型映射规则**：
- 如果字段在 enum_fields 中 → type="select"，options 从 enum_fields 获取
- 如果字段在 boolean_fields 中 → type="switch"，处理 "true"/"false" 字符串
- 如果字段在 numeric_ranges 中 → type="number"，validation 设置 min/max
- 其他 → type="text" 或 "textarea"

请生成一个JSON格式的编辑器配置，包含：

1. **fields配置**（每个字段包含）：
   - name: 字段名（支持嵌套路径，如 "ItemComponent.Armor.arm_armor"）
   - label: 显示标签（中文，易懂）
   - type: 字段类型（text, number, select, switch, textarea）
   - required: 是否必填（基于结构分析）
   - default: 默认值（基于结构分析的 edit_suggestions）
   - validation: 验证规则
     - 数值字段：{{min, max}}（基于 numeric_ranges）
     - 文本字段：{{pattern, maxLength}}
     - 关联字段：{{depends_on, rules}}（基于 field_relationships）
   - options: 下拉选项列表（如果是枚举字段，从 enum_fields 获取）
   - placeholder: 占位符提示
   - tooltip: 字段说明（从 edit_suggestions 获取）
   - group: 分组（用于UI布局，如 "基础属性", "护甲属性", "标志"）

2. **layout布局**：
   - sections: 分组配置
     - title: 分组标题（如 "基础属性", "嵌套属性", "标志"）
     - fields: 字段列表（按逻辑分组）
     - collapsible: 是否可折叠
   - field_order: 字段显示顺序（重要字段在前）

3. **operations操作**：
   - create: 支持创建新条目
   - update: 支持更新条目
   - delete: 支持删除条目
   - batch_create: 支持批量创建
   - batch_update: 支持批量更新
   - batch_delete: 支持批量删除
   - validate: 验证数据

4. **validation_rules验证规则**：
   - 基于结构分析的 validation_rules
   - 字段关联验证（如 material_type 和 modifier_group 的对应关系）

5. **paths数据路径**：
   - item_path: Item列表路径（如 "Items.Item"）
   - attribute_paths: 属性路径映射

示例字段配置（基于结构分析结果）：
{{
  "name": "Type",
  "label": "装备类型",
  "type": "select",
  "required": true,
  "default": "HandArmor",
  "options": ["HandArmor", "BodyArmor", "LegArmor"],  // 从 enum_fields.Type 获取
  "tooltip": "装备的类型，决定装备的用途"
}}

{{
  "name": "weight",
  "label": "重量",
  "type": "number",
  "required": false,
  "default": 1.0,  // 从 numeric_ranges.weight.default 获取
  "validation": {{"min": 0.1, "max": 10}},  // 从 numeric_ranges.weight 获取
  "tooltip": "装备的重量，影响角色移动速度"
}}

{{
  "name": "ItemComponent.Armor.material_type",
  "label": "材质类型",
  "type": "select",
  "required": false,
  "default": "Leather",
  "options": ["Leather", "Plate", "Cloth"],  // 从 enum_fields 获取
  "validation": {{
    "depends_on": "ItemComponent.Armor.modifier_group",
    "rules": {{"leather": "Leather", "plate": "Plate", "cloth": "Cloth"}}  // 从 field_relationships 获取
  }}
}}

请返回完整的JSON格式配置。
"""
        
        system_role = "你是一个专业的编辑器配置生成专家，擅长根据数据结构生成易用的编辑器配置。"
        
        # 使用AI服务调用
        editor_config = await ai_service.call_ai(
            system_role=system_role,
            user_prompt=prompt,
            operation_name="生成编辑器配置"
        )
        
        # 如果解析结果为空，创建默认配置
        if not editor_config:
            editor_config = {
                "fields": [],
                "layout": {"sections": []},
                "operations": ["create", "update", "delete"],
                "paths": ["Items.Item"]
            }
        
        return ai_service.create_success_response(
            message="编辑器配置生成完成",
            data={"editor_config": editor_config}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成编辑器配置失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"生成失败: {str(e)}")


@router.post("/smart-edit")
async def smart_edit(request: SmartEditRequest):
    """
    基于AI理解的智能编辑
    
    根据自然语言指令，智能地编辑XML数据
    """
    try:
        prompt = f"""请根据以下自然语言指令，编辑XML数据。

当前数据：
{request.data}

指令：{request.instruction}

{"XML结构信息：" + str(request.xml_structure) if request.xml_structure else ""}
{"编辑器配置：" + str(request.editor_config) if request.editor_config else ""}

请分析指令并执行相应的编辑操作：
1. 理解指令的意图（创建、更新、删除、查询等）
2. 确定要操作的数据路径
3. 确定操作的具体内容
4. 返回编辑后的数据

请以JSON格式返回，包含：
- operation: 操作类型（create, update, delete, query）
- path: 数据路径
- changes: 具体变更内容
- edited_data: 编辑后的数据
- explanation: 操作说明
"""
        
        system_role = "你是一个智能数据编辑助手，能够理解自然语言指令并准确地编辑XML数据。"
        
        logger.info(f"开始智能编辑，指令: {request.instruction}")
        
        # 使用AI服务调用
        edit_result = await ai_service.call_ai(
            system_role=system_role,
            user_prompt=prompt,
            operation_name="智能编辑"
        )
        
        # 确保包含edited_data
        if not edit_result:
            edit_result = {}
        if "edited_data" not in edit_result:
            edit_result["edited_data"] = request.data
        
        return ai_service.create_success_response(
            message="智能编辑完成",
            data={"result": edit_result}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"智能编辑失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"编辑失败: {str(e)}")


@router.post("/ai-agent")
async def execute_ai_agent(request: AIAgentRequest):
    """
    AI Agent 节点执行端点
    负责：构建提示词、调用Chat Model、处理输出等所有计算逻辑
    
    前端只负责收集配置和数据，然后调用此端点
    """
    try:
        from api.chat_model import chat_with_custom_model, ChatModelRequest
        import json
        
        # 1. 处理输入数据（根据配置限制数据量）
        processed_input_data = _process_input_data(
            input_data=request.input_data,
            mode=request.data_processing_mode,
            limit_count=request.data_limit_count,
            max_tokens=request.max_data_tokens,
            sample_strategy=request.sample_strategy
        )
        
        # 2. 构建用户提示词（后端完成）
        user_prompt = _build_user_prompt(
            input_data=processed_input_data,
            goal=request.goal,
            output_format=request.output_format
        )
        
        # 2. 检索记忆（如果启用）
        memory_context = ""
        if request.use_memory and request.memory_config:
            # TODO: 实现记忆检索逻辑
            pass
        
        # 3. 构建完整提示词（系统提示词 + 记忆上下文 + 用户提示词）
        full_prompt = ""
        if request.system_prompt and request.system_prompt.strip():
            full_prompt += f"# 系统角色\n{request.system_prompt}\n\n---\n\n"
        if memory_context:
            full_prompt += f"## 相关记忆\n{memory_context}\n\n---\n\n"
        full_prompt += user_prompt
        
        # 4. 调用Chat Model（后端完成）
        chat_model_request = ChatModelRequest(
            model_type=request.chat_model_config.get("model_type", "chatgpt"),
            api_key=request.chat_model_config.get("api_key", ""),
            api_url=request.chat_model_config.get("api_url", ""),
            request_headers=request.chat_model_config.get("request_headers", ""),
            request_body=request.chat_model_config.get("request_body", "{}"),
            prompt=full_prompt,
            timeout=30,
            max_retries=3
        )
        
        # 更新request_body中的temperature和max_tokens
        try:
            body_dict = json.loads(chat_model_request.request_body)
            body_dict["temperature"] = request.temperature
            body_dict["max_tokens"] = request.max_tokens
            chat_model_request.request_body = json.dumps(body_dict)
        except:
            chat_model_request.request_body = json.dumps({
                "temperature": request.temperature,
                "max_tokens": request.max_tokens
            })
        
        chat_response = await chat_with_custom_model(chat_model_request)
        
        # 5. 处理输出数据（后端完成）
        processed_output = _process_output(chat_response.content, request.output_format)
        
        # 6. 存储记忆（如果启用）
        if request.use_memory and request.memory_config:
            # TODO: 实现记忆存储逻辑
            pass
        
        # 7. 构建返回结果
        result = {
            "input_data": request.input_data,  # 保留输入数据
            "hasData": True,
            "chat_model_response": {
                "model": chat_response.model,
                "content": chat_response.content,
                "usage": chat_response.usage,
                "raw_response": chat_response.raw_response,
                "prompt": user_prompt,  # 用户提示词（不包含系统提示词）
                "system_prompt": request.system_prompt,  # 系统提示词
                "model_type": request.chat_model_config.get("model_type", "chatgpt"),
            },
            "data": processed_output,  # 处理后的数据
            "ai_agent_output": chat_response.content,  # 原始回答内容
            "output_format": request.output_format,
        }
        
        return ai_service.create_success_response(
            message="AI Agent 执行成功",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Agent 执行失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"AI Agent 执行失败: {str(e)}")


def _process_input_data(
    input_data: Dict[str, Any],
    mode: str = "smart",
    limit_count: Optional[int] = None,
    max_tokens: Optional[int] = None,
    sample_strategy: str = "head_tail"
) -> Dict[str, Any]:
    """
    处理输入数据，根据配置限制数据量，避免超过Token限制
    
    对于XML格式，会智能采样根节点下的子节点，确保覆盖不同类型的子节点内容
    
    Args:
        input_data: 原始输入数据
        mode: 数据处理模式 (direct, smart, limit, summary)
        limit_count: 数据条数限制（limit模式）
        max_tokens: 数据Token限制（smart模式，估算值）
        sample_strategy: 采样策略 (head_tail, uniform, head, random)
    
    Returns:
        处理后的输入数据
    """
    import json
    import random
    
    if mode == "direct":
        # 直接传递，不做处理
        return input_data
    
    # 检测是否为XML格式
    is_xml = (
        input_data.get("original_format") == "xml" or 
        input_data.get("output_format") == "xml" or
        (input_data.get("file_path") and input_data["file_path"].endswith(".xml"))
    )
    
    # 复制输入数据，避免修改原始数据
    processed = input_data.copy()
    
    # 处理 data 字段
    if "data" in processed and processed["data"] is not None:
        data = processed["data"]
        
        if isinstance(data, list):
            # 数组数据（Table格式）
            total_count = len(data)
            
            if mode == "limit":
                # 限制数量模式：只保留前N条
                limit = limit_count or 10
                processed["data"] = data[:limit]
                processed["_data_info"] = {
                    "original_count": total_count,
                    "processed_count": min(limit, total_count),
                    "mode": "limit"
                }
            
            elif mode == "smart":
                # 智能采样模式：根据Token限制智能采样
                max_tokens_limit = max_tokens or 4000
                
                # 估算每条记录的Token数（粗略估算：JSON字符串长度 / 4）
                if total_count > 0:
                    sample_item = data[0]
                    sample_json = json.dumps(sample_item, ensure_ascii=False)
                    estimated_tokens_per_item = len(sample_json) // 4
                    
                    # 计算可以包含的记录数（留一些余量）
                    max_items = max(1, (max_tokens_limit * 3 // 4) // estimated_tokens_per_item)
                    
                    if total_count <= max_items:
                        # 数据量不大，全部保留
                        processed["data"] = data
                        processed["_data_info"] = {
                            "original_count": total_count,
                            "processed_count": total_count,
                            "mode": "smart",
                            "all_included": True
                        }
                    else:
                        # 需要采样
                        if is_xml:
                            # XML格式：智能采样，确保覆盖不同类型的子节点
                            processed["data"] = _smart_sample_xml_items(data, max_items, sample_strategy)
                        else:
                            # 非XML格式：使用常规采样策略
                            if sample_strategy == "head_tail":
                                head_count = max_items // 2
                                tail_count = max_items - head_count
                                processed["data"] = data[:head_count] + data[-tail_count:]
                            elif sample_strategy == "uniform":
                                step = total_count // max_items
                                processed["data"] = [data[i] for i in range(0, total_count, step)][:max_items]
                            elif sample_strategy == "head":
                                processed["data"] = data[:max_items]
                            elif sample_strategy == "random":
                                processed["data"] = random.sample(data, min(max_items, total_count))
                            else:
                                head_count = max_items // 2
                                tail_count = max_items - head_count
                                processed["data"] = data[:head_count] + data[-tail_count:]
                        
                        processed["_data_info"] = {
                            "original_count": total_count,
                            "processed_count": len(processed["data"]),
                            "mode": "smart",
                            "strategy": sample_strategy,
                            "is_xml": is_xml,
                            "all_included": False
                        }
            
            elif mode == "summary":
                # 摘要模式：生成数据摘要（暂时使用采样，后续可以增强）
                limit = limit_count or 5
                if is_xml:
                    # XML格式：智能采样
                    processed["data"] = _smart_sample_xml_items(data, limit, "diverse")
                else:
                    processed["data"] = data[:limit]
                processed["_data_info"] = {
                    "original_count": total_count,
                    "processed_count": len(processed["data"]),
                    "mode": "summary",
                    "note": "摘要模式：仅显示前N条作为示例",
                    "is_xml": is_xml
                }
        
        elif isinstance(data, dict):
            # 字典数据：可能是XML的根节点结构
            if is_xml:
                # XML格式：查找根节点下的子节点列表
                child_list = _find_xml_child_list(data)
                if child_list:
                    # 找到了子节点列表，进行智能采样
                    total_count = len(child_list["items"])
                    max_items = limit_count or (max_tokens and max(1, (max_tokens * 3 // 4) // 200) or 10)
                    
                    if mode == "smart" and max_tokens:
                        # 估算每条记录的Token数
                        if total_count > 0:
                            sample_item = child_list["items"][0]
                            sample_json = json.dumps(sample_item, ensure_ascii=False)
                            estimated_tokens_per_item = len(sample_json) // 4
                            max_items = max(1, (max_tokens * 3 // 4) // estimated_tokens_per_item)
                    
                    if total_count > max_items:
                        # 需要采样
                        sampled_items = _smart_sample_xml_items(
                            child_list["items"], 
                            max_items, 
                            sample_strategy if mode == "smart" else "diverse"
                        )
                        # 更新字典中的子节点列表
                        if isinstance(data[child_list["key"]], list):
                            data[child_list["key"]] = sampled_items
                        else:
                            # 如果原来不是列表，需要转换为列表
                            data[child_list["key"]] = sampled_items
                        
                        processed["_data_info"] = {
                            "original_count": total_count,
                            "processed_count": len(sampled_items),
                            "mode": mode,
                            "strategy": sample_strategy if mode == "smart" else "diverse",
                            "is_xml": True,
                            "child_key": child_list["key"],
                            "all_included": False
                        }
                    else:
                        processed["_data_info"] = {
                            "original_count": total_count,
                            "processed_count": total_count,
                            "mode": mode,
                            "is_xml": True,
                            "child_key": child_list["key"],
                            "all_included": True
                        }
            elif mode == "limit" or mode == "summary":
                # 对于非XML字典，限制模式暂时不做处理（可以后续增强）
                pass
    
    return processed


def _find_xml_child_list(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    查找XML根节点下的子节点列表（如Item列表）
    
    Returns:
        {"key": "Item", "items": [...]} 或 None
    """
    if not isinstance(data, dict):
        return None
    
    # 查找最大的列表字段（通常是子节点列表）
    max_list_key = None
    max_list_size = 0
    
    for key, value in data.items():
        # 跳过特殊字段
        if key in ["@attributes", "#text"]:
            continue
        
        if isinstance(value, list) and len(value) > max_list_size:
            # 检查列表中的元素是否为对象（子节点）
            if value and isinstance(value[0], dict):
                max_list_key = key
                max_list_size = len(value)
    
    if max_list_key:
        return {
            "key": max_list_key,
            "items": data[max_list_key]
        }
    
    return None


def _smart_sample_xml_items(
    items: List[Dict[str, Any]], 
    max_items: int, 
    strategy: str = "diverse"
) -> List[Dict[str, Any]]:
    """
    智能采样XML子节点，确保覆盖不同类型的子节点内容
    
    策略：
    1. 识别子节点的不同属性值和字段值
    2. 确保采样到多样化的样本（不同的枚举值、不同的数值范围等）
    3. 避免遗漏重要的选项或内容
    
    Args:
        items: 子节点列表
        max_items: 最大采样数量
        strategy: 采样策略 (diverse, head_tail, uniform, head, random)
    
    Returns:
        采样后的子节点列表
    """
    import random
    
    total_count = len(items)
    if total_count <= max_items:
        return items
    
    if strategy == "diverse":
        # 多样化采样：确保覆盖不同类型的子节点
        sampled = []
        sampled_indices = set()
        
        # 1. 分析子节点的字段多样性
        field_variations = {}  # {field_name: {value: [indices]}}
        
        for idx, item in enumerate(items):
            if isinstance(item, dict):
                # 处理普通字段
                for key, value in item.items():
                    if key in ["@attributes", "#text"]:
                        continue
                    
                    # 将值转换为字符串作为键（用于分组）
                    value_key = str(value)
                    
                    if key not in field_variations:
                        field_variations[key] = {}
                    if value_key not in field_variations[key]:
                        field_variations[key][value_key] = []
                    field_variations[key][value_key].append(idx)
                
                # 处理XML属性（@attributes）
                if "@attributes" in item and isinstance(item["@attributes"], dict):
                    for attr_key, attr_value in item["@attributes"].items():
                        attr_field = f"@attributes.{attr_key}"
                        value_key = str(attr_value)
                        
                        if attr_field not in field_variations:
                            field_variations[attr_field] = {}
                        if value_key not in field_variations[attr_field]:
                            field_variations[attr_field][value_key] = []
                        field_variations[attr_field][value_key].append(idx)
        
        # 2. 优先采样：确保每个字段的不同值都被采样到
        # 对于每个字段，至少采样一个不同的值
        for field_name, variations in field_variations.items():
            if len(sampled) >= max_items:
                break
            
            # 按值的出现频率排序，优先采样出现频率较低的值（可能是特殊值）
            sorted_variations = sorted(
                variations.items(), 
                key=lambda x: len(x[1])
            )
            
            for value_key, indices in sorted_variations:
                if len(sampled) >= max_items:
                    break
                
                # 从该值的索引中随机选择一个
                available_indices = [i for i in indices if i not in sampled_indices]
                if available_indices:
                    chosen_idx = random.choice(available_indices)
                    sampled.append(items[chosen_idx])
                    sampled_indices.add(chosen_idx)
        
        # 3. 如果还有空间，使用首尾采样补充
        remaining = max_items - len(sampled)
        if remaining > 0:
            # 从开头和结尾补充
            head_count = remaining // 2
            tail_count = remaining - head_count
            
            for i in range(head_count):
                if i not in sampled_indices and i < total_count:
                    sampled.append(items[i])
                    sampled_indices.add(i)
            
            for i in range(tail_count):
                idx = total_count - 1 - i
                if idx not in sampled_indices and idx >= 0:
                    sampled.append(items[idx])
                    sampled_indices.add(idx)
        
        # 4. 如果还有空间，随机补充
        remaining = max_items - len(sampled)
        if remaining > 0:
            available_indices = [i for i in range(total_count) if i not in sampled_indices]
            if available_indices:
                additional = random.sample(
                    available_indices, 
                    min(remaining, len(available_indices))
                )
                for idx in additional:
                    sampled.append(items[idx])
        
        return sampled[:max_items]
    
    elif strategy == "head_tail":
        # 首尾采样：保留开头和结尾的数据
        head_count = max_items // 2
        tail_count = max_items - head_count
        return items[:head_count] + items[-tail_count:]
    
    elif strategy == "uniform":
        # 均匀采样
        step = total_count // max_items
        return [items[i] for i in range(0, total_count, step)][:max_items]
    
    elif strategy == "head":
        # 仅开头
        return items[:max_items]
    
    elif strategy == "random":
        # 随机采样
        return random.sample(items, min(max_items, total_count))
    
    else:
        # 默认使用多样化采样
        return _smart_sample_xml_items(items, max_items, "diverse")


def _build_user_prompt(input_data: Dict[str, Any], goal: Optional[str], output_format: str) -> str:
    """
    构建用户提示词（后端完成）
    从解析文件的输出信息构建完整的用户提示词，包括任务目标、输入数据等
    """
    prompt = ""
    
    # 1. 任务目标（如果配置了）
    if goal and goal.strip():
        prompt += f"## 任务目标\n{goal}\n\n"
    
    # 2. 输入数据描述
    prompt += "## 输入数据\n"
    
    # 根据输入数据的格式和内容智能构建提示词
    input_format = input_data.get("original_format") or input_data.get("output_format")
    
    if input_data.get("file_path"):
        prompt += f"**文件路径**：{input_data['file_path']}\n"
        if input_format:
            prompt += f"**文件格式**：{input_format.upper()}\n"
        prompt += "\n"
    
    # 处理不同格式的输入数据
    if input_data.get("data"):
        data = input_data["data"]
        # 如果是数组（Table格式）
        if isinstance(data, list):
            total_count = len(data)
            data_info = input_data.get("_data_info", {})
            
            # 显示数据信息（如果进行了采样）
            if data_info and not data_info.get("all_included", True):
                original_count = data_info.get("original_count", total_count)
                processed_count = data_info.get("processed_count", total_count)
                mode = data_info.get("mode", "unknown")
                strategy = data_info.get("strategy", "")
                
                prompt += f"**数据格式**：表格数据（共 {original_count} 条记录，已采样 {processed_count} 条用于分析）\n"
                if strategy:
                    prompt += f"**采样策略**：{strategy}\n"
                prompt += "\n"
            else:
                prompt += f"**数据格式**：表格数据（{total_count} 条记录）\n\n"
            
            # 显示数据内容（如果数据量不大，全部显示；否则只显示采样后的数据）
            prompt += f"**数据内容**：\n```json\n{json.dumps(data, ensure_ascii=False, indent=2)}"
            if data_info and not data_info.get("all_included", True):
                original_count = data_info.get("original_count", total_count)
                prompt += f"\n... (共 {original_count} 条记录，已采样 {len(data)} 条)"
            prompt += "\n```\n\n"
        # 如果是字典
        elif isinstance(data, dict):
            prompt += "**数据格式**：结构化数据\n\n"
            prompt += f"**数据内容**：\n```json\n{json.dumps(data, ensure_ascii=False, indent=2)}\n```\n\n"
        # 其他类型
        else:
            prompt += f"**数据内容**：{str(data)}\n\n"
    
    # 如果有Schema信息
    if input_data.get("schema"):
        prompt += "**数据结构（Schema）**：\n```json\n"
        prompt += f"{json.dumps(input_data['schema'], ensure_ascii=False, indent=2)}\n```\n\n"
    
    # 如果有分析结果
    if input_data.get("analysis"):
        prompt += "**结构分析结果**：\n```json\n"
        prompt += f"{json.dumps(input_data['analysis'], ensure_ascii=False, indent=2)}\n```\n\n"
    
    # 如果有编辑器配置
    if input_data.get("editor_config"):
        prompt += "**编辑器配置**：\n```json\n"
        prompt += f"{json.dumps(input_data['editor_config'], ensure_ascii=False, indent=2)}\n```\n\n"
    
    # 3. 输出要求
    prompt += "## 输出要求\n"
    format_descriptions = {
        "json": "JSON格式（纯JSON对象或数组，不要包含其他文本）",
        "text": "纯文本格式",
        "structured": "结构化数据格式（可以是JSON、XML等）",
        "markdown": "Markdown格式",
    }
    prompt += f"请按照 **{format_descriptions.get(output_format, output_format)}** 输出结果。\n"
    
    if output_format == "json":
        prompt += "\n**重要**：输出必须是有效的JSON格式，不要包含任何解释性文字，只输出JSON内容。\n"
    
    return prompt


def _process_output(content: str, output_format: str) -> Any:
    """
    处理输出数据（后端完成）
    根据output_format格式化Chat Model的回答
    """
    if output_format == "json":
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # 如果不是有效JSON，尝试提取JSON部分
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            return {"content": content}
    
    # 其他格式直接返回内容
    return {"content": content}


@router.post("/generate-workflow")
async def generate_workflow(request: GenerateWorkflowRequest):
    """
    根据XML结构分析和编辑器配置，生成完整的工作流定义
    
    生成一个可用的工作流，包含所有必要的节点和配置
    """
    try:
        prompt = f"""根据以下XML结构分析和编辑器配置，生成一个完整的工作流定义。

XML结构分析：
{request.xml_structure}

{"编辑器配置：" + str(request.editor_config) if request.editor_config else ""}

工作流类型：{request.workflow_type}
{"目标格式：" + request.target_format if request.target_format else ""}

请生成一个完整的工作流定义（JSON格式），包含：
1. workflow_name: 工作流名称
2. workflow_description: 工作流描述
3. nodes: 节点列表，每个节点包含：
   - id: 节点ID
   - type: 节点类型（parse_file, analyze_xml_structure, generate_editor_config, smart_edit, edit_data, validate_data, export_file等）
   - label: 节点标签
   - config: 节点配置
   - position: 节点位置

4. edges: 连接列表，每个连接包含：
   - source: 源节点ID
   - target: 目标节点ID
   - sourceHandle: 源句柄
   - targetHandle: 目标句柄

5. workflow_steps: 工作流步骤说明

请返回JSON格式的工作流定义。
"""
        
        system_role = "你是一个工作流设计专家，擅长根据数据结构和需求生成完整的工作流定义。"
        
        # 使用AI服务调用
        workflow_def = await ai_service.call_ai(
            system_role=system_role,
            user_prompt=prompt,
            operation_name="生成工作流定义"
        )
        
        # 如果解析结果为空，创建默认工作流结构
        if not workflow_def:
            workflow_def = {
                "workflow_name": "XML编辑器工作流",
                "workflow_description": "基于AI的XML编辑工作流",
                "nodes": [
                    {
                        "id": "parse_file_1",
                        "type": "parse_file",
                        "label": "解析XML文件",
                        "config": {},
                        "position": {"x": 100, "y": 100}
                    }
                ],
                "edges": [],
                "workflow_steps": []
            }
        
        return ai_service.create_success_response(
            message="工作流定义生成完成",
            data={"workflow": workflow_def}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成工作流失败: {e}", exc_info=True)
        raise ai_service.create_error_response(f"生成失败: {str(e)}")

