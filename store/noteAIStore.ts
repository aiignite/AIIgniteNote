import { create } from 'zustand';
import { NoteType } from '../types';

// 编辑器历史记录项
interface HistoryItem {
  content: string;
  timestamp: number;
  source: 'user' | 'ai-import' | 'undo' | 'redo';
}

// 选中内容信息
interface SelectionInfo {
  text: string;
  // 对于思维导图，包含选中节点的JSON
  nodeData?: any;
  // 选区位置（文本编辑器用）
  start?: number;
  end?: number;
}

// AI导入内容
interface AIImportContent {
  content: string;
  // 导入模式
  mode: 'replace' | 'insert' | 'append';
  // 来源消息ID
  messageId?: string;
  // 处理后的内容（针对不同编辑器类型转换后）
  processedContent?: string;
}

// AI响应历史项
interface AIResponseHistoryItem {
  id: string;
  content: string;
  timestamp: number;
  // 响应预览（截断后）
  preview: string;
  // 对应的笔记ID
  noteId: string | null;
  // 是否已导入
  imported: boolean;
}

// 笔记AI交互状态
interface NoteAIState {
  // 当前笔记ID
  currentNoteId: string | null;
  // 当前笔记类型
  currentNoteType: NoteType | null;
  // 当前笔记内容
  currentContent: string;
  
  // 历史记录栈
  historyStack: HistoryItem[];
  // 当前历史位置
  historyIndex: number;
  // 最大历史记录数
  maxHistorySize: number;
  
  // 选中内容
  selection: SelectionInfo | null;
  
  // 待导入的AI内容
  pendingImport: AIImportContent | null;
  
  // AI响应历史
  aiResponseHistory: AIResponseHistoryItem[];
  // 最大响应历史数
  maxResponseHistorySize: number;
  // 是否显示响应历史面板
  showResponseHistory: boolean;
  
  // 编辑器实例引用（用于调用编辑器方法）
  editorRef: any;
  
  // Actions
  setCurrentNote: (noteId: string | null, noteType: NoteType | null, content: string) => void;
  setContent: (content: string, source?: 'user' | 'ai-import') => void;
  setSelection: (selection: SelectionInfo | null) => void;
  setEditorRef: (ref: any) => void;
  
  // 历史操作
  pushHistory: (content: string, source: 'user' | 'ai-import') => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // AI导入操作
  setPendingImport: (content: AIImportContent | null) => void;
  applyImport: () => string | null;
  
  // AI响应历史操作
  addResponseToHistory: (content: string) => void;
  removeFromHistory: (id: string) => void;
  clearResponseHistory: () => void;
  setShowResponseHistory: (show: boolean) => void;
  markAsImported: (id: string) => void;
  
  // 获取发送给AI的笔记内容（根据类型格式化）
  getContentForAI: () => { content: string; format: string; noteType: NoteType | null };
  getSelectionForAI: () => { content: string; format: string } | null;
}

