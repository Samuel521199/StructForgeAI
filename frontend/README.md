# StructForge AI - Frontend

前端应用使用 React + TypeScript + Vite + Ant Design 构建。

## 开发环境要求

- Node.js 18+
- npm 或 yarn

## 安装依赖

```bash
npm install
# 或
yarn install
```

## 开发

```bash
npm run dev
# 或
yarn dev
```

应用将在 http://localhost:3000 启动

## 构建

```bash
npm run build
# 或
yarn build
```

## 项目结构

```
src/
├── components/        # 组件
│   └── Layout/       # 布局组件
├── pages/            # 页面组件
├── services/         # API服务
├── store/            # 状态管理
├── types/            # TypeScript类型定义
├── App.tsx           # 根组件
└── main.tsx          # 入口文件
```

## 特性

- ✅ React 18 + TypeScript
- ✅ Ant Design UI组件库
- ✅ React Router 路由
- ✅ Zustand 状态管理
- ✅ Axios API客户端
- ✅ Monaco Editor（代码编辑器，待集成）
- ✅ React Flow（关系图谱，待集成）

## 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
```

