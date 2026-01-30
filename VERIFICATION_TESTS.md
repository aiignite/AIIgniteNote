# 完整功能验证测试

## 系统状态

✅ **PostgreSQL数据库**: 运行在 localhost:5434
✅ **后端API服务**: 运行在 http://localhost:4000
✅ **前端开发服务器**: 运行在 http://localhost:3200

## 测试步骤

### 1. 打开前端应用
访问: http://localhost:3200

### 2. 注册新用户
- 点击"注册"按钮
- 填写邮箱、密码、用户名
- 提交表单
- **预期结果**: 成功注册并自动登录

### 3. 创建笔记
- 点击"新建笔记"按钮
- 输入标题和内容
- 点击保存
- **预期结果**: 笔记保存到数据库，刷新页面后仍然存在

### 4. 创建模板
- 点击"模板库"
- 点击"创建模板"按钮
- 填写模板信息（名称、描述、提示词等）
- 点击保存
- **预期结果**: 模板保存到数据库，切换页面后再回来仍然存在

### 5. 使用AI功能
- 打开AI助手面板
- 选择AI提供商（需要配置API密钥）
- 发送消息
- **预期结果**: 收到AI回复

### 6. 搜索功能
- 在搜索框输入关键词
- **预期结果**: 返回匹配的笔记

### 7. 文件上传
- 在笔记中上传文件
- **预期结果**: 文件上传成功并显示在笔记中

## API测试命令

### 注册用户
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

### 登录
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 获取笔记列表
```bash
curl -X GET http://localhost:4000/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 创建笔记
```bash
curl -X POST http://localhost:4000/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is a test note",
    "noteType": "MARKDOWN"
  }'
```

### 创建模板
```bash
curl -X POST http://localhost:4000/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Template",
    "description": "A test template",
    "prompt": "Please help me with this task",
    "category": "General",
    "icon": "auto_awesome",
    "isPublic": false
  }'
```

### 获取模板列表
```bash
curl -X GET http://localhost:4000/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 发送AI对话请求
```bash
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-pro",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

## 常见问题排查

### 问题: 前端无法连接到后端
**解决方案**:
1. 检查后端是否运行: `curl http://localhost:4000/health`
2. 检查CORS配置
3. 检查浏览器控制台错误信息

### 问题: 数据库连接失败
**解决方案**:
1. 检查PostgreSQL是否运行: `docker ps | grep postgres`
2. 检查DATABASE_URL环境变量
3. 查看后端日志

### 问题: 模板无法保存
**解决方案**:
1. 检查用户是否已登录
2. 检查后端日志中的错误信息
3. 验证数据库连接

### 问题: AI功能不工作
**解决方案**:
1. 检查是否配置了AI提供商的API密钥
2. 检查网络连接
3. 查看后端日志中的错误信息

## 下一步

所有系统已启动并运行。现在可以：

1. **测试所有功能** - 按照上述步骤进行测试
2. **配置AI提供商** - 在设置中添加API密钥
3. **完成前端集成** - 确保所有组件都使用真实API
4. **运行测试套件** - 执行单元测试和集成测试
5. **部署到生产** - 使用Docker Compose进行容器化部署

## 监控日志

### 后端日志
```bash
tail -f backend/logs/combined.log
```

### 数据库日志
```bash
docker logs aiignitenote-postgres
```

### 前端控制台
打开浏览器开发者工具 (F12) 查看控制台输出
