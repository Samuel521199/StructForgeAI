# Conda环境使用说明

## ⚠️ 重要提示

如果遇到 `EnvironmentFileNotFound: 'environment.yml' file not found` 错误：

**解决方法**：
1. 确保在 `backend` 目录下运行脚本
2. 确保 `environment.yml` 文件存在于 `backend` 目录
3. 使用绝对路径运行脚本

## ✅ 正确的运行方式

```powershell
# 1. 进入backend目录
cd F:\StructForgeAI\backend

# 2. 检查文件是否存在
dir environment.yml

# 3. 运行安装脚本
.\setup_conda.bat
```

## 🔍 检查步骤

如果脚本仍然失败，请检查：

1. **文件位置**：
   ```
   F:\StructForgeAI\backend\
   ├── environment.yml    ← 必须存在
   ├── setup_conda.bat    ← 安装脚本
   └── start_conda.bat    ← 启动脚本
   ```

2. **手动创建环境**（如果脚本有问题）：
   ```powershell
   cd F:\StructForgeAI\backend
   conda env create -f environment.yml
   ```

3. **验证环境**：
   ```powershell
   conda env list
   # 应该看到 structforge-ai 环境
   ```

## 📞 需要帮助？

如果问题持续存在，请提供：
- 运行脚本时的完整错误信息
- `dir` 命令的输出（查看backend目录内容）
- conda版本信息：`conda --version`

