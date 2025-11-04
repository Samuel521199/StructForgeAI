"""
创建项目必要目录结构
"""
from pathlib import Path

# 自动检测项目根目录（脚本所在目录）
BASE_DIR = Path(__file__).parent.resolve()

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

print("Creating directory structure...")
for directory in directories:
    directory.mkdir(parents=True, exist_ok=True)
    print(f"[OK] {directory}")

# 创建.gitkeep文件
gitkeep_files = [
    BASE_DIR / "data" / "uploads" / ".gitkeep",
    BASE_DIR / "data" / "exports" / ".gitkeep",
]

for gitkeep in gitkeep_files:
    gitkeep.touch()
    print(f"[OK] {gitkeep}")

print("\nDirectory structure created!")
print(f"Project root: {BASE_DIR}")

