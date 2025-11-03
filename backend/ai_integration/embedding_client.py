"""
嵌入向量客户端 - 用于Schema相似度匹配
"""
from typing import List, Dict, Any
import numpy as np

from core.config import settings
from core.logging_config import logger


class EmbeddingClient:
    """嵌入向量生成客户端"""
    
    def __init__(self):
        self.model_name = settings.EMBEDDING_MODEL
        self.model = None
    
    def _load_model(self):
        """延迟加载模型"""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
                logger.info(f"嵌入模型加载成功: {self.model_name}")
            except Exception as e:
                logger.error(f"嵌入模型加载失败: {e}")
                raise
    
    def embed(self, texts: List[str]) -> np.ndarray:
        """
        生成文本嵌入向量
        
        Args:
            texts: 文本列表
            
        Returns:
            嵌入向量数组 (n, dim)
        """
        self._load_model()
        
        try:
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            return embeddings
        except Exception as e:
            logger.error(f"嵌入生成失败: {e}")
            raise
    
    def embed_single(self, text: str) -> np.ndarray:
        """生成单个文本的嵌入向量"""
        return self.embed([text])[0]
    
    def similarity(self, text1: str, text2: str) -> float:
        """计算两个文本的相似度"""
        emb1 = self.embed_single(text1)
        emb2 = self.embed_single(text2)
        
        # 余弦相似度
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        
        return dot_product / (norm1 * norm2) if norm1 * norm2 > 0 else 0.0

