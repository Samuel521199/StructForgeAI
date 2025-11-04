"""
文件管理API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse
from typing import List, Optional, Any
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel

from core.config import settings
from core.logging_config import logger
from data_parser.parser_factory import ParserFactory

router = APIRouter()


class ParseFileRequest(BaseModel):
    """解析文件请求"""
    file_path: str


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


@router.post("/parse")
async def parse_file(request: ParseFileRequest):
    """解析文件"""
    try:
        path = Path(request.file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"文件不存在: {request.file_path}")
        
        parser = ParserFactory.create_parser(path)
        if not parser:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式: {path.suffix}")
        
        data = parser.parse(path)
        schema = parser.detect_schema(data)
        
        # 确保所有数据都是可JSON序列化的
        # 处理可能的字典键或嵌套结构问题
        serializable_data = _make_json_serializable(data)
        serializable_schema = _make_json_serializable(schema)
        
        # 返回绝对路径，确保后续读取时能正确找到文件
        absolute_path = path.resolve()
        
        return {
            "data": serializable_data,
            "schema": serializable_schema,
            "file_path": str(absolute_path)
        }
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
                    "name": file_path.name,
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
    filename: Optional[str] = None
):
    """导出文件"""
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

