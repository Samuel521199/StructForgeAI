# StructForge AI - Conda环境安装指南

## 🎯 为什么使用Conda？

- ✅ **环境隔离**：每个项目独立环境，互不干扰
- ✅ **依赖管理**：自动处理复杂依赖关系
- ✅ **跨平台**：Windows、Linux、macOS统一方式
- ✅ **包管理**：支持pip和conda两种包管理器
- ✅ **科学计算库**：对科学计算库支持更好（如numpy、pandas）

## 📋 前置要求

### 安装Anaconda或Miniconda

**Windows**:
1. 下载 [Anaconda](https://www.anaconda.com/download) 或 [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
2. 运行安装程序（建议勾选"Add Anaconda to PATH"）
3. 重启终端

**Linux/macOS**:
```bash
# 下载并安装Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# 或使用brew（macOS）
brew install miniconda
```

**验证安装**:
```bash
conda --version
```

## 🚀 快速安装（推荐）

### Windows用户

**方式1：使用自动化脚本（最简单）**

```powershell
cd F:\StructForgeAI\backend
.\setup_conda.bat
```

脚本会自动：
1. ✅ 检查conda是否安装
2. ✅ 创建独立环境 `structforge-ai`
3. ✅ 安装所有依赖
4. ✅ 配置完成

**方式2：手动安装**

```powershell
# 创建环境（根据environment.yml）
conda env create -f environment.yml

# 激活环境
conda activate structforge-ai

# 如果需要安装faiss（可选）
conda install -c conda-forge faiss-cpu
```

### Linux/macOS用户

```bash
# 添加执行权限
chmod +x setup_conda.sh start_conda.sh

# 运行安装脚本
./setup_conda.sh
```

## 🎮 启动服务

### Windows

**使用启动脚本（推荐）**:
```powershell
cd F:\StructForgeAI\backend
.\start_conda.bat
```

**手动启动**:
```powershell
cd F:\StructForgeAI\backend
conda activate structforge-ai
python main.py
```

### Linux/macOS

```bash
cd F:\StructForgeAI\backend
./start_conda.sh
```

## 📁 Conda环境管理

### 查看所有环境

```bash
conda env list
```

输出示例：
```
# conda environments:
#
base                     /home/user/anaconda3
structforge-ai        *  /home/user/anaconda3/envs/structforge-ai
other-project            /home/user/anaconda3/envs/other-project
```

### 激活/停用环境

```bash
# 激活
conda activate structforge-ai

# 停用
conda deactivate
```

### 更新环境

```bash
# 更新环境文件中的包
conda env update -f environment.yml --prune
```

### 删除环境（如需重建）

```bash
conda env remove -n structforge-ai
```

### 导出环境配置

```bash
# 导出当前环境配置
conda env export > environment_backup.yml

# 导出跨平台配置（更通用）
conda env export --no-builds > environment_backup.yml
```

## 🔧 环境配置说明

### environment.yml 结构

```yaml
name: structforge-ai        # 环境名称（项目独有）
channels:                   # Conda频道
  - conda-forge
  - defaults
dependencies:
  - python=3.10            # Python版本
  - pip                    # pip包管理器
  - pip:                   # 通过pip安装的包
    - fastapi==0.104.1
    # ... 更多依赖
```

### 特殊包说明

**faiss-cpu** (向量数据库):
- 通过conda安装更稳定
- 如果pip安装失败，使用：
  ```bash
  conda activate structforge-ai
  conda install -c conda-forge faiss-cpu
  ```

## ⚠️ 常见问题

### 1. 环境创建失败

**问题**：`Solving environment: failed`

**解决**：
```bash
# 清理conda缓存
conda clean --all

# 更新conda
conda update conda

# 重新创建
conda env create -f environment.yml --force
```

### 2. 包安装冲突

**问题**：某些包版本冲突

**解决**：
```bash
# 使用mamba（更快的依赖解析器）
conda install -c conda-forge mamba
mamba env create -f environment.yml
```

### 3. 激活环境失败

**问题**：`CommandNotFoundError`

**解决**：
```bash
# Windows PowerShell
conda init powershell
# 然后重启PowerShell

# Linux/macOS
conda init bash
# 或
eval "$(conda shell.bash hook)"
```

### 4. 环境位置

**查看环境位置**：
```bash
conda env list
```

**更改默认环境位置**（可选）：
```bash
# 设置环境目录
conda config --set envs_dirs D:/conda/envs
```

## 📊 环境对比

| 特性 | venv | conda |
|------|------|-------|
| 环境隔离 | ✅ | ✅ |
| 项目独立 | ✅ | ✅ |
| Python版本管理 | ❌ | ✅ |
| 科学计算库支持 | ⚠️ | ✅ |
| 跨平台 | ✅ | ✅ |
| 依赖解析 | 基础 | 强大 |

## ✅ 验证清单

安装完成后检查：

- [ ] `conda --version` 可以运行
- [ ] `conda env list` 显示 `structforge-ai` 环境
- [ ] `conda activate structforge-ai` 成功激活
- [ ] `python --version` 显示 Python 3.10
- [ ] `python -c "import fastapi"` 无错误
- [ ] `python main.py` 可以启动服务

## 🎉 完成！

现在你有了一个完全独立的conda环境，不会与其他项目冲突！

**快速启动**：
```bash
# Windows
.\start_conda.bat

# Linux/macOS
./start_conda.sh
```

---

**需要帮助？** 查看日志文件：`logs/app.log`

