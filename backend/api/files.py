"""
文件管理API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse
from typing import List, Optional, Any, Dict
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel
import json
import hashlib
import os

from core.config import settings
from core.logging_config import logger
from data_parser.parser_factory import ParserFactory

router = APIRouter()

# 缓存目录
CACHE_DIR = Path(settings.UPLOAD_DIR).parent / "cache" / "file_parse"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class ParseFileRequest(BaseModel):
    """解析文件请求"""
    file_path: str
    output_format: Optional[str] = None  # 输出格式: json, table, schema, xml, yaml, csv, 或 None（保持原格式）
    convert_format: bool = False  # 是否转换格式（False=只读取识别，True=转换为指定格式）
    skip_schema: bool = False  # 是否跳过Schema检测（提升性能）


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传文件"""
    try:
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 验证文件格式
        parser = ParserFactory.create_parser(file_path)
        if not parser:
            file_path.unlink()  # 删除不支持的文件
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式: {file_path.suffix}"
            )
        
        return {
            "filename": file.filename,
            "path": str(file_path),
            "size": len(content)
        }
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _make_json_serializable(obj: Any) -> Any:
    """
    将对象转换为可JSON序列化的格式
    处理字典、列表、基本类型等
    """
    if isinstance(obj, dict):
        # 确保所有键都是字符串
        return {str(k): _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_make_json_serializable(item) for item in obj]
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    elif isinstance(obj, (bytes, bytearray)):
        # 将字节转换为字符串
        try:
            return obj.decode('utf-8')
        except UnicodeDecodeError:
            return obj.hex()
    else:
        # 其他类型转换为字符串
        return str(obj)


