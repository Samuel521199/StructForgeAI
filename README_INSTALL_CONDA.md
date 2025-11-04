# StructForge AI - Conda一键安装指南

## 🚀 快速安装（推荐）

### 方式1：一键安装前后端（最简单）

**Windows用户**：

双击运行项目根目录的 `install_all_conda.bat`：

```powershell
# 在项目根目录
.\install_all_conda.bat
```

此脚本会自动：
1. ✅ 检查前置条件（Conda、Node.js）
2. ✅ 创建项目目录结构
3. ✅ 安装后端Conda环境
4. ✅ 安装前端npm依赖
5. ✅ 完成所有配置

### 方式2：分别安装

#### 安装后端

```powershell
# 进入backend目录
cd backend
.\install_backend_conda.bat
```

或者使用原有的脚本：
```powershell
cd backend
.\setup_conda.bat
```

#### 安装前端

```powershell
# 进入frontend目录
cd frontend
.\install_frontend.bat
```

---

## 🎮 一键启动所有服务

### Windows

双击运行 `start_all_conda.bat`：

```powershell
# 在项目根目录
.\start_all_conda.bat
```

此脚本会：
1. ✅ 在新窗口启动后端服务（Conda环境）
2. ✅ 在新窗口启动前端服务
3. ✅ 自动打开浏览器访问服务

**服务地址**：
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs
- 前端界面: http://localhost:5173

### 单独启动

#### 启动后端

```powershell
cd backend
.\start_conda.bat
```

或手动启动：
```powershell
cd backend
conda activate structforge-ai
python main.py
```

#### 启动前端

```powershell
cd frontend
.\start_frontend.bat
```

或手动启动：
```powershell
cd frontend
npm run dev
```

---

## 📋 前置要求

### 必须安装

1. **Anaconda 或 Miniconda**
   - 下载地址: https://www.anaconda.com/download
   - 推荐: Miniconda（体积更小）
   - 安装时勾选"Add Anaconda to PATH"

2. **Node.js**
   - 下载地址: https://nodejs.org/
   - 推荐版本: Node.js 18+
   - npm会自动随Node.js安装

### 验证安装

```powershell
# 检查conda
conda --version

# 检查Node.js
node --version

# 检查npm
npm --version
```

---

## 📁 脚本说明

### 根目录脚本

| 脚本 | 说明 |
|------|------|
| `install_all_conda.bat` | 一键安装前后端环境 |
| `start_all_conda.bat` | 一键启动所有服务 |
| `stop_all.bat` | 停止所有服务 |

### 后端脚本

| 脚本 | 说明 |
|------|------|
| `backend\install_backend_conda.bat` | 安装后端Conda环境 |
| `backend\setup_conda.bat` | 创建Conda环境（原有） |
| `backend\start_conda.bat` | 启动后端服务 |

### 前端脚本

| 脚本 | 说明 |
|------|------|
| `frontend\install_frontend.bat` | 安装前端依赖 |
| `frontend\start_frontend.bat` | 启动前端服务 |

---

## 🔧 故障排查

### Conda环境问题

**问题1：conda命令未找到**
```
[错误] 未找到conda命令！
```

**解决方案**：
1. 确保已安装Anaconda或Miniconda
2. 重启终端/命令提示符
3. 检查PATH环境变量是否包含conda路径

**问题2：环境创建失败**
```
[错误] 环境创建失败！
```

**解决方案**：
1. 检查网络连接
2. 尝试手动创建：`conda env create -f backend\environment.yml`
3. 如果部分包失败，激活环境后手动安装：`pip install -r backend\requirements.txt`

### Node.js问题

**问题1：npm安装很慢**
```
解决方案：使用国内镜像
npm config set registry https://registry.npmmirror.com
```

**问题2：依赖安装失败**
```
解决方案：
1. 清除缓存：npm cache clean --force
2. 删除node_modules重新安装：rd /s /q node_modules && npm install
```

### 端口占用

**问题：端口8000或5173已被占用**

**解决方案**：
1. 查找占用进程：
   ```powershell
   # 查找8000端口
   netstat -ano | findstr :8000
   
   # 查找5173端口
   netstat -ano | findstr :5173
   ```
2. 结束进程或修改配置文件中的端口

---

## 📊 安装流程

```
开始
  ↓
检查前置条件（Conda、Node.js）
  ↓
创建项目目录结构
  ↓
安装后端（Conda环境）
  ├── 创建conda环境
  ├── 安装conda依赖
  └── 安装pip依赖
  ↓
安装前端（npm依赖）
  ├── 清理旧依赖
  └── npm install
  ↓
完成！
```

---

## 🎯 常用命令

### Conda环境管理

```powershell
# 激活环境
conda activate structforge-ai

# 查看已安装的包
conda list

# 更新环境（从environment.yml）
conda env update -f backend\environment.yml

# 删除环境
conda env remove -n structforge-ai

# 导出环境配置
conda env export > environment.yml
```

### npm管理

```powershell
# 安装依赖
npm install

# 更新依赖
npm update

# 清理并重新安装
rd /s /q node_modules && npm install

# 查看依赖
npm list
```

---

## 💡 提示

1. **首次安装**：可能需要10-20分钟，请耐心等待
2. **网络问题**：如果下载慢，考虑使用国内镜像源
3. **环境隔离**：Conda环境确保项目依赖不冲突
4. **定期更新**：定期更新依赖包获得最新功能和安全修复

---

**最后更新**：2024年  
**版本**：v0.1.0-alpha

