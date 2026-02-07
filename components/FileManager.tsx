import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { FileListItem } from '../types';

const sourceLabels: Record<string, string> = {
  all: '全部',
  note: '笔记',
  ai: 'AI 对话',
  chat: '聊天',
};

const formatFileSize = (size?: number | null) => {
  if (!size && size !== 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const buildFileUrl = (fileUrl?: string | null) => {
  if (!fileUrl) return undefined;
  if (fileUrl.startsWith('http')) return fileUrl;
  if (fileUrl.startsWith('/uploads/')) {
    const baseURL = api.getBaseURL();
    return baseURL ? `${baseURL}${fileUrl}` : fileUrl;
  }
  return fileUrl;
};

const FileManager: React.FC = () => {
  const [source, setSource] = useState<'all' | 'note' | 'ai' | 'chat'>('all');
  const [items, setItems] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async (reset: boolean, cursorValue?: string, keyword?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.getFiles({
        source,
        limit: 50,
        cursor: reset ? undefined : cursorValue,
        q: keyword?.trim() || undefined,
      }) as any;

      if (!response?.success) {
        throw new Error(response?.message || '加载文件失败');
      }

      const data = response.data || {};
      const newItems = Array.isArray(data.items) ? data.items : [];

      setItems(prev => reset ? newItems : [...prev, ...newItems]);
      setHasMore(Boolean(data.hasMore));
      setCursor(data.nextCursor || undefined);
      if (reset) {
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      setError(err?.message || '加载文件失败');
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setItems([]);
      setCursor(undefined);
      loadFiles(true, undefined, search);
    }, 300);

    return () => clearTimeout(handle);
  }, [source, search, loadFiles]);

  const handleDelete = useCallback(async (item: FileListItem) => {
    if (!confirm(`确定删除文件 “${item.fileName}” 吗？`)) return;
    try {
      const response = await api.deleteFile(item.id, item.source) as any;
      if (!response?.success) {
        throw new Error(response?.message || '删除失败');
      }
      setItems(prev => prev.filter(file => file.id !== item.id));
    } catch (err: any) {
      alert(err?.message || '删除失败');
    }
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (items.length === 0) return prev;
      const next = new Set<string>();
      if (prev.size !== items.length) {
        items.forEach(item => next.add(`${item.source}:${item.id}`));
      }
      return next;
    });
  }, [items]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除已选中的 ${selectedIds.size} 个文件吗？`)) return;

    const selectedItems = items.filter(item => selectedIds.has(`${item.source}:${item.id}`));
    const deleteTasks = selectedItems.map(item => api.deleteFile(item.id, item.source));

    try {
      await Promise.all(deleteTasks);
      setItems(prev => prev.filter(item => !selectedIds.has(`${item.source}:${item.id}`)));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err?.message || '批量删除失败');
    }
  }, [items, selectedIds]);

  const emptyText = useMemo(() => {
    if (loading) return '加载中...';
    if (error) return error;
    return '暂无文件';
  }, [loading, error]);

  return (
    <div className="flex-1 w-full h-full bg-gray-50 dark:bg-[#15232a]">
      <div className="h-full flex flex-col">
        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-[#1c2b33]/90 backdrop-blur sticky top-0 z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">文件管理</div>
              <div className="text-sm text-gray-500">统一查看上传、对话与插入的文件</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'note', 'ai', 'chat'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    source === key
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-[#1c2b33] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {sourceLabels[key]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索文件名或内容"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-[#1c2b33]"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">已选 {selectedIds.size}</span>
              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0}
                className="px-3 py-2 text-xs rounded-md border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                删除所选
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="min-w-full bg-white dark:bg-[#1c2b33] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-13 gap-4 px-6 py-3 text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                />
              </div>
              <div className="col-span-4">文件名</div>
              <div className="col-span-2">来源</div>
              <div className="col-span-3">关联</div>
              <div className="col-span-2">大小</div>
              <div className="col-span-1 text-right">操作</div>
            </div>

            {items.length === 0 ? (
              <div className="px-6 py-12 text-sm text-gray-400">{emptyText}</div>
            ) : (
              items.map(item => {
                const fileHref = buildFileUrl(item.fileUrl);
                const related = item.noteTitle || item.roomName || '-';
                return (
                  <div key={`${item.source}-${item.id}`} className="grid grid-cols-13 gap-4 px-6 py-3 border-b border-gray-100 dark:border-gray-700 text-sm hover:bg-gray-50/70 dark:hover:bg-gray-800 transition-colors">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(`${item.source}:${item.id}`)}
                        onChange={() => toggleSelect(`${item.source}:${item.id}`)}
                      />
                    </div>
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.fileName}</div>
                      <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300">{sourceLabels[item.source]}</div>
                    <div className="col-span-3 text-gray-600 dark:text-gray-300 truncate">{related}</div>
                    <div className="col-span-2 text-gray-600 dark:text-gray-300">{formatFileSize(item.fileSize)}</div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      {fileHref && (
                        <a
                          href={fileHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          下载
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c2b33] flex justify-center">
            <button
              onClick={() => loadFiles(false, cursor, search)}
              disabled={loading}
              className="text-xs text-primary bg-white dark:bg-[#1c2b33] border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 disabled:opacity-50"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