export const useNoteAIStore = create<NoteAIState>((set, get) => ({
  currentNoteId: null,
  currentNoteType: null,
  currentContent: '',
  historyStack: [],
  historyIndex: -1,
  maxHistorySize: 50,
  selection: null,
  pendingImport: null,
  aiResponseHistory: [],
  maxResponseHistorySize: 10,
  showResponseHistory: false,
  editorRef: null,
  
  setCurrentNote: (noteId, noteType, content) => {
    const state = get();
    // 如果切换了笔记，清空历史
    if (noteId !== state.currentNoteId) {
      set({
        currentNoteId: noteId,
        currentNoteType: noteType,
        currentContent: content,
        historyStack: content ? [{ content, timestamp: Date.now(), source: 'user' }] : [],
        historyIndex: content ? 0 : -1,
        selection: null,
        pendingImport: null,
      });
    } else {
      set({ currentNoteType: noteType, currentContent: content });
    }
  },
  
  setContent: (content, source = 'user') => {
    const state = get();
    set({ currentContent: content });
    
    // 自动推入历史（防抖由外部处理）
    if (source === 'ai-import') {
      state.pushHistory(content, source);
    }
  },
  
  setSelection: (selection) => {
    console.log('[NoteAIStore] setSelection called:', selection);
    set({ selection });
  },
  
  setEditorRef: (ref) => set({ editorRef: ref }),
  
  pushHistory: (content, source) => {
    const state = get();
    const { historyStack, historyIndex, maxHistorySize } = state;
    
    // 如果当前不在历史末尾，删除后面的记录
    const newStack = historyStack.slice(0, historyIndex + 1);
    
    // 添加新记录
    newStack.push({
      content,
      timestamp: Date.now(),
      source,
    });
    
    // 限制历史大小
    if (newStack.length > maxHistorySize) {
      newStack.shift();
    }
    
    set({
      historyStack: newStack,
      historyIndex: newStack.length - 1,
    });
  },
  
  undo: () => {
    const state = get();
    const { historyStack, historyIndex } = state;
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const content = historyStack[newIndex].content;
      set({
        historyIndex: newIndex,
        currentContent: content,
      });
      return content;
    }
    return null;
  },
  
  redo: () => {
    const state = get();
    const { historyStack, historyIndex } = state;
    
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      const content = historyStack[newIndex].content;
      set({
        historyIndex: newIndex,
        currentContent: content,
      });
      return content;
    }
    return null;
  },
  
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },
  
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.historyStack.length - 1;
  },
  
  clearHistory: () => {
    const state = get();
    set({
      historyStack: state.currentContent 
        ? [{ content: state.currentContent, timestamp: Date.now(), source: 'user' }] 
        : [],
      historyIndex: state.currentContent ? 0 : -1,
    });
  },
  
  setPendingImport: (content) => set({ pendingImport: content }),
  
  applyImport: () => {
    const state = get();
    const { pendingImport, currentContent, currentNoteType } = state;
    
    if (!pendingImport) return null;
    
    let newContent = currentContent;
    const importContent = pendingImport.processedContent || pendingImport.content;
    
    switch (pendingImport.mode) {
      case 'replace':
        newContent = importContent;
        break;
      case 'insert':
        // 在选区位置插入（如果有选区）
        if (state.selection && state.selection.start !== undefined && state.selection.end !== undefined) {
          newContent = 
            currentContent.slice(0, state.selection.start) + 
            importContent + 
            currentContent.slice(state.selection.end);
        } else {
          // 追加到末尾
          newContent = currentContent + '\n\n' + importContent;
        }
        break;
      case 'append':
        newContent = currentContent + '\n\n' + importContent;
        break;
    }
    
    // 推入历史
    state.pushHistory(newContent, 'ai-import');
    
    set({
      currentContent: newContent,
      pendingImport: null,
      selection: null,
    });
    
    return newContent;
  },
  
  getContentForAI: () => {
    const state = get();
    const { currentContent, currentNoteType } = state;
    
    let format = 'text';
    let content = currentContent;
    
    switch (currentNoteType) {
      case 'Markdown':
        format = 'markdown';
        break;
      case 'Rich Text':
        format = 'html';
        // 可以选择性地清理HTML标签提取纯文本
        break;
      case 'Mind Map':
        format = 'json';
        // 确保是有效JSON
        try {
          JSON.parse(currentContent);
        } catch {
          content = JSON.stringify({ data: { text: '思维导图' }, children: [] });
        }
        break;
      case 'Drawio':
        format = 'xml';
        break;
    }
    
    return { content, format, noteType: currentNoteType };
  },
  
  getSelectionForAI: () => {
    const state = get();
    const { selection, currentNoteType } = state;
    
    if (!selection || !selection.text) return null;
    
    let format = 'text';
    
    switch (currentNoteType) {
      case 'Markdown':
        format = 'markdown';
        break;
      case 'Rich Text':
        format = 'html';
        break;
      case 'Mind Map':
        format = 'json';
        break;
      case 'Drawio':
        format = 'xml';
        break;
    }
    
    return { content: selection.text, format };
  },
  
  // AI响应历史操作
  addResponseToHistory: (content: string) => {
    const state = get();
    const { aiResponseHistory, maxResponseHistorySize, currentNoteId } = state;
    
    // 生成唯一ID
    const id = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 生成预览（最多100字符）
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    
    const newItem: AIResponseHistoryItem = {
      id,
      content,
      timestamp: Date.now(),
      preview,
      noteId: currentNoteId,
      imported: false,
    };
    
    // 添加到历史开头
    const newHistory = [newItem, ...aiResponseHistory];
    
    // 限制历史大小
    if (newHistory.length > maxResponseHistorySize) {
      newHistory.pop();
    }
    
    set({ aiResponseHistory: newHistory });
  },
  
  removeFromHistory: (id: string) => {
    const state = get();
    set({
      aiResponseHistory: state.aiResponseHistory.filter(item => item.id !== id),
    });
  },
  
  clearResponseHistory: () => {
    set({ aiResponseHistory: [] });
  },
  
  setShowResponseHistory: (show: boolean) => {
    set({ showResponseHistory: show });
  },
  
  markAsImported: (id: string) => {
    const state = get();
    set({
      aiResponseHistory: state.aiResponseHistory.map(item => 
        item.id === id ? { ...item, imported: true } : item
      ),
    });
  },
}));

