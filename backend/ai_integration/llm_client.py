"""
LLM客户端 - 支持多种AI模型提供商
"""
from typing import List, Dict, Any, Optional
import requests
import json

from core.config import settings
from core.logging_config import logger


class LLMClient:
    """统一的LLM客户端接口"""
    
    def __init__(self):
        self.provider = settings.AI_MODEL_PROVIDER
        self.model_name = settings.AI_MODEL_NAME
        self.base_url = settings.AI_BASE_URL
        self.temperature = settings.AI_TEMPERATURE
        self.max_tokens = settings.AI_MAX_TOKENS
    
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表，格式 [{"role": "user", "content": "..."}]
            **kwargs: 其他参数（temperature, max_tokens等）
            
        Returns:
            AI响应
        """
        if self.provider == "ollama":
            return self._chat_ollama(messages, **kwargs)
        elif self.provider == "lmstudio":
            return self._chat_lmstudio(messages, **kwargs)
        elif self.provider == "openai":
            return self._chat_openai(messages, **kwargs)
        else:
            raise ValueError(f"不支持的AI提供商: {self.provider}")
    
    def _chat_ollama(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Ollama API调用"""
        try:
            # 构建请求体
            payload = {
                "model": self.model_name,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": kwargs.get("temperature", self.temperature),
                    "num_predict": kwargs.get("max_tokens", self.max_tokens),
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=120
            )
            response.raise_for_status()
            
            result = response.json()
            return {
                "content": result.get("message", {}).get("content", ""),
                "model": result.get("model", self.model_name),
                "usage": result.get("eval_count", 0)
            }
            
        except requests.exceptions.ConnectionError as e:
            error_msg = (
                f"无法连接到 Ollama 服务 ({self.base_url})。\n"
                f"请确保 Ollama 正在运行，或配置其他 AI 提供商（如 LM Studio）。\n"
                f"错误详情: {str(e)}"
            )
            logger.error(error_msg)
            raise ConnectionError(error_msg) from e
        except Exception as e:
            logger.error(f"Ollama API调用失败: {e}")
            raise
    
    def _chat_lmstudio(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """LM Studio API调用（兼容OpenAI格式）"""
        try:
            payload = {
                "model": self.model_name,
                "messages": messages,
                "temperature": kwargs.get("temperature", self.temperature),
                "max_tokens": kwargs.get("max_tokens", self.max_tokens),
                "stream": False
            }
            
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                timeout=120
            )
            response.raise_for_status()
            
            result = response.json()
            message = result.get("choices", [{}])[0].get("message", {})
            
            return {
                "content": message.get("content", ""),
                "model": result.get("model", self.model_name),
                "usage": result.get("usage", {})
            }
            
        except requests.exceptions.ConnectionError as e:
            error_msg = (
                f"无法连接到 LM Studio 服务 ({self.base_url})。\n"
                f"请确保 LM Studio 正在运行并启用了本地服务器。\n"
                f"错误详情: {str(e)}"
            )
            logger.error(error_msg)
            raise ConnectionError(error_msg) from e
        except Exception as e:
            logger.error(f"LM Studio API调用失败: {e}")
            raise
    
    def _chat_openai(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """OpenAI API调用"""
        try:
            import openai
            
            client = openai.OpenAI(
                api_key=kwargs.get("api_key"),
                base_url=self.base_url if self.base_url else None
            )
            
            response = client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=kwargs.get("temperature", self.temperature),
                max_tokens=kwargs.get("max_tokens", self.max_tokens)
            )
            
            return {
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"OpenAI API调用失败: {e}")
            raise
    
    def stream_chat(self, messages: List[Dict[str, str]], **kwargs):
        """流式聊天（生成器）"""
        if self.provider == "ollama":
            return self._stream_ollama(messages, **kwargs)
        elif self.provider == "lmstudio":
            return self._stream_lmstudio(messages, **kwargs)
        else:
            # 非流式作为后备
            result = self.chat(messages, **kwargs)
            yield result.get("content", "")
    
    def _stream_ollama(self, messages: List[Dict[str, str]], **kwargs):
        """Ollama流式响应"""
        payload = {
            "model": self.model_name,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": kwargs.get("temperature", self.temperature),
            }
        }
        
        response = requests.post(
            f"{self.base_url}/api/chat",
            json=payload,
            stream=True,
            timeout=120
        )
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    content = data.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if data.get("done", False):
                        break
                except json.JSONDecodeError:
                    continue
    
    def _stream_lmstudio(self, messages: List[Dict[str, str]], **kwargs):
        """LM Studio流式响应"""
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "stream": True
        }
        
        response = requests.post(
            f"{self.base_url}/v1/chat/completions",
            json=payload,
            stream=True,
            timeout=120
        )
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])
                        choices = data.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                    except json.JSONDecodeError:
                        continue

