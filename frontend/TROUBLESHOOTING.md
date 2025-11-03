# 前端安装问题排查

## ❌ 问题：npm install 没有进度显示，看不出是否卡住

### 解决方案1：使用详细进度模式

```powershell
cd F:\StructForgeAI\frontend
.\install_deps.bat
```

这个脚本会：
- 显示详细安装进度
- 提供镜像源选择
- 给出清晰的反馈

### 解决方案2：使用国内镜像加速

```powershell
cd F:\StructForgeAI\frontend

# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 安装依赖（带进度显示）
npm install --progress=true
```

### 解决方案3：使用yarn（更快）

```powershell
# 安装yarn（如果还没有）
npm install -g yarn

# 使用yarn安装（显示进度条）
cd F:\StructForgeAI\frontend
yarn install
```

### 解决方案4：手动检查安装状态

打开新的PowerShell窗口，运行：

```powershell
cd F:\StructForgeAI\frontend

# 检查npm是否在运行
Get-Process node -ErrorAction SilentlyContinue

# 检查安装目录大小（如果持续增长说明在安装）
Get-ChildItem node_modules -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
```

## 🔍 如何判断是否卡住

### 正常现象：
- ✅ 看到 `idealTree`、`sill` 等日志（正常）
- ✅ 看到 `downloading` 提示
- ✅ 看到包名列表
- ✅ CPU/网络活动（任务管理器查看）

### 可能卡住的迹象：
- ❌ 超过10分钟完全没有输出
- ❌ 网络活动为0
- ❌ CPU使用率为0

## ⚡ 快速解决

如果卡住超过10分钟：

1. **按 Ctrl+C 取消**

2. **使用快速安装脚本**：
   ```powershell
   cd F:\StructForgeAI\frontend
   .\quick_install.bat
   ```

3. **或使用yarn**：
   ```powershell
   yarn install
   ```

## 📊 安装进度参考

正常安装过程应该看到：
```
npm WARN deprecated xxx (这是警告，可以忽略)
added 1234 packages in 2m
```

## 🚀 验证安装

安装完成后验证：

```powershell
cd F:\StructForgeAI\frontend

# 检查关键包
npm list react
npm list vite

# 或直接尝试启动
npm run dev
```

## 💡 最佳实践

推荐使用国内镜像（速度快）：

```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

安装完成后，启动服务：
```powershell
npm run dev
```