// 辅助函数：将AI回复转换为适合编辑器的格式
export function convertAIResponseForEditor(
  response: string, 
  targetType: NoteType
): string {
  switch (targetType) {
    case 'Markdown':
      // AI回复通常就是Markdown格式，直接返回
      // 移除可能的代码块包装
      return response.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '');
      
    case 'Rich Text':
      // 将Markdown转换为简单HTML（或保持原样让Quill处理）
      // 基本转换：标题、列表、加粗、斜体
      let html = response
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\n/g, '<br>');
      return html;
      
    case 'Mind Map':
      // 尝试解析AI返回的JSON，或从文本生成思维导图结构
      try {
        // 检查是否是JSON数组格式（如节点建议）
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          // 将数组转换为子节点格式
          return JSON.stringify({
            data: { text: 'AI 建议' },
            children: parsed.map(item => ({
              data: { text: typeof item === 'string' ? item : JSON.stringify(item) },
              children: []
            }))
          });
        }
        // 如果是有效的思维导图JSON直接返回
        if (parsed.data) {
          return response;
        }
        throw new Error('Not a mind map format');
      } catch {
        // 从文本生成简单的思维导图结构
        // 支持从代码块中提取JSON
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const innerParsed = JSON.parse(jsonMatch[1]);
            if (Array.isArray(innerParsed)) {
              return JSON.stringify({
                data: { text: 'AI 建议' },
                children: innerParsed.map(item => ({
                  data: { text: typeof item === 'string' ? item : JSON.stringify(item) },
                  children: []
                }))
              });
            }
            return jsonMatch[1];
          } catch {}
        }
        
        // 从普通文本生成
        const lines = response.split('\n').filter(l => l.trim());
        // 识别层级（通过缩进或列表标记）
        const rootText = lines[0]?.replace(/^[-*•#\d.]+\s*/, '').trim() || 'AI 分析';
        const children = lines.slice(1).map(line => ({
          data: { text: line.replace(/^[-*•#\d.]+\s*/, '').trim() },
          children: []
        })).filter(c => c.data.text);
        
        return JSON.stringify({
          data: { text: rootText },
          children: children.slice(0, 10) // 限制子节点数量
        });
      }
      
    case 'Drawio':
      // 如果是有效XML直接返回，否则创建简单的图形
      if (response.includes('<mxGraphModel') || response.includes('<diagram')) {
        return response;
      }
      // 尝试从代码块中提取XML
      const xmlMatch = response.match(/```xml\s*([\s\S]*?)\s*```/);
      if (xmlMatch && (xmlMatch[1].includes('<mxGraphModel') || xmlMatch[1].includes('<diagram'))) {
        return xmlMatch[1];
      }
      // 返回提示信息，因为Draw.io需要特定格式
      console.warn('AI response is not valid Draw.io XML, cannot import directly');
      return '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
      
    default:
      return response;
  }
}
