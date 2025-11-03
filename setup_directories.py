"""
创建项目必要目录结构
"""
from pathlib import Path

BASE_DIR = Path("F:/StructForgeAI")

directories = [
    BASE_DIR / "data" / "uploads",
    BASE_DIR / "data" / "exports",
    BASE_DIR / "data" / "vector_db",
    BASE_DIR / "templates",
    BASE_DIR / "logs",
    BASE_DIR / "backend",
    BASE_DIR / "frontend",
    BASE_DIR / "docs",
    BASE_DIR / "tests",
]

print("正在创建目录结构...")
for directory in directories:
    directory.mkdir(parents=True, exist_ok=True)
    print(f"✓ {directory}")

# 创建.gitkeep文件
gitkeep_files = [
    BASE_DIR / "data" / "uploads" / ".gitkeep",
    BASE_DIR / "data" / "exports" / ".gitkeep",
]

for gitkeep in gitkeep_files:
    gitkeep.touch()
    print(f"✓ {gitkeep}")

print("\n目录结构创建完成！")
print(f"项目根目录: {BASE_DIR}")

