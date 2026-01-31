# 🎯 即时通讯系统 - 快速参考卡片

## 🚀 一句话启动
```bash
cd /Users/wyh/Documents/AIIgnite/AIIgniteNote && docker-compose up -d && open http://localhost:3210
```

---

## 💡 5 分钟快速使用

### 1. 打开应用
访问: **http://localhost:3210**

### 2. 选择联系人
"联系人" 标签页 → 点击在线用户

### 3. 开始聊天
输入消息 → 按 **Enter** → 完成！

### 4. 试试新功能
- 🎨 **表情**: 点击工具栏表情按钮
- 📎 **文件**: 点击文件按钮上传
- 📸 **截图**: 点击截图按钮
- 👤 **@提及**: 输入 @ 字符

---

## 🛠️ 常用命令速查

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 查看日志
docker-compose logs -f backend

# 重启后端
docker-compose restart backend

# 进入容器
docker-compose exec backend bash

# 数据库查询
docker-compose exec postgres psql -U postgres -d ai_ignite_note
```

---

## 📍 访问地址

| 服务 | 地址 | 说明 |
|-----|------|------|
| 前端 | http://localhost:3210 | Web 应用 |
| 后端 | http://localhost:3215 | API 服务器 |
| 数据库 | localhost:5434 | PostgreSQL |

---

## 🎨 表情分类速查

| 分类 | 按钮 | 个数 | 示例 |
|-----|------|------|------|
| 表情 | 😊 | 30 | 😀😃😄😁😆😅😂🤣😊😇 |
| 人物 | 👋 | 30 | 👋🤚🖐️✋🖖👌🤌🤏✌️🤞 |
| 食物 | 🍎 | 30 | 🍎🍊🍋🍌🍉🍇🍓🍈🍒🍑 |
| 物体 | 📱 | 30 | ⌚📱📲💻⌨️🖥️🖨️🖱️🖲️🕹️ |
| 符号 | ❤️ | 30 | ❤️🧡💛💚💙💜🖤🧡💛💔 |

**总计: 150+ 个表情！**

---

## ⚡ 快捷键速查

| 快捷键 | 功能 |
|-------|------|
| **Enter** | 发送消息 |
| **@** | 显示成员列表 |
| **Shift+Click** | 多选文件 |

---

## 🐛 故障速查

| 问题 | 快速解决 |
|-----|---------|
| 容器不启动 | `docker-compose restart` |
| 连接缓慢 | 清除浏览器缓存 |
| 消息不显示 | 检查: `docker-compose logs backend` |
| 数据库错误 | 重启: `docker-compose restart postgres` |

---

## 📊 系统健康检查

```bash
# 一键检查所有服务
docker-compose ps

# 输出应该看起来像这样
✓ backend   (healthy)
✓ frontend  (healthy)
✓ postgres  (healthy)
```

---

## 📚 文档导航

```
QUICK_START_MESSAGING.md ← 你在这里
├── 功能详解 → MESSAGING_FEATURES_SUMMARY.md
├── 测试指南 → MESSAGING_TEST_GUIDE.md
├── 实现细节 → IMPLEMENTATION_SUMMARY.md
└── 完成报告 → WORK_COMPLETION_REPORT.md
```

---

## 🎯 功能清单

- [x] 💬 实时消息
- [x] 🎨 表情系统 (150+)
- [x] 📎 文件上传
- [x] 📸 截图功能
- [x] 👤 @提及
- [x] ⏰ 时间戳
- [x] 👤 头像显示
- [x] 💾 数据持久化

---

## 🔗 重要链接

| 资源 | 位置 |
|-----|------|
| 前端代码 | `components/Chat.tsx` |
| 后端 Socket | `backend/src/socket/index.ts` |
| 数据库模型 | `backend/prisma/schema.prisma` |
| 快速启动 | `QUICK_LAUNCH.sh` |

---

## ✨ 工作流示例

### 示例 1: 发送表情
```
1. 点击 😊 按钮
2. 选择 "👋 人物" 分类
3. 点击 "👍" 表情
4. 完成！
```

### 示例 2: 上传文件
```
1. 点击 📎 按钮
2. 选择 document.pdf
3. 看到绿色成功提示
4. 完成！
```

### 示例 3: @提及
```
1. 输入: @
2. 选择: 张三
3. 继续输入: "你好"
4. 发送: "@张三 你好"
```

---

## 🎓 学习路径

### 初学者
1. 打开应用
2. 发送普通消息
3. 尝试表情功能
4. 阅读 QUICK_START_MESSAGING.md

### 进阶用户
1. 了解文件上传
2. 掌握 @提及
3. 查看实时同步
4. 阅读 MESSAGING_FEATURES_SUMMARY.md

### 开发者
1. 查看代码实现
2. 理解 Socket.IO 通信
3. 学习数据库设计
4. 阅读 IMPLEMENTATION_SUMMARY.md

---

## 🔒 安全建议

- 定期备份数据库
- 使用强密码
- 定期更新容器镜像
- 监控系统日志

---

## 📞 需要帮助？

### 查看文档
- 快速开始: `QUICK_START_MESSAGING.md`
- 完整功能: `MESSAGING_FEATURES_SUMMARY.md`
- 测试指南: `MESSAGING_TEST_GUIDE.md`

### 检查日志
```bash
docker-compose logs -f
```

### 联系支持
查看相应的 .md 文件中的常见问题部分

---

## 🎊 祝贺！

您现在已经掌握了即时通讯系统的基本用法。

**开始聊天吧！** 🚀

---

**最后更新**: 2024 | **版本**: 1.0.0
