# 前端依赖安装指南

## ❌ 问题：npm install 卡在 idealTree 阶段

这是npm依赖解析阶段，可能确实需要较长时间（特别是首次安装）。

## ✅ 解决方案

### 方案1：使用国内镜像加速（推荐 ⭐）

```powershell
cd F:\StructForgeAI\frontend

# 设置镜像
npm config set registry https://registry.npmmirror.com

# 安装（带详细输出）
npm install --verbose
```

### 方案2：使用安装脚本

```powershell
cd F:\StructForgeAI\frontend
.\install_now.bat
```

### 方案3：使用yarn（更快）

```powershell
# 安装yarn（如果还没有）
npm install -g yarn

# 使用yarn安装（显示进度条）
cd F:\StructForgeAI\frontend
yarn install
```

### 方案4：检查是否真的卡住

在**新的PowerShell窗口**运行：

```powershell
cd F:\StructForgeAI\frontend
.\check_npm.bat
```

这会检查：
- node_modules是否存在
- 安装了多少文件
- npm进程是否在运行

## 🔍 判断是否在安装

### 正常现象（说明在安装）：
- 看到 `idealTree`、`sill` 等输出
- 任务管理器中看到 `node.exe` 进程（CPU使用率>0）
- 网络活动（下载数据）

### 真的卡住了：
- 超过15分钟完全没有新输出
- `node.exe` CPU使用率为0
- 没有网络活动

## ⚡ 如果确认卡住

1. **按 Ctrl+C 取消**

2. **使用镜像源重新安装**：
   ```powershell
   npm config set registry https://registry.npmmirror.com
   npm install --verbose
   ```

3. **或使用yarn**（通常更快）：
   ```powershell
   yarn install
   ```

## 📊 正常安装时间参考

- 使用npm（默认源）：5-10分钟
- 使用npm（国内镜像）：2-5分钟
- 使用yarn：1-3分钟

## ✅ 验证安装成功

安装完成后检查：

```powershell
cd F:\StructForgeAI\frontend

# 检查目录
dir node_modules

# 检查关键包
npm list react vite
```

如果看到大量文件和版本信息，说明安装成功。

## 🚀 安装完成后

```powershell
npm run dev
```

前端将在 http://localhost:3000 启动。

