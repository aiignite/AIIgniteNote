# 技术栈和构建系统

## 前端技术栈

- **框架**: React 18.2.0 + TypeScript 5.8.2
- **构建工具**: Vite 6.2.0
- **状态管理**: Zustand 4.5.0
- **样式**: Tailwind CSS (通过类名使用)
- **编辑器组件**:
  - Markdown: @uiw/react-md-editor 3.6.0
  - 富文本: react-quill 2.0.0
  - 思维导图: simple-mind-map 0.11.0
  - 流程图: @svgdotjs/svg.js 3.2.0

## AI集成

- **AI服务**: Google Gemini API (@google/genai 1.37.0)
- **环境变量**: GEMINI_API_KEY (在 .env.local 中配置)

## 数据库

- **数据库**: PostgreSQL
- **架构**: 完整的关系型数据库设计，支持用户、工作空间、笔记、标签等
- **搜索**: 全文搜索支持 (tsvector)
- **特性**: 版本控制、软删除、权限管理

## 常用命令

```bash
# 安装依赖
npm install

# 开发服务器 (端口 3000)
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 开发配置

- **端口**: 3000 (开发服务器)
- **主机**: 0.0.0.0 (允许外部访问)
- **路径别名**: @ 指向项目根目录
- **热重载**: 支持
- **TypeScript**: 严格模式，支持装饰器