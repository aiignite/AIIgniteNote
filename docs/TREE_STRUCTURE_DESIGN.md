# 笔记列表树形结构优化方案（简化版）

## 设计目标
在不破坏现有功能的前提下，添加树形文件夹结构和相关功能。

## 核心改动点

### 1. 添加状态管理

```typescript
// 文件夹展开状态
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

// 拖拽状态
const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
```

### 2. 文件夹树接口定义

```typescript
interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
  level: number;
}
```

### 3. 构建树形结构函数

```typescript
const buildFolderTree = (folders: Folder[]): FolderTreeNode[] => {
  const folderMap = new Map<string, FolderTreeNode>();
  
  // 初始化所有文件夹
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      level: 0
    });
  });
  
  // 建立父子关系
  const rootFolders: FolderTreeNode[] = [];
  folderMap.forEach(folder => {
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        folder.level = parent.level + 1;
        parent.children.push(folder);
      } else {
        rootFolders.push(folder);
      }
    } else {
      rootFolders.push(folder);
    }
  });
  
  // 排序
  const sortFolders = (folders: FolderTreeNode[]) => {
    folders.sort((a, b) => a.name.localeCompare(b.name));
    folders.forEach(f => sortFolders(f.children));
  };
  sortFolders(rootFolders);
  
  return rootFolders;
};
```

### 4. 渲染函数

#### 文件夹树渲染

```typescript
const renderFolderTree = (folder: FolderTreeNode): React.ReactNode => {
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;
  const paddingLeft = folder.level * 16 + 12;
  const isDragOver = dragOverFolderId === folder.id;
  
  return (
    <div key={folder.id} className="mb-0.5">
      {/* 文件夹行 */}
      <div
        onDragOver={(e) => handleDragOver(e, folder.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, folder.id)}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer ${
          isDragOver ? 'bg-primary/10 border-2 border-dashed border-primary' : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {/* 展开按钮 */}
        {hasChildren && (
          <button onClick={() => toggleFolder(folder.id)} className="p-0.5">
            <span className="material-symbols-outlined text-sm text-gray-400">
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        {/* 文件夹图标和名称 */}
        <div onClick={() => setCurrentFolder(folder.name)} className="flex-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-amber-400">
            {isExpanded ? 'folder_open' : 'folder'}
          </span>
          <span className="text-sm font-medium">{folder.name}</span>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={() => handleAddSubfolder(folder.id)} title="添加子文件夹">
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
          </button>
          <button onClick={() => handleRenameFolder(folder)} title="重命名">
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onClick={() => handleDeleteFolder(folder)} title="删除">
            <span className="material-symbols-outlined text-sm text-red-500">delete</span>
          </button>
        </div>
      </div>
      
      {/* 子文件夹 */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5">
          {folder.children.map(child => renderFolderTree(child))}
        </div>
      )}
    </div>
  );
};
```

#### 笔记项渲染（带标签和拖拽）

