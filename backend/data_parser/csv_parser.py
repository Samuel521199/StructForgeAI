"""
CSV/TSV解析器
"""
from pathlib import Path
from typing import Dict, Any, List, Optional
import csv
import io

from data_parser.base_parser import BaseParser
from core.logging_config import logger


class CSVParser(BaseParser):
    """CSV/TSV文件解析器"""
    
    def __init__(self, delimiter: Optional[str] = None, encoding: str = "utf-8"):
        self.delimiter = delimiter
        self.encoding = encoding
        self.detected_delimiter = None
    
    def _detect_delimiter(self, first_line: str) -> str:
        """自动检测分隔符"""
        if self.delimiter:
            return self.delimiter
        
        # 尝试常见分隔符
        delimiters = [',', ';', '\t', '|']
        max_count = 0
        detected = ','
        
        for delim in delimiters:
            count = first_line.count(delim)
            if count > max_count:
                max_count = count
                detected = delim
        
        return detected
    
    def parse(self, file_path: Path) -> Dict[str, Any]:
        """解析CSV文件"""
        try:
            with open(file_path, 'r', encoding=self.encoding, newline='') as f:
                # 读取第一行检测分隔符
                first_line = f.readline()
                self.detected_delimiter = self._detect_delimiter(first_line)
                
                # 重置文件指针
                f.seek(0)
                
                # 读取CSV
                reader = csv.DictReader(f, delimiter=self.detected_delimiter)
                rows = list(reader)
            
            # 转换为结构化数据
            result = {
                "format": "csv",
                "delimiter": self.detected_delimiter,
                "headers": list(rows[0].keys()) if rows else [],
                "rows": rows,
                "row_count": len(rows)
            }
            
            # 推断数据类型
            if rows:
                result["field_types"] = self._infer_field_types(rows)
            
            return result
            
        except Exception as e:
            logger.error(f"CSV解析失败: {e}")
            raise
    
    def _infer_field_types(self, rows: List[Dict]) -> Dict[str, str]:
        """推断字段类型"""
        if not rows:
            return {}
        
        field_types = {}
        
        for field_name in rows[0].keys():
            values = [row.get(field_name, "") for row in rows[:100]]  # 采样前100行
            
            # 类型推断逻辑
            types_found = set()
            for value in values:
                if value.strip() == "":
                    continue
                try:
                    int(value)
                    types_found.add("integer")
                except ValueError:
                    try:
                        float(value)
                        types_found.add("number")
                    except ValueError:
                        types_found.add("string")
            
            # 确定类型
            if "integer" in types_found and "number" not in types_found:
                field_types[field_name] = "integer"
            elif "number" in types_found:
                field_types[field_name] = "number"
            else:
                field_types[field_name] = "string"
        
        return field_types
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """验证CSV数据"""
        required_keys = ["format", "headers", "rows"]
        return all(key in data for key in required_keys)
    
    def export(self, data: Dict[str, Any], output_path: Path) -> bool:
        """导出为CSV文件"""
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            delimiter = data.get("delimiter", ",")
            headers = data.get("headers", [])
            rows = data.get("rows", [])
            
            with open(output_path, 'w', encoding=self.encoding, newline='') as f:
                writer = csv.DictWriter(f, fieldnames=headers, delimiter=delimiter)
                writer.writeheader()
                writer.writerows(rows)
            
            return True
        except Exception as e:
            logger.error(f"CSV导出失败: {e}")
            return False
    
    def detect_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """检测CSV结构Schema"""
        schema = {
            "type": "table",
            "format": "csv",
            "columns": {}
        }
        
        headers = data.get("headers", [])
        field_types = data.get("field_types", {})
        
        for header in headers:
            schema["columns"][header] = {
                "type": field_types.get(header, "string"),
                "position": headers.index(header)
            }
        
        return schema


class TSVParser(CSVParser):
    """TSV解析器（继承CSV，固定分隔符为制表符）"""
    
    def __init__(self, encoding: str = "utf-8"):
        super().__init__(delimiter='\t', encoding=encoding)

