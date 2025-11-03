"""
XML解析器
"""
from pathlib import Path
from typing import Dict, Any, List, Optional
from lxml import etree
import xml.etree.ElementTree as ET

from data_parser.base_parser import BaseParser
from core.logging_config import logger


class XMLParser(BaseParser):
    """XML文件解析器"""
    
    def __init__(self, encoding: str = "utf-8"):
        self.encoding = encoding
    
    def parse(self, file_path: Path) -> Dict[str, Any]:
        """解析XML文件"""
        try:
            tree = etree.parse(str(file_path))
            root = tree.getroot()
            return self._element_to_dict(root)
        except Exception as e:
            logger.error(f"XML解析失败: {e}")
            raise
    
    def _element_to_dict(self, element: etree.Element) -> Dict[str, Any]:
        """将XML元素转换为字典"""
        result = {}
        
        # 添加属性
        if element.attrib:
            result["@attributes"] = element.attrib
        
        # 处理子元素
        children = {}
        text_content = []
        
        for child in element:
            tag = child.tag
            child_data = self._element_to_dict(child)
            
            if tag in children:
                # 多个同名元素，转为列表
                if not isinstance(children[tag], list):
                    children[tag] = [children[tag]]
                children[tag].append(child_data)
            else:
                children[tag] = child_data
            
            # 收集文本内容
            if child.text and child.text.strip():
                text_content.append(child.text.strip())
        
        # 合并数据
        if children:
            result.update(children)
        
        # 添加文本内容
        if element.text and element.text.strip():
            result["#text"] = element.text.strip()
        elif text_content:
            result["#text"] = " ".join(text_content)
        
        # 如果只有文本，直接返回文本
        if not result.get("@attributes") and not children and element.text:
            return element.text.strip() if element.text.strip() else ""
        
        return result if result else ""
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """验证XML数据（基础验证）"""
        if not isinstance(data, dict):
            return False
        return True
    
    def export(self, data: Dict[str, Any], output_path: Path) -> bool:
        """导出为XML文件"""
        try:
            root = self._dict_to_element(data)
            tree = etree.ElementTree(root)
            
            # 确保输出目录存在
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            tree.write(
                str(output_path),
                encoding=self.encoding,
                xml_declaration=True,
                pretty_print=True
            )
            return True
        except Exception as e:
            logger.error(f"XML导出失败: {e}")
            return False
    
    def _dict_to_element(self, data: Any, tag_name: str = "root") -> etree.Element:
        """将字典转换为XML元素"""
        if isinstance(data, str):
            element = etree.Element(tag_name)
            element.text = data
            return element
        
        if isinstance(data, dict):
            element = etree.Element(tag_name)
            
            # 处理属性
            if "@attributes" in data:
                for key, value in data["@attributes"].items():
                    element.set(key, str(value))
            
            # 处理文本内容
            if "#text" in data:
                element.text = str(data["#text"])
            
            # 处理子元素
            for key, value in data.items():
                if key not in ["@attributes", "#text"]:
                    if isinstance(value, list):
                        for item in value:
                            child = self._dict_to_element(item, key)
                            element.append(child)
                    else:
                        child = self._dict_to_element(value, key)
                        element.append(child)
            
            return element
        
        # 处理列表
        if isinstance(data, list):
            container = etree.Element(tag_name)
            for item in data:
                child = self._dict_to_element(item, "item")
                container.append(child)
            return container
        
        # 处理基本类型
        element = etree.Element(tag_name)
        element.text = str(data)
        return element
    
    def detect_schema(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """检测XML结构Schema"""
        schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        def infer_schema(obj: Any, key: str = "root") -> Dict[str, Any]:
            if isinstance(obj, dict):
                prop_schema = {"type": "object", "properties": {}}
                
                for k, v in obj.items():
                    if k == "@attributes":
                        prop_schema["attributes"] = {}
                        for attr_key, attr_value in v.items():
                            prop_schema["attributes"][attr_key] = {"type": type(attr_value).__name__}
                    elif k == "#text":
                        prop_schema["text_content"] = {"type": "string"}
                    else:
                        prop_schema["properties"][k] = infer_schema(v, k)
                
                return prop_schema
            elif isinstance(obj, list):
                if obj:
                    return {
                        "type": "array",
                        "items": infer_schema(obj[0], key)
                    }
                return {"type": "array"}
            else:
                return {"type": type(obj).__name__}
        
        return infer_schema(data)

