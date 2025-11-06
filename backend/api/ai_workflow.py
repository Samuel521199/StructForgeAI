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

2. **枚举字段识别**
   - 识别所有可能的枚举字段及其所有可能值
   - 例如：Type 字段的所有可能值（如 ["HandArmor", "BodyArmor", "LegArmor"]）
   - 例如：culture 字段的所有可能值（如 ["Culture.aserai", "Culture.neutral_culture", "Culture.khuzait"]）
   - 例如：modifier_group 的所有可能值（如 ["leather", "plate", "cloth"]）
   - 例如：material_type 的所有可能值（如 ["Leather", "Plate", "Cloth"]）
   - 为每个枚举字段列出完整的所有可能值

3. **数值范围识别**
   - 识别所有数值字段的合理范围
   - 例如：weight 的范围 [min, max] 和典型值
   - 例如：arm_armor 的范围 [min, max] 和典型值
   - 例如：difficulty, appearance 的范围
   - 为每个数值字段提供 min, max, default 建议

4. **字段关联关系**
   - 识别字段间的业务关联关系
   - 例如：modifier_group 和 material_type 的对应关系
   -    modifier_group="leather" → material_type="Leather"
   -    modifier_group="plate" → material_type="Plate"
   -    modifier_group="cloth" → material_type="Cloth"
   - 列出所有字段关联关系

5. **必填字段识别**
   - 哪些字段是必需的？（如 id, name, Type）
   - 哪些字段是可选的？（如 is_merchandise, difficulty）
   - 基于数据示例推断

6. **编辑建议**
   - 为每个字段提供默认值建议
   - 为每个字段提供验证规则建议
   - 为每个字段提供编辑提示（tooltip）

7. **数据路径建议**
   - 可编辑的数据路径（如 "Items.Item" 表示 Item 列表）

请以JSON格式返回分析结果，包含以下字段：
- business_domain: 业务领域描述
- enum_fields: {{字段名: [所有可能值列表]}}
- numeric_ranges: {{字段名: {{min, max, default, typical}}}}
- field_relationships: [{{field1, field2, relation_type, relation_rules}}]
- required_fields: [必填字段列表]
- optional_fields: [可选字段列表]
- validation_rules: {{字段名: {{规则类型, 规则值}}}}
- edit_suggestions: {{字段名: {{default, validation, hint, tooltip}}}}
- structure: 结构层次描述
- fields: 字段列表及其类型、约束
- edit_paths: 可编辑的数据路径建议
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
- enum_fields: 为枚举字段生成下拉选项
- numeric_ranges: 为数值字段生成范围验证
- field_relationships: 生成字段关联验证规则
- edit_suggestions: 使用建议的默认值和验证规则

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

