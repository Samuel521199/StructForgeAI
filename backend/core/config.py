"""
应用配置
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用设置"""
    
    # 应用基础配置
    APP_NAME: str = "StructForge AI"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///F:/StructForgeAI/data/structforge.db"
    
    # AI模型配置
    AI_MODEL_PROVIDER: str = "ollama"  # ollama, openai, local
    AI_MODEL_NAME: str = "llama3"  # 或 qwen, mistral等
    AI_BASE_URL: str = "http://localhost:11434"
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 2048
    
    # 向量数据库配置
    VECTOR_DB_TYPE: str = "faiss"  # faiss, chromadb
    VECTOR_DB_PATH: str = "F:/StructForgeAI/data/vector_db"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # 文件存储配置
    UPLOAD_DIR: str = "F:/StructForgeAI/data/uploads"
    EXPORT_DIR: str = "F:/StructForgeAI/data/exports"
    TEMPLATE_DIR: str = "F:/StructForgeAI/templates"
    
    # 工作流配置
    WORKFLOW_ENGINE: str = "prefect"  # prefect, custom
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "F:/StructForgeAI/logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

