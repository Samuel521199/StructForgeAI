"""
快速检查 AI 服务连接状态
"""
import sys
import os
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / 'backend'))

from core.config import settings
from ai_integration.llm_client import LLMClient

def check_ai_service():
    """检查 AI 服务是否可用"""
    print("=" * 60)
    print("AI 服务连接检查")
    print("=" * 60)
    print()
    
    print(f"配置的 AI 提供商: {settings.AI_MODEL_PROVIDER}")
    print(f"配置的模型名称: {settings.AI_MODEL_NAME}")
    print(f"配置的服务 URL: {settings.AI_BASE_URL}")
    print()
    
    try:
        client = LLMClient()
        
        print("正在测试连接...")
        print()
        
        # 发送一个简单的测试请求
        test_messages = [
            {"role": "user", "content": "请回复：测试"}
        ]
        
        response = client.chat(test_messages)
        
        print("✅ 连接成功！")
        print(f"模型响应: {response.get('content', '')[:100]}")
        print(f"使用的模型: {response.get('model', 'unknown')}")
        print()
        print("AI 服务已就绪，可以正常使用。")
        
        return True
        
    except ConnectionError as e:
        print("❌ 连接失败：无法连接到 AI 服务")
        print()
        print("错误详情:")
        print(str(e))
        print()
        print("=" * 60)
        print("解决方案：")
        print("=" * 60)
        
        if settings.AI_MODEL_PROVIDER == "ollama":
            print()
            print("1. 启动 Ollama 服务：")
            print("   - Windows: 打开 Ollama 应用程序")
            print("   - 或运行命令: ollama serve")
            print()
            print("2. 验证 Ollama 是否运行：")
            print("   - 打开浏览器访问: http://localhost:11434")
            print("   - 或运行命令: ollama list")
            print()
            print("3. 下载模型（如果还未下载）：")
            print(f"   - ollama pull {settings.AI_MODEL_NAME}")
            
        elif settings.AI_MODEL_PROVIDER == "lmstudio":
            print()
            print("1. 启动 LM Studio 应用程序")
            print("2. 下载并加载模型")
            print("3. 在 LM Studio 中启动本地服务器（端口 1234）")
            print("4. 确保 'Server is running' 显示为绿色")
            
        elif settings.AI_MODEL_PROVIDER == "openai":
            print()
            print("1. 确保已设置 OPENAI_API_KEY 环境变量")
            print("2. 或在 .env 文件中配置 OPENAI_API_KEY")
            print("3. 验证 API Key 是否有效")
        
        print()
        print("=" * 60)
        print("配置说明：")
        print("=" * 60)
        print("1. 复制 backend/.env.example 为 backend/.env")
        print("2. 修改 .env 文件中的 AI 配置")
        print("3. 重新运行此脚本验证连接")
        
        return False
        
    except Exception as e:
        print(f"❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_ai_service()
    sys.exit(0 if success else 1)

