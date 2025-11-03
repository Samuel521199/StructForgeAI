"""
文件管理API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from datetime import datetime

from core.config import settings
from core.logging_config import logger
from data_parser.parser_factory import ParserFactory

router = APIRouter()


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


@router.post("/parse")
async def parse_file(file_path: str):
    """解析文件"""
    try:
        path = Path(file_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        parser = ParserFactory.create_parser(path)
        if not parser:
            raise HTTPException(status_code=400, detail="不支持的文件格式")
        
        data = parser.parse(path)
        schema = parser.detect_schema(data)
        
        return {
            "data": data,
            "schema": schema,
            "file_path": str(path)
        }
    except Exception as e:
        logger.error(f"文件解析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

