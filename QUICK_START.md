# StructForge AI - 快速启动指南

## 🎯 一键启动（最简单）

```powershell
# 在项目根目录
cd F:\StructForgeAI
.\start_all.bat

# 选择选项 3（启动后端和前端）
```

就这么简单！服务将在新窗口中启动。

## 📋 首次安装（只需一次）

### 1. 安装后端环境

```powershell
cd F:\StructForgeAI\backend
.\setup_conda.bat
```

等待安装完成（约5-10分钟）

### 2. 安装前端依赖

```powershell
cd F:\StructForgeAI\frontend
.\setup_frontend.bat
```

等待安装完成（约2-5分钟）

## 🚀 日常使用

### 启动服务

```powershell
# 方式1：一键启动（推荐）
.\start_all.bat

# 方式2：分别启动
# 终端1：后端
cd backend && .\start_conda.bat

# 终端2：前端
cd frontend && .\start_frontend.bat
```

### 停止服务

```powershell
# 方式1：使用脚本
.\stop_all.bat

# 方式2：关闭命令行窗口
# 或按 Ctrl+C
```

## 🌐 访问地址

启动成功后访问：

- **前端界面**：http://localhost:3000 ⭐
- **后端API**：http://localhost:8000
- **API文档**：http://localhost:8000/docs

## 📝 完整脚本列表

### 后端
- `backend\setup_conda.bat` - 首次安装
- `backend\start_conda.bat` - 启动服务
- `backend\verify_install.bat` - 验证安装

### 前端
- `frontend\setup_frontend.bat` - 首次安装
- `frontend\start_frontend.bat` - 启动服务

### 统一管理
- `start_all.bat` - 一键启动所有服务 ⭐
- `stop_all.bat` - 停止所有服务 ⭐

## ⚡ 快速测试

1. **启动服务**：`.\start_all.bat`（选择选项3）

2. **访问前端**：http://localhost:3000

3. **测试功能**：
   - 上传文件
   - 解析文件
   - Schema分析

4. **查看API**：http://localhost:8000/docs

## 🔧 遇到问题？

查看详细文档：
- [完整安装指南](SETUP_COMPLETE.md)
- [Conda安装指南](CONDA_SETUP_GUIDE.md)
- [故障排查](backend/TROUBLESHOOTING.md)

---

**使用 `start_all.bat` 一键启动，轻松便捷！** 🎉
