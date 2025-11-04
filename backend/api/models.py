"""
API请求/响应模型
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class SchemaAnalysisRequest(BaseModel):
    """Schema分析请求"""
    data: Dict[str, Any]
    use_ai: bool = True
    metadata: Optional[Dict[str, Any]] = None


class SchemaAnalysisResponse(BaseModel):
    """Schema分析响应"""
    schema: Dict[str, Any]  # 响应中使用schema不会冲突，因为BaseModel.schema()是方法
    relationships: Optional[Dict[str, Any]] = None
    base_schema: Optional[Dict[str, Any]] = None


class IntentInferenceRequest(BaseModel):
    """意图推断请求"""
    instruction: str
    schema_data: Dict[str, Any] = Field(..., alias="schema")
    use_ai: bool = True
    
    class Config:
        populate_by_name = True  # 允许使用别名或字段名


class IntentInferenceResponse(BaseModel):
    """意图推断响应"""
    intent: Dict[str, Any]
    instruction: str


class SimilarSchemasRequest(BaseModel):
    """相似Schema查找请求"""
    schema_data: Dict[str, Any] = Field(..., alias="schema")
    top_k: int = 5
    
    class Config:
        populate_by_name = True


class SimilarSchemasResponse(BaseModel):
    """相似Schema查找响应"""
    similar_schemas: List[Dict[str, Any]]


class SaveSchemaRequest(BaseModel):
    """保存Schema请求"""
    schema_data: Dict[str, Any] = Field(..., alias="schema")
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        populate_by_name = True


class SaveSchemaResponse(BaseModel):
    """保存Schema响应"""
    schema_id: str
    message: str


class WorkflowExecuteRequest(BaseModel):
    """工作流执行请求"""
    file_path: Optional[str] = None
    instruction: Optional[str] = None
    output_format: str = "json"
    use_ai: bool = True
    context: Optional[Dict[str, Any]] = None


class WorkflowExecutionResponse(BaseModel):
    """工作流执行响应"""
    execution_id: str
    workflow_id: str
    status: str
    started_at: str
    completed_at: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class AIChatRequest(BaseModel):
    """AI聊天请求"""
    messages: List[Dict[str, str]]


class AIChatResponse(BaseModel):
    """AI聊天响应"""
    response: str
    model: Optional[str] = None

