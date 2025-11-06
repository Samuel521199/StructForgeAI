"""
检查 Ollama 是否已安装
"""
import os
from pathlib import Path

def check_ollama_installation():
    """检查 Ollama 安装位置"""
    print("=" * 60)
    print("Ollama 安装位置检查")
    print("=" * 60)
    print()
    
    # 获取用户目录
    user_profile = os.environ.get('USERPROFILE', '')
    local_appdata = os.environ.get('LOCALAPPDATA', '')
    
    print(f"用户目录: {user_profile}")
    print(f"本地应用数据目录: {local_appdata}")
    print()
    
    # 检查可执行文件位置
    ollama_exe_paths = [
        Path(local_appdata) / "Programs" / "Ollama" / "ollama.exe",
        Path(user_profile) / "AppData" / "Local" / "Programs" / "Ollama" / "ollama.exe",
    ]
    
    print("检查 Ollama 可执行文件:")
    ollama_found = False
    for path in ollama_exe_paths:
        if path.exists():
            print(f"  [OK] 找到: {path}")
            ollama_found = True
            break
        else:
            print(f"  [X] 未找到: {path}")
    
    print()
    
    # 检查模型目录
    models_paths = [
        Path(user_profile) / ".ollama" / "models",
        Path(os.environ.get('OLLAMA_MODELS', '')),
    ]
    
    print("检查模型存储目录:")
    models_found = False
    for path in models_paths:
        if path and path.exists():
            print(f"  [OK] 找到: {path}")
            # 列出模型
            models = list(path.glob("*"))
            if models:
                print(f"     已下载 {len(models)} 个模型文件")
            models_found = True
            break
    
    if not models_found:
        print(f"  [X] 未找到模型目录")
        print(f"     默认位置: {Path(user_profile) / '.ollama' / 'models'}")
    
    print()
    print("=" * 60)
    
    if ollama_found:
        print("[OK] Ollama 已安装")
        print()
        print("下一步:")
        print("1. 确保 Ollama 正在运行（检查系统托盘或运行 'ollama serve'）")
        print("2. 下载模型: ollama pull qwen2.5:7b-q4_0")
        print("3. 验证连接: 浏览器访问 http://localhost:11434")
    else:
        print("[X] Ollama 未安装")
        print()
        print("安装步骤:")
        print("1. 访问 https://ollama.ai/download")
        print("2. 下载 OllamaSetup.exe")
        print("3. 运行安装程序")
        print("4. 安装完成后，运行 'ollama pull qwen2.5:7b-q4_0' 下载模型")
    
    print("=" * 60)

if __name__ == "__main__":
    check_ollama_installation()

