"""
数据操作API - 用于编辑XML/JSON/YAML等结构化数据
支持创建、修改、删除数据条目，支持批量操作
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field

from core.logging_config import logger

router = APIRouter()


class EditDataRequest(BaseModel):
    """编辑数据请求"""
    data: Dict[str, Any]  # 原始数据
    operation: str  # create, update, delete, batch_create, batch_update, batch_delete
    path: str  # 数据路径，例如 "Items.Item" 表示 Items 下的 Item 列表
    item_data: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = None  # 要创建/更新的项目数据（支持数组）
    filter_condition: Optional[Dict[str, Any]] = None  # 删除/更新时的过滤条件


class FilterDataRequest(BaseModel):
    """过滤数据请求"""
    data: Dict[str, Any]
    filter_condition: Dict[str, Any]  # 过滤条件
    path: Optional[str] = None  # 数据路径


class ValidateDataRequest(BaseModel):
    """验证数据请求"""
    data: Dict[str, Any]
    schema_data: Optional[Dict[str, Any]] = Field(None, alias="schema")  # 可选的Schema验证，使用别名避免与BaseModel.schema()方法冲突
    required_fields: Optional[List[str]] = None  # 必填字段列表
    
    class Config:
        populate_by_name = True  # 允许使用别名或字段名


def _get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """根据路径获取嵌套值"""
    keys = path.split('.')
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        elif isinstance(current, list) and key.isdigit():
            current = current[int(key)]
        else:
            return None
        if current is None:
            return None
    return current


def _set_nested_value(data: Dict[str, Any], path: str, value: Any) -> bool:
    """根据路径设置嵌套值"""
    keys = path.split('.')
    current = data
    
    # 导航到最后一个键的父对象
    for key in keys[:-1]:
        if isinstance(current, dict):
            if key not in current:
                current[key] = {}
            current = current[key]
        elif isinstance(current, list) and key.isdigit():
            idx = int(key)
            if idx < len(current):
                current = current[idx]
            else:
                return False
        else:
            return False
    
    # 设置值
    last_key = keys[-1]
    if isinstance(current, dict):
        current[last_key] = value
        return True
    elif isinstance(current, list) and last_key.isdigit():
        idx = int(last_key)
        if idx < len(current):
            current[idx] = value
            return True
    return False


def _match_filter(item: Dict[str, Any], condition: Dict[str, Any]) -> bool:
    """检查项目是否匹配过滤条件"""
    for key, expected_value in condition.items():
        # 支持嵌套路径，例如 "id" 或 "@attributes.id"
        if key.startswith("@"):
            # 属性路径
            attr_path = key[1:]  # 移除 @
            actual_value = item.get("@attributes", {}).get(attr_path)
        else:
            actual_value = item.get(key)
        
        if actual_value != expected_value:
            return False
    return True


@router.post("/edit")
async def edit_data(request: EditDataRequest):
    """
    编辑数据（创建、修改、删除）
    
    操作类型：
    - create: 在指定路径创建新条目
    - update: 更新匹配条件的条目
    - delete: 删除匹配条件的条目
    """
    try:
        data = request.data.copy()  # 避免修改原始数据
        path = request.path
        operation = request.operation.lower()
        
        # 获取目标列表
        target_list = _get_nested_value(data, path)
        
        if target_list is None:
            raise HTTPException(status_code=404, detail=f"路径不存在: {path}")
        
        if not isinstance(target_list, list):
            raise HTTPException(status_code=400, detail=f"路径 {path} 指向的不是列表类型")
        
        if operation == "create":
            if not request.item_data:
                raise HTTPException(status_code=400, detail="创建操作需要提供 item_data")
            
            # 创建新条目
            new_item = request.item_data.copy()
            target_list.append(new_item)
            
            logger.info(f"在路径 {path} 创建了新条目")
            return {
                "success": True,
                "operation": "create",
                "data": data,
                "message": f"成功创建新条目，列表现在有 {len(target_list)} 个条目"
            }
        
        elif operation == "update":
            if not request.item_data:
                raise HTTPException(status_code=400, detail="更新操作需要提供 item_data")
            if not request.filter_condition:
                raise HTTPException(status_code=400, detail="更新操作需要提供 filter_condition")
            
            # 查找并更新匹配的条目
            updated_count = 0
            for item in target_list:
                if isinstance(item, dict) and _match_filter(item, request.filter_condition):
                    item.update(request.item_data)
                    updated_count += 1
            
            if updated_count == 0:
                raise HTTPException(status_code=404, detail="没有找到匹配条件的条目")
            
            logger.info(f"在路径 {path} 更新了 {updated_count} 个条目")
            return {
                "success": True,
                "operation": "update",
                "data": data,
                "updated_count": updated_count,
                "message": f"成功更新了 {updated_count} 个条目"
            }
        
        elif operation == "delete":
            if not request.filter_condition:
                raise HTTPException(status_code=400, detail="删除操作需要提供 filter_condition")
            
            # 查找并删除匹配的条目
            original_count = len(target_list)
            target_list[:] = [
                item for item in target_list
                if not (isinstance(item, dict) and _match_filter(item, request.filter_condition))
            ]
            deleted_count = original_count - len(target_list)
            
            if deleted_count == 0:
                raise HTTPException(status_code=404, detail="没有找到匹配条件的条目")
            
            logger.info(f"在路径 {path} 删除了 {deleted_count} 个条目")
            return {
                "success": True,
                "operation": "delete",
                "data": data,
                "deleted_count": deleted_count,
                "message": f"成功删除了 {deleted_count} 个条目"
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的操作类型: {operation}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"数据编辑失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"数据编辑失败: {str(e)}")


@router.post("/filter")
async def filter_data(request: FilterDataRequest):
    """
    过滤数据
    
    根据条件过滤数据，返回匹配的条目
    """
    try:
        data = request.data
        filter_condition = request.filter_condition
        path = request.path
        
        # 如果指定了路径，从该路径获取数据
        if path:
            target_list = _get_nested_value(data, path)
            if target_list is None:
                raise HTTPException(status_code=404, detail=f"路径不存在: {path}")
            if not isinstance(target_list, list):
                raise HTTPException(status_code=400, detail=f"路径 {path} 指向的不是列表类型")
        else:
            # 如果没有指定路径，假设数据本身就是列表
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="未指定路径时，data 必须是列表类型")
            target_list = data
        
        # 过滤数据
        filtered_items = [
            item for item in target_list
            if isinstance(item, dict) and _match_filter(item, filter_condition)
        ]
        
        logger.info(f"过滤结果: {len(filtered_items)}/{len(target_list)} 个条目匹配")
        
        return {
            "success": True,
            "filtered_data": filtered_items,
            "count": len(filtered_items),
            "total": len(target_list)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"数据过滤失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"数据过滤失败: {str(e)}")


@router.post("/validate")
async def validate_data(request: ValidateDataRequest):
    """
    验证数据
    
    验证数据是否符合要求（Schema、必填字段等）
    """
    try:
        data = request.data
        errors = []
        warnings = []
        
        # 验证必填字段
        if request.required_fields:
            for field in request.required_fields:
                # 支持嵌套路径
                value = _get_nested_value(data, field)
                if value is None:
                    errors.append(f"必填字段缺失: {field}")
        
        # Schema验证（简化版）
        if request.schema_data:
            schema_type = request.schema_data.get("type")
            if schema_type == "object":
                required_fields = request.schema_data.get("required", [])
                for field in required_fields:
                    if field not in data:
                        errors.append(f"Schema要求字段缺失: {field}")
        
        is_valid = len(errors) == 0
        
        logger.info(f"数据验证完成: {'通过' if is_valid else '失败'}, 错误数: {len(errors)}")
        
        return {
            "success": is_valid,
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings,
            "message": "验证通过" if is_valid else f"验证失败: {len(errors)} 个错误"
        }
    
    except Exception as e:
        logger.error(f"数据验证失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"数据验证失败: {str(e)}")

