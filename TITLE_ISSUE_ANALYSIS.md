# 标题编辑被覆盖问题分析

## 问题描述
用户编辑笔记标题后，标题会被重新覆盖成原来的内容。

## 问题根源

### 当前流程

```
用户编辑标题 
  ↓
handleTitleChange → debouncedUpdate({ title: newValue })
  ↓
1秒 debounce 后 → onUpdateNote({ title: newValue, content: ... })
  ↓
App.tsx: handleUpdateNote → api.updateNote(id, { title, content })
  ↓
后端返回响应 → apiNoteToLocalNote(response.data)
  ↓
setNotes(prev => prev.map(...))
  ↓
Editor 重新渲染，note.title 被更新
```

### 问题所在

#### 问题 1: 后端返回旧数据

在 `App.tsx:handleUpdateNote` 中：

```typescript
const response = await api.updateNote(updatedNote.id, {
  title: updatedNote.title,      // 发送新标题
  content: updatedNote.content,  // 发送新内容
});

if (response.success) {
  const apiUpdatedNote = apiNoteToLocalNote(response.data);
  // 用后端返回的数据覆盖本地状态
  setNotes(prev => prev.map(n => n.id === updatedNote.id ? apiUpdatedNote : n));
}
```

如果后端返回的 `response.data` 中，标题字段没有被正确更新，那么用户的新标题就会被旧值覆盖。

#### 问题 2: 竞态条件（Race Condition）

时间线：
```
T0: 用户开始输入 "新标题A"
T1: debouncedUpdate({ title: "新标题A" })
T2: debounce 定时器设置为 1 秒
T3: 0.5 秒后，用户继续输入，现在是 "新标题B"
T4: handleTitleChange 再次被调用
T5: pendingUpdateRef.current = { title: "新标题B" }  // 覆盖了 A
T6: 清除之前的定时器
T7: 设置新的定时器（1 秒）
T8: 1 秒后，定时器触发
T9: onUpdateNote({ title: "新标题B", content: ... })
T10: API 请求发出
```

这个流程看起来是对的，但问题在于：

如果后端的 `updateNote` 操作有问题，比如：
- 只更新了 `content` 表，没有更新 `notes` 表的 `title` 字段
- 或者在某些情况下返回了缓存的旧数据

那么用户看到的就是旧标题。

### 后端代码分析

查看 `backend/src/services/notes.service.ts:243-295`：

```typescript
async update(userId: string, noteId: string, data: NoteUpdateInput) {
  // ... 验证逻辑

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.noteType !== undefined) updateData.type = data.noteType;
  if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
  if (data.folderId !== undefined) updateData.folderId = data.folderId;

  const note = await prisma.note.update({
    where: { id: noteId },
    data: updateData,  // 更新 notes 表
    // ...
  });

  // 单独更新 content
  if (data.content !== undefined) {
    await prisma.noteContent.update({
      where: { noteId },
      data: { content: data.content },  // 更新 note_contents 表
    });
    note.content = { ...note.content, content: data.content };
  }

  return note;
}
```

**这看起来是正确的**，应该能正确更新标题。

### 可能的实际原因

#### 原因 1: 前端数据转换问题

`apiNoteToLocalNote` 函数可能有问题，导致转换后的数据不正确。

#### 原因 2: 编辑器输入框受控状态问题

Editor 组件的输入框是受控的：
```tsx
<input
  value={note.title}  // 直接使用 prop
  onChange={handleTitleChange}
/>
```

如果 `note.title` 在 API 响应返回后被更新为旧值，输入框就会显示旧值。

#### 原因 3: 多次更新导致的混乱

用户可能：
1. 编辑标题，触发第一个更新
2. 编辑内容，触发第二个更新
3. 第二个更新的响应返回，覆盖了第一个更新的标题
4. 标题被恢复为旧值

## 解决方案

### 方案 1: 在 Editor 组件中维护本地标题状态（推荐）

让 Editor 组件维护自己的标题状态，只在保存成功后同步到父组件：

```typescript
const Editor: React.FC<EditorProps> = ({ note, onUpdateNote }) => {
  const [localTitle, setLocalTitle] = useState(note?.title || '');

  // 当 note prop 变化时（切换笔记），同步标题
  useEffect(() => {
    setLocalTitle(note?.title || '');
  }, [note?.id]);  // 只在笔记 ID 变化时同步

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);  // 更新本地状态
    debouncedUpdate({ title: e.target.value });  // 仍然调用更新
  };

  return (
    <input
      value={localTitle}  // 使用本地状态
      onChange={handleTitleChange}
    />
  );
};
```

**优点**：
- 用户输入立即反映在界面上
- 不会被后端响应覆盖
- 用户体验流畅

**缺点**：
- 需要额外的状态管理
- 需要在 note 切换时同步

### 方案 2: 优化后端返回数据

确保后端返回的数据是更新后的最新值：

```typescript
// backend/src/services/notes.service.ts
async update(userId: string, noteId: string, data: NoteUpdateInput) {
  // ... 更新逻辑

  // 在返回前，重新查询以获取最新数据
  const freshNote = await prisma.note.findFirst({
    where: { id: noteId },
    include: { content: true, folder: true, tags: true }
  });

  return freshNote;
}
```

**优点**：
- 确保返回最新数据
- 不需要修改前端

**缺点**：
- 增加一次数据库查询
- 响应时间可能增加

### 方案 3: 乐观更新 + 后端响应验证

在更新前先更新本地状态，收到后端响应后再验证是否需要调整：

```typescript
const handleUpdateNote = useCallback(async (updatedNote: Note) => {
  // 乐观更新：立即更新本地状态
  setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));

  try {
    const response = await api.updateNote(updatedNote.id, {
      title: updatedNote.title,
      content: updatedNote.content,
    });

    if (response.success) {
      const apiUpdatedNote = apiNoteToLocalNote(response.data);

      // 只更新后端确认的字段
      setNotes(prev => prev.map(n => {
        if (n.id === updatedNote.id) {
          return {
            ...n,  // 保留本地状态
            // 只更新后端可能变化的字段
            ...(response.data.title && { title: apiUpdatedNote.title }),
            ...(response.data.content && { content: apiUpdatedNote.content }),
          };
        }
        return n;
      }));
    }
  } catch (error) {
    // 错误处理...
  }
}, [isAuthenticated]);
```

**优点**：
- 用户输入立即反映
- 减少不必要的重新渲染
- 保持本地状态

**缺点**：
- 实现复杂
- 需要小心处理字段合并

## 推荐方案

**方案 1（Editor 本地状态）**是最适合的，因为：
1. 用户体验最好，输入立即响应
2. 实现相对简单
3. 不会被后端响应影响
4. 符合 React 最佳实践

## 需要修改的文件

1. `components/Editor.tsx`
   - 添加 `localTitle` 状态
   - 修改标题输入框的 value
   - 添加 useEffect 同步标题

2. 可选：`backend/src/services/notes.service.ts`
   - 优化更新后查询逻辑
