"""
解析器工厂
"""
from pathlib import Path
from typing import Optional

from data_parser.base_parser import BaseParser
from data_parser.xml_parser import XMLParser
from data_parser.json_parser import JSONParser
from data_parser.yaml_parser import YAMLParser
from data_parser.csv_parser import CSVParser, TSVParser
from data_parser.excel_parser import ExcelParser
from core.logging_config import logger


class ParserFactory:
    """解析器工厂类"""
    
    _parsers = {
        ".xml": XMLParser,
        ".json": JSONParser,
        ".yaml": YAMLParser,
        ".yml": YAMLParser,
        ".csv": CSVParser,
        ".tsv": TSVParser,
        ".xlsx": ExcelParser,
        ".xls": ExcelParser,
    }
    
    @classmethod
    def create_parser(cls, file_path: Path) -> Optional[BaseParser]:
        """
        根据文件扩展名创建对应的解析器
        
        Args:
            file_path: 文件路径
            
        Returns:
            解析器实例
        """
        suffix = file_path.suffix.lower()
        parser_class = cls._parsers.get(suffix)
        
        if parser_class:
            return parser_class()
        
        logger.warning(f"不支持的文件格式: {suffix}")
        return None
    
    @classmethod
    def get_supported_formats(cls) -> list:
        """获取支持的文件格式"""
        return list(cls._parsers.keys())

