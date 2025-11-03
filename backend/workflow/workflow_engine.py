"""
工作流引擎 - 编排数据处理流程
"""
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass
from pathlib import Path
import json
from datetime import datetime

from core.logging_config import logger


class WorkflowStatus(Enum):
    """工作流状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class WorkflowStep:
    """工作流步骤"""
    name: str
    handler: Callable
    depends_on: List[str] = None
    config: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.depends_on is None:
            self.depends_on = []
        if self.config is None:
            self.config = {}


class WorkflowEngine:
    """工作流引擎"""
    
    def __init__(self):
        self.workflows: Dict[str, List[WorkflowStep]] = {}
        self.execution_history: List[Dict[str, Any]] = []
    
    def register_workflow(self, workflow_id: str, steps: List[WorkflowStep]):
        """注册工作流"""
        self.workflows[workflow_id] = steps
    
    async def execute(self, workflow_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行工作流
        
        Args:
            workflow_id: 工作流ID
            context: 执行上下文（包含输入数据等）
            
        Returns:
            执行结果
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"工作流不存在: {workflow_id}")
        
        steps = self.workflows[workflow_id]
        execution_id = f"{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        execution_context = {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": WorkflowStatus.RUNNING.value,
            "started_at": datetime.now().isoformat(),
            "steps": [],
            **context
        }
        
        try:
            # 执行步骤（按依赖顺序）
            executed_steps = set()
            
            for step in self._get_execution_order(steps):
                if step.name in executed_steps:
                    continue
                
                step_result = {
                    "step": step.name,
                    "status": "running",
                    "started_at": datetime.now().isoformat()
                }
                
                try:
                    # 执行步骤
                    if callable(step.handler):
                        result = await step.handler(execution_context)
                    else:
                        result = step.handler
                    
                    step_result.update({
                        "status": "completed",
                        "result": result,
                        "completed_at": datetime.now().isoformat()
                    })
                    
                    # 更新上下文
                    execution_context[f"step_{step.name}"] = result
                    execution_context["steps"].append(step_result)
                    
                except Exception as e:
                    step_result.update({
                        "status": "failed",
                        "error": str(e),
                        "completed_at": datetime.now().isoformat()
                    })
                    execution_context["steps"].append(step_result)
                    raise
            
            execution_context.update({
                "status": WorkflowStatus.COMPLETED.value,
                "completed_at": datetime.now().isoformat()
            })
            
        except Exception as e:
            execution_context.update({
                "status": WorkflowStatus.FAILED.value,
                "error": str(e),
                "completed_at": datetime.now().isoformat()
            })
            logger.error(f"工作流执行失败: {e}")
        
        # 保存执行历史
        self.execution_history.append(execution_context)
        
        return execution_context
    
    def _get_execution_order(self, steps: List[WorkflowStep]) -> List[WorkflowStep]:
        """获取执行顺序（考虑依赖关系）"""
        # 简单的拓扑排序
        executed = set()
        order = []
        
        def add_step(step: WorkflowStep):
            if step.name in executed:
                return
            
            # 先执行依赖的步骤
            for dep_name in step.depends_on:
                dep_step = next((s for s in steps if s.name == dep_name), None)
                if dep_step and dep_step.name not in executed:
                    add_step(dep_step)
            
            order.append(step)
            executed.add(step.name)
        
        for step in steps:
            add_step(step)
        
        return order
    
    def get_history(self, workflow_id: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """获取执行历史"""
        history = self.execution_history
        
        if workflow_id:
            history = [h for h in history if h.get("workflow_id") == workflow_id]
        
        return history[-limit:]
    
    def get_workflow_status(self, execution_id: str) -> Optional[Dict]:
        """获取工作流执行状态"""
        for execution in self.execution_history:
            if execution.get("execution_id") == execution_id:
                return execution
        return None

