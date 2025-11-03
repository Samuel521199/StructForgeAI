"""
向量数据库 - Schema知识库
"""
from typing import List, Dict, Any, Optional
import json
from pathlib import Path
import numpy as np

from core.config import settings
from core.logging_config import logger
from ai_integration.embedding_client import EmbeddingClient


class VectorDB:
    """向量数据库抽象类"""
    
    def __init__(self):
        self.db_type = settings.VECTOR_DB_TYPE
        self.db_path = Path(settings.VECTOR_DB_PATH)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.embedding_client = EmbeddingClient()
        
        if self.db_type == "faiss":
            self.db = self._init_faiss()
        elif self.db_type == "chromadb":
            self.db = self._init_chromadb()
        else:
            raise ValueError(f"不支持的向量数据库类型: {self.db_type}")
    
    def _init_faiss(self):
        """初始化FAISS数据库"""
        try:
            import faiss
            import pickle
            
            index_path = self.db_path / "faiss.index"
            metadata_path = self.db_path / "metadata.pkl"
            
            dimension = 384  # sentence-transformers默认维度
            index = faiss.IndexFlatL2(dimension)
            
            if index_path.exists():
                index = faiss.read_index(str(index_path))
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
            else:
                metadata = []
            
            return {
                "index": index,
                "metadata": metadata,
                "index_path": index_path,
                "metadata_path": metadata_path
            }
        except Exception as e:
            logger.error(f"FAISS初始化失败: {e}")
            raise
    
    def _init_chromadb(self):
        """初始化ChromaDB数据库"""
        try:
            import chromadb
            
            client = chromadb.PersistentClient(
                path=str(self.db_path / "chroma_db")
            )
            collection = client.get_or_create_collection(
                name="schema_knowledge",
                metadata={"description": "Schema知识库"}
            )
            
            return {
                "client": client,
                "collection": collection
            }
        except Exception as e:
            logger.error(f"ChromaDB初始化失败: {e}")
            raise
    
    def add_schema(self, schema: Dict[str, Any], metadata: Optional[Dict] = None) -> str:
        """
        添加Schema到向量库
        
        Args:
            schema: Schema数据
            metadata: 元数据（文件路径、游戏类型等）
            
        Returns:
            Schema ID
        """
        # 将Schema转换为文本
        schema_text = self._schema_to_text(schema)
        
        # 生成嵌入向量
        embedding = self.embedding_client.embed_single(schema_text)
        
        if self.db_type == "faiss":
            return self._add_faiss(embedding, schema, metadata)
        else:
            return self._add_chromadb(embedding, schema_text, metadata)
    
    def _schema_to_text(self, schema: Dict[str, Any]) -> str:
        """将Schema转换为文本（用于嵌入）"""
        # 提取关键信息：字段名、类型、关系等
        fields = []
        
        def extract_fields(obj: Any, prefix: str = ""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    field_path = f"{prefix}.{key}" if prefix else key
                    
                    if isinstance(value, dict):
                        if "type" in value:
                            fields.append(f"{field_path}:{value['type']}")
                        extract_fields(value, field_path)
                    elif isinstance(value, list):
                        if value and isinstance(value[0], dict):
                            extract_fields(value[0], f"{field_path}[]")
                    else:
                        fields.append(f"{field_path}:{type(value).__name__}")
        
        extract_fields(schema)
        return " ".join(fields)
    
    def _add_faiss(self, embedding: np.ndarray, schema: Dict, metadata: Optional[Dict]) -> str:
        """添加到FAISS"""
        import pickle
        import faiss
        import uuid
        
        schema_id = str(uuid.uuid4())
        
        # 添加到索引
        self.db["index"].add(embedding.reshape(1, -1))
        
        # 添加到元数据
        entry = {
            "id": schema_id,
            "schema": schema,
            "metadata": metadata or {}
        }
        self.db["metadata"].append(entry)
        
        # 保存
        faiss.write_index(self.db["index"], str(self.db["index_path"]))
        with open(self.db["metadata_path"], 'wb') as f:
            pickle.dump(self.db["metadata"], f)
        
        return schema_id
    
    def _add_chromadb(self, embedding: np.ndarray, schema_text: str, metadata: Optional[Dict]) -> str:
        """添加到ChromaDB"""
        import uuid
        
        schema_id = str(uuid.uuid4())
        
        self.db["collection"].add(
            ids=[schema_id],
            embeddings=[embedding.tolist()],
            documents=[schema_text],
            metadatas=[metadata or {}]
        )
        
        return schema_id
    
    def search_similar(self, query_schema: Dict[str, Any], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        搜索相似的Schema
        
        Args:
            query_schema: 查询Schema
            top_k: 返回前K个结果
            
        Returns:
            相似Schema列表
        """
        # 生成查询向量
        query_text = self._schema_to_text(query_schema)
        query_embedding = self.embedding_client.embed_single(query_text)
        
        if self.db_type == "faiss":
            return self._search_faiss(query_embedding, top_k)
        else:
            return self._search_chromadb(query_embedding, top_k)
    
    def _search_faiss(self, query_embedding: np.ndarray, top_k: int) -> List[Dict]:
        """FAISS搜索"""
        import faiss
        
        if self.db["index"].ntotal == 0:
            return []
        
        distances, indices = self.db["index"].search(
            query_embedding.reshape(1, -1),
            min(top_k, self.db["index"].ntotal)
        )
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(self.db["metadata"]):
                entry = self.db["metadata"][idx].copy()
                entry["distance"] = float(dist)
                results.append(entry)
        
        return results
    
    def _search_chromadb(self, query_embedding: np.ndarray, top_k: int) -> List[Dict]:
        """ChromaDB搜索"""
        results = self.db["collection"].query(
            query_embeddings=[query_embedding.tolist()],
            n_results=top_k
        )
        
        # 格式化结果
        formatted_results = []
        for i in range(len(results["ids"][0])):
            formatted_results.append({
                "id": results["ids"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i] if "distances" in results else 0.0
            })
        
        return formatted_results