```typescript
const renderNoteItem = (note: Note, level: number = 0): React.ReactNode => {
  const paddingLeft = level * 16 + 12;
  
  return (
    <div
      key={note.id}
      draggable
      onDragStart={(e) => handleDragStart(e, note.id)}
      onClick={() => onSelectNote(note.id)}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer ${
        selectedNoteId === note.id ? 'bg-primary/5' : 'hover:bg-gray-50'
      }`}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {/* 笔记类型图标 */}
      <div className={`p-1.5 rounded-md ${getNoteTypeColor(note.type)}`}>
        <span className="material-symbols-outlined text-lg">
          {getNoteTypeIcon(note.type)}
        </span>
      </div>
      
      {/* 笔记信息 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium truncate">{note.title}</h3>
        <div className="text-[10px] text-gray-400 truncate">{note.updatedAt}</div>
      </div>

      {/* 标签 */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex gap-1">
          {note.tags.slice(0, 2).map((tag, idx) => (
            <span 
              key={idx}
              className="text-[9px] px-1.5 py-0.5 rounded-md"
              style={{ 
                backgroundColor: `${tag.color}20`, 
                color: tag.color 
              }}
            >
              {tag.name}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[9px] text-gray-400">+{note.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* 收藏和菜单 */}
      <div className="flex items-center gap-1">
        {note.isFavorite && (
          <span className="material-symbols-outlined text-sm text-amber-400 fill-current">star</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(note.id); }}>
          <span className="material-symbols-outlined text-base">more_horiz</span>
        </button>
      </div>
    </div>
  );
};
```

### 5. 主渲染逻辑

```typescript
{/* 根目录视图 */}
{currentFolder === null && !loading && !error && (
  <>
    {/* 渲染文件夹树 */}
    {buildFolderTree(folders).map(folder => renderFolderTree(folder))}
    
    {/* 渲染根目录笔记（没有文件夹的笔记） */}
    {notes
      .filter(n => !n.folder || n.folder === 'General')
      .map(note => renderNoteItem(note, 0))
    }
  </>
)}

{/* 文件夹内部视图（保持原有逻辑） */}
{currentFolder !== null && !loading && !error && (
  <>
    {notes
      .filter(n => n.folder === currentFolder)
      .map(note => renderNoteItem(note, 0))
    }
  </>
)}
```

### 6. 文件夹选择器Modal

```typescript
{modalConfig?.type === 'folder-tree' && (
  <div className="modal">
    <h3>选择文件夹</h3>
    <div className="max-h-96 overflow-y-auto">
      {/* 根目录选项 */}
      <button onClick={() => handleSelectFolder('')}>
        <span className="material-symbols-outlined">folder</span>
        根目录
      </button>
      
      {/* 文件夹树 */}
      {buildFolderTree(folders).map(folder => (
        renderFolderPickerOption(folder)
      ))}
    </div>
  </div>
)}
```

### 7. 拖拽处理

```typescript
const handleDragStart = (e: React.DragEvent, noteId: string) => {
  setDraggedNoteId(noteId);
  e.dataTransfer.effectAllowed = 'move';
};

const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
  if (draggedNoteId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  }
};

const handleDrop = (e: React.DragEvent, folderId: string | null) => {
  e.preventDefault();
  if (draggedNoteId) {
    const note = notes.find(n => n.id === draggedNoteId);
    if (note) {
      const folder = folderId ? folders.find(f => f.id === folderId) : null;
      onUpdateNote({
        ...note,
        folder: folder ? folder.name : '',
        folderId: folderId || undefined
      });
    }
  }
  setDraggedNoteId(null);
  setDragOverFolderId(null);
};
```

## 实施步骤

1. **第一步**：添加状态和接口定义（不影响现有功能）
2. **第二步**：添加辅助函数（buildFolderTree, toggleFolder等）
3. **第三步**：添加渲染函数（renderFolderTree, renderNoteItem）
4. **第四步**：更新主渲染逻辑，只修改根目录视图
5. **第五步**：添加拖拽事件处理
6. **第六步**：更新文件夹菜单操作，添加文件夹树选择器
7. **第七步**：测试和调试

## 注意事项

- 保持 currentFolder !== null 时的原有逻辑不变
- 所有新功能只在 currentFolder === null 时生效
- 使用 `level * 16 + 12` 计算缩进，保持视觉层级
- 展开状态存储在 Set 中，便于快速查找
- 拖拽时显示视觉反馈（边框高亮）
- 文件夹树选择器递归显示所有层级

## 关键要点

1. **不破坏现有功能** - 文件夹内部视图完全保持原样
2. **渐进式增强** - 只在根目录添加树形结构
3. **视觉一致性** - 使用相同的样式和间距
4. **性能优化** - 使用 Set 管理展开状态，避免数组遍历
5. **用户体验** - 提供清晰的展开/收起反馈和拖拽提示