def _convert_to_table(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    将嵌套数据结构转换为表格格式（列表字典）
    适用于XML、JSON等嵌套结构
    
    转换策略：
    1. 如果数据本身就是列表，直接返回
    2. 如果数据是字典，查找其中的列表值（通常是主要数据）
    3. 如果找不到列表，将整个字典作为单行
    """
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        # 尝试找到列表类型的值（通常是主要数据）
        # 优先查找常见的列表键名
        common_list_keys = ['items', 'data', 'list', 'rows', 'records', 'entries']
        for key in common_list_keys:
            if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                return data[key]
        
        # 查找所有列表类型的值
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 0:
                return value
        
        # 如果没有找到列表，将整个字典作为单行
        return [data]
    else:
        return [{"value": data}]


def _convert_to_format(data: Dict[str, Any], target_format: str, schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    将数据转换为指定格式
    
    Args:
        data: 原始数据
        target_format: 目标格式（table, json, schema等）
        schema: Schema信息（用于schema格式）
    
    Returns:
        转换后的数据字典，包含 data 和 format 字段
    """
    if target_format == "table":
        # 表格格式：转换为列表字典
        table_data = _convert_to_table(data)
        return {"data": table_data, "format": "table"}
    elif target_format == "json":
        # JSON格式：保持原始数据结构
        return {"data": data, "format": "json"}
    elif target_format == "schema":
        # Schema格式：只返回Schema，不包含数据
        return {"data": {}, "format": "schema", "schema_only": True}
    else:
        # 其他格式保持原样
        return {"data": data, "format": target_format}


def _get_cache_key(file_path: str, convert_format: bool, output_format: Optional[str], skip_schema: bool) -> str:
    """
    生成缓存键
    
    Args:
        file_path: 文件路径
        convert_format: 是否转换格式
        output_format: 输出格式
        skip_schema: 是否跳过Schema
    
    Returns:
        缓存键（文件路径的哈希值 + 配置哈希值）
    """
    # 使用文件路径和配置生成唯一键
    config_str = f"{convert_format}_{output_format}_{skip_schema}"
    key_str = f"{file_path}|{config_str}"
    return hashlib.md5(key_str.encode('utf-8')).hexdigest()


def _get_file_signature(file_path: Path) -> Dict[str, Any]:
    """
    获取文件签名（修改时间和大小）
    
    Args:
        file_path: 文件路径
    
    Returns:
        文件签名字典
    """
    stat = file_path.stat()
    return {
        "mtime": stat.st_mtime,  # 修改时间
        "size": stat.st_size,    # 文件大小
    }


def _load_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """
    加载缓存
    
    Args:
        cache_key: 缓存键
    
    Returns:
        缓存的解析结果，如果不存在或已过期则返回 None
    """
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None
    
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        # 检查文件是否被修改
        file_path = Path(cache_data.get("file_path", ""))
        if not file_path.exists():
            # 文件不存在，删除缓存
            cache_file.unlink()
            return None
        
        cached_signature = cache_data.get("file_signature", {})
        current_signature = _get_file_signature(file_path)
        
        # 比较文件签名
        if (cached_signature.get("mtime") != current_signature["mtime"] or
            cached_signature.get("size") != current_signature["size"]):
            # 文件已修改，删除缓存
            cache_file.unlink()
            logger.info(f"文件已修改，删除缓存: {file_path}")
            return None
        
        logger.info(f"使用缓存结果: {file_path}")
        return cache_data.get("result")
    
    except Exception as e:
        logger.warning(f"加载缓存失败: {e}")
        # 缓存文件损坏，删除它
        if cache_file.exists():
            cache_file.unlink()
        return None


def _save_cache(cache_key: str, file_path: Path, result: Dict[str, Any]) -> None:
    """
    保存缓存
    
    Args:
        cache_key: 缓存键
        file_path: 文件路径
        result: 解析结果
    """
    try:
        cache_file = CACHE_DIR / f"{cache_key}.json"
        file_signature = _get_file_signature(file_path)
        
        cache_data = {
            "file_path": str(file_path.resolve()),
            "file_signature": file_signature,
            "cached_at": datetime.now().isoformat(),
            "result": result,
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"缓存已保存: {file_path}")
    
    except Exception as e:
        logger.warning(f"保存缓存失败: {e}，继续执行")


@router.get("/parse-cache")
async def get_parse_cache(
    file_path: str,
    convert_format: bool = False,
    output_format: Optional[str] = None,
    skip_schema: bool = False
):
    """
    获取解析文件的缓存结果（如果存在）
    
    用于前端页面刷新后恢复节点执行结果
    
    Args:
        file_path: 文件路径
        convert_format: 是否转换格式
        output_format: 输出格式
        skip_schema: 是否跳过Schema
    
    Returns:
        缓存结果，如果不存在则返回 None
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return {"cached": False, "result": None}
        
        # 生成缓存键
        cache_key = _get_cache_key(
            str(path.resolve()),
            convert_format,
            output_format,
            skip_schema
        )
        
        # 尝试加载缓存
        cached_result = _load_cache(cache_key)
        if cached_result is not None:
            logger.info(f"返回缓存结果，文件: {path}")
            return {"cached": True, "result": cached_result}
        else:
            return {"cached": False, "result": None}
    
    except Exception as e:
        logger.warning(f"获取缓存失败: {e}")
        return {"cached": False, "result": None, "error": str(e)}


@router.post("/parse")
async def parse_file(request: ParseFileRequest):
    """
    解析文件
    
    支持格式转换选项：
    - output_format: 输出格式（json, table, schema, xml, yaml, csv, 或 None）
    - convert_format: 是否转换格式（False=只读取识别，True=转换为指定格式）
    - skip_schema: 是否跳过Schema检测（提升性能）
    
    缓存机制：
    - 如果文件未被修改，直接返回缓存结果
    - 文件修改检测：使用文件修改时间（mtime）和文件大小
    - 缓存存储在：data/cache/file_parse/
    """
    try:
        path = Path(request.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"文件不存在: {request.file_path}")
        
        # 生成缓存键
        cache_key = _get_cache_key(
            str(path.resolve()),
            request.convert_format,
            request.output_format,
            request.skip_schema
        )
        
        # 尝试加载缓存
        cached_result = _load_cache(cache_key)
        if cached_result is not None:
            logger.info(f"使用缓存结果，文件: {path}")
            return cached_result
        
        # 缓存未命中或文件已修改，执行解析
        logger.info(f"解析文件（未使用缓存）: {path}")
        
        parser = ParserFactory.create_parser(path)
        if not parser:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式: {path.suffix}")
        
        # 解析文件
        data = parser.parse(path)
        
        # Schema检测（可选，提升性能）
        schema = None
        if not request.skip_schema:
            schema = parser.detect_schema(data)
        
        # 格式转换（可选）
        converted_data = data
        output_format = None
        schema_only = False
        
        if request.convert_format and request.output_format:
            conversion_result = _convert_to_format(data, request.output_format, schema)
            converted_data = conversion_result["data"]
            output_format = conversion_result["format"]
            schema_only = conversion_result.get("schema_only", False)
        elif request.output_format:
            # 如果指定了输出格式但不转换，只标记格式
            output_format = request.output_format
        
        # 确保所有数据都是可JSON序列化的
        serializable_data = _make_json_serializable(converted_data)
        serializable_schema = _make_json_serializable(schema) if schema else None
        
        # 返回绝对路径，确保后续读取时能正确找到文件
        absolute_path = path.resolve()
        
        result = {
            "data": serializable_data,
            "file_path": str(absolute_path),
            "original_format": path.suffix.lower().lstrip('.'),
        }
        
        # 根据输出格式决定是否包含Schema
        if schema is not None and not schema_only:
            result["schema"] = serializable_schema
        elif schema_only and schema is not None:
            # Schema格式：只返回Schema
            result["schema"] = serializable_schema
            result["data"] = {}  # 清空数据，只保留Schema
        
        if output_format:
            result["output_format"] = output_format
        
        # 添加格式标识，便于前端识别
        if output_format:
            result["hasData"] = not schema_only and bool(serializable_data)
            result["hasSchema"] = schema is not None
        else:
            result["hasData"] = bool(serializable_data)
            result["hasSchema"] = schema is not None
        
        # 保存缓存
        _save_cache(cache_key, absolute_path, result)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件解析失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")


@router.get("/list")
async def list_files(limit: int = 50):
    """列出已上传的文件"""
    try:
        upload_dir = Path(settings.UPLOAD_DIR)
        if not upload_dir.exists():
            return {"files": []}
        
        files = []
        for file_path in upload_dir.iterdir():
            if file_path.is_file():
                files.append({
                    "filename": file_path.name,  # 前端期望的字段名
                    "path": str(file_path),  # 完整路径
                    "size": file_path.stat().st_size,
                    "modified": file_path.stat().st_mtime
                })
        
        files.sort(key=lambda x: x["modified"], reverse=True)
        return {"files": files[:limit]}
    except Exception as e:
        logger.error(f"文件列表获取失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content")
async def get_file_content(file_path: str):
    """获取文件内容"""
    try:
        logger.info(f"请求读取文件内容: {file_path}")
        path = Path(file_path)
        # 转换为绝对路径
        absolute_path = path.resolve()
        logger.info(f"解析后的路径: {path}, 绝对路径: {absolute_path}, 存在: {absolute_path.exists()}")
        
        if not absolute_path.exists():
            logger.warning(f"文件不存在: {file_path} (解析后: {path}, 绝对路径: {absolute_path})")
            raise HTTPException(status_code=404, detail=f"文件不存在: {file_path}")
        
        # 检查文件大小，限制读取大小（最大10MB）
        file_size = absolute_path.stat().st_size
        max_size = 10 * 1024 * 1024  # 10MB
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400, 
                detail=f"文件过大（{file_size / 1024 / 1024:.2f}MB），无法读取。最大支持 10MB"
            )
        
        # 读取文件内容
        try:
            with open(absolute_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # 如果 UTF-8 解码失败，尝试其他编码
            try:
                with open(absolute_path, 'r', encoding='gbk') as f:
                    content = f.read()
            except Exception:
                raise HTTPException(status_code=400, detail="文件编码不支持，无法读取文本内容")
        
        logger.info(f"成功读取文件内容，大小: {file_size} 字节, 内容长度: {len(content)} 字符")
        
        return {
            "content": content,
            "file_path": str(absolute_path),
            "size": file_size
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"读取文件内容失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"读取文件内容失败: {str(e)}")


@router.post("/export")
async def export_file(
    data: dict,
    output_format: str = "json",
    filename: Optional[str] = None,
    pretty_print: bool = True,
    sort_by: Optional[str] = None
):
    """
    导出文件
    
    Args:
        data: 要导出的数据
        output_format: 输出格式（json, xml, yaml, csv, excel）
        filename: 文件名（可选）
        pretty_print: 是否美化输出（XML/JSON/YAML）
        sort_by: 排序字段（可选，XML格式支持，如 "@attributes.id"）
    """
    try:
        export_dir = Path(settings.EXPORT_DIR)
        export_dir.mkdir(parents=True, exist_ok=True)
        
        if not filename:
            filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        output_path = export_dir / f"{filename}.{output_format}"
        
        # 根据格式选择解析器
        temp_path = Path(f"temp.{output_format}")
        parser = ParserFactory.create_parser(temp_path)
        
        if parser:
            # 对于XML格式，传递额外参数
            if output_format == "xml" and hasattr(parser, 'export'):
                success = parser.export(data, output_path, pretty_print=pretty_print, sort_by=sort_by)
            else:
                success = parser.export(data, output_path)
            
            if success:
                return FileResponse(
                    str(output_path),
                    filename=output_path.name
                )
        
        raise HTTPException(status_code=400, detail="不支持的导出格式")
    except Exception as e:
        logger.error(f"文件导出失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

