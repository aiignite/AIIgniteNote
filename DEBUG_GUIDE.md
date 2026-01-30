# 笔记加载问题调试指南

## 已添加的调试日志

为了诊断笔记列表在登录时不显示的问题，已在以下位置添加了详细日志：

### 前端日志 (App.tsx)
- `[loadNotes]` - 笔记加载过程日志
- 记录 API 响应、数据转换、状态更新等详细信息

### 后端 Controller 日志 (backend/src/controllers/notes.controller.ts)
- `[NotesController.list]` - 笔记列表接口日志
- 记录请求参数、查询结果、响应等

### 后端 Service 日志 (backend/src/services/notes.service.ts)
- `[NotesService.list]` - 数据库查询日志
- 记录 SQL 查询条件、排序、分页、查询结果等

## 如何使用这些日志进行调试

### 步骤 1: 查看浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签页
3. 清空控制台（点击清除按钮）
4. 刷新页面或登录账号
5. 查找以 `[loadNotes]` 开头的日志

**预期看到的日志顺序：**
```
[loadNotes] Starting... { isAuthenticated: true, selectedNoteId: null }
[loadNotes] Calling api.getNotes()...
[loadNotes] API Response: { success: true, data: [...] }
[loadNotes] Response.success: true
[loadNotes] Response.data type: object
[loadNotes] Response.data is Array: true
[loadNotes] Response.data length: X
[loadNotes] Processing notes data...
[loadNotes] Converted notes: [...]
[loadNotes] Notes count: X
[loadNotes] Setting notes state...
[loadNotes] Auto-selecting first note: xxx
[loadNotes] Finished, setting notesLoading to false
```

### 步骤 2: 查看网络请求

1. 在开发者工具中切换到 **Network** 标签页
2. 筛选 **XHR/Fetch** 请求
3. 查找 `/api/notes` 请求
4. 点击该请求查看详细信息
5. 切换到 **Response** 标签查看响应内容

**检查要点：**
- 状态码是否为 200
- 响应数据格式是否正确
- `data` 字段是否存在且是数组
- 数组是否包含笔记数据

### 步骤 3: 查看后端日志

启动后端服务后，查看终端输出：

**预期看到的日志顺序：**
```
[NotesController.list] Starting... { userId: 'xxx', query: {} }
[NotesController.list] Params: { page: undefined, limit: undefined, ... }
[NotesController.list] Params: { page: undefined, limit: undefined, ... }
[NotesService.list] Starting... { userId: 'xxx', params: {...} }
[NotesService.list] Initial WHERE clause: {...}
[NotesService.list] Order by: { updatedAt: 'desc' }
[NotesService.list] Pagination: { page: 1, limit: 20, skip: 0 }
[NotesService.list] Counting total notes...
[NotesService.list] Total notes count: X
[NotesService.list] Fetching notes from database...
[NotesService.list] Fetched notes count: X
[NotesService.list] First note sample: {...}
[NotesController.list] Result from service: { notes: [...], pagination: {...} }
[NotesController.list] Notes count: X
[NotesController.list] Pagination: {...}
[NotesController.list] Response sent successfully
```

## 常见问题和解决方案

### 问题 1: `[loadNotes] Response.data length: 0`

**原因：** 数据库中没有该用户的笔记数据

**解决方案：**
1. 检查后端日志中的 `Total notes count: 0`
2. 确认当前登录的用户 ID 是否正确
3. 检查数据库中该用户是否创建了笔记
4. 如果是首次登录，尝试创建一个测试笔记

### 问题 2: `[loadNotes] Error: Network error - please check your connection`

**原因：** 网络连接问题或后端服务未启动

**解决方案：**
1. 检查后端服务是否正在运行
2. 检查 API 地址是否正确（默认：http://localhost:4000）
3. 检查浏览器控制台的 Network 标签，确认请求是否发出
4. 查看后端终端是否有请求日志

### 问题 3: `[loadNotes] Response.success is false`

**原因：** API 返回错误

**解决方案：**
1. 查看完整的 Response 对象，查找 error 字段
2. 检查后端日志，查找错误信息
3. 检查认证 token 是否有效

### 问题 4: `[loadNotes] Error loading from cache: ...`

**原因：** IndexedDB 出错（仅在 API 失败时触发）

**解决方案：**
1. 这个错误通常可以忽略，因为它是回退机制
2. 如果 API 正常工作，这个错误不影响使用
3. 如果 API 失败且缓存也失败，用户将看不到笔记

### 问题 5: `[NotesService.list] Total notes count: X` 但前端显示为空

**原因：** 数据转换失败

**解决方案：**
1. 检查 `[loadNotes] Converted notes` 日志
2. 查看是否有 `apiNoteToLocalNote` 转换错误
3. 检查笔记数据结构是否符合预期

## 下一步操作

根据日志输出，确定问题所在：

1. **如果数据库中没有笔记** - 需要创建测试数据
2. **如果 API 调用失败** - 需要检查网络和后端服务
3. **如果数据转换失败** - 需要修复 `apiNoteToLocalNote` 函数
4. **如果前端状态未更新** - 需要检查 React 状态管理

## 创建测试笔记的方法

如果数据库为空，可以通过以下方式创建测试笔记：

### 方法 1: 通过前端界面创建
1. 登录后点击"+"按钮
2. 选择笔记类型（Markdown）
3. 创建一个测试笔记

### 方法 2: 直接插入数据库（不推荐）
```sql
INSERT INTO notes (id, title, type, author_id, created_at, updated_at)
VALUES (
  'test-note-id',
  'Test Note',
  'MARKDOWN',
  'user-id-here',
  NOW(),
  NOW()
);

INSERT INTO note_contents (id, note_id, content, created_at, updated_at)
VALUES (
  'test-content-id',
  'test-note-id',
  'This is a test note content',
  NOW(),
  NOW()
);
```

## 联系支持

如果以上步骤都无法解决问题，请收集以下信息并提交问题：

1. 浏览器控制台的完整日志输出
2. Network 面板中 `/api/notes` 请求的详细信息
3. 后端终端的完整日志输出
4. 使用的浏览器版本和操作系统
5. 后端服务版本
