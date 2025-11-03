"""
默认工作流定义
"""
from pathlib import Path
from typing import Dict, Any

from workflow.workflow_engine import WorkflowEngine, WorkflowStep
from data_parser.parser_factory import ParserFactory
from schema_learner.ai_learner import AISchemaLearner
from schema_learner.rule_learner import RuleBasedSchemaLearner
from core.config import settings
from core.logging_config import logger


async def parse_file_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """解析文件步骤"""
    file_path = Path(context.get("file_path"))
    
    parser = ParserFactory.create_parser(file_path)
    if not parser:
        raise ValueError(f"不支持的文件格式: {file_path.suffix}")
    
    data = parser.parse(file_path)
    schema = parser.detect_schema(data)
    
    return {
        "data": data,
        "schema": schema,
        "file_path": str(file_path)
    }


async def analyze_schema_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """分析Schema步骤"""
    parse_result = context.get("step_parse_file", {})
    data = parse_result.get("data")
    schema = parse_result.get("schema")
    
    # 选择学习器（可根据配置选择AI或规则）
    use_ai = context.get("use_ai", True)
    
    if use_ai:
        learner = AISchemaLearner()
    else:
        learner = RuleBasedSchemaLearner()
    
    # 学习Schema
    learned_schema = learner.learn_schema(data, {
        "file_path": parse_result.get("file_path")
    })
    
    # 理解关系
    relationships = learner.understand_relationships(
        learned_schema or schema
    )
    
    return {
        "learned_schema": learned_schema,
        "relationships": relationships,
        "base_schema": schema
    }


async def process_natural_language_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """处理自然语言指令步骤"""
    instruction = context.get("instruction")
    if not instruction:
        return {"intent": None}
    
    analysis_result = context.get("step_analyze_schema", {})
    schema = analysis_result.get("learned_schema") or analysis_result.get("base_schema")
    
    use_ai = context.get("use_ai", True)
    if use_ai:
        learner = AISchemaLearner()
    else:
        learner = RuleBasedSchemaLearner()
    
    intent = learner.infer_intent(instruction, schema)
    
    return {
        "intent": intent,
        "instruction": instruction
    }


async def apply_operations_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """应用操作步骤"""
    intent = context.get("step_process_natural_language", {}).get("intent")
    if not intent:
        return {"modified": False}
    
    parse_result = context.get("step_parse_file", {})
    data = parse_result.get("data")
    
    # 应用操作（简化版）
    # TODO: 实现完整的操作应用逻辑
    modified_data = data.copy()
    
    action = intent.get("action")
    target = intent.get("target")
    value = intent.get("value")
    
    if action == "update" and target and value is not None:
        # 简单的路径更新（需要更复杂的实现）
        keys = target.split(".")
        current = modified_data
        for key in keys[:-1]:
            if isinstance(current, dict):
                current = current[key]
            else:
                break
        else:
            if isinstance(current, dict):
                current[keys[-1]] = value
    
    return {
        "modified_data": modified_data,
        "operations_applied": intent
    }


async def export_file_step(context: Dict[str, Any]) -> Dict[str, Any]:
    """导出文件步骤"""
    operations_result = context.get("step_apply_operations", {})
    data = operations_result.get("modified_data")
    
    if not data:
        parse_result = context.get("step_parse_file", {})
        data = parse_result.get("data")
    
    output_format = context.get("output_format", "json")
    output_path = Path(context.get("output_path", "./exports/output"))
    
    # 根据格式选择解析器
    output_path = output_path.with_suffix(f".{output_format}")
    
    parser = ParserFactory.create_parser(output_path)
    if parser:
        success = parser.export(data, output_path)
        return {
            "output_path": str(output_path),
            "success": success
        }
    else:
        raise ValueError(f"不支持的导出格式: {output_format}")


def register_default_workflows(engine: WorkflowEngine):
    """注册默认工作流"""
    
    # 完整工作流：导入 → 分析 → 编辑 → 导出
    engine.register_workflow("full_pipeline", [
        WorkflowStep("parse_file", parse_file_step),
        WorkflowStep("analyze_schema", analyze_schema_step, ["parse_file"]),
        WorkflowStep("process_natural_language", process_natural_language_step, ["analyze_schema"]),
        WorkflowStep("apply_operations", apply_operations_step, ["process_natural_language"]),
        WorkflowStep("export_file", export_file_step, ["apply_operations"]),
    ])
    
    # 仅分析工作流
    engine.register_workflow("analyze_only", [
        WorkflowStep("parse_file", parse_file_step),
        WorkflowStep("analyze_schema", analyze_schema_step, ["parse_file"]),
    ])
    
    # 批量处理工作流
    engine.register_workflow("batch_process", [
        WorkflowStep("parse_file", parse_file_step),
        WorkflowStep("analyze_schema", analyze_schema_step, ["parse_file"]),
        WorkflowStep("export_file", export_file_step, ["analyze_schema"]),
    ])

