
import React, { useState, useEffect, useRef, Suspense, lazy, useCallback, Fragment, forwardRef, useImperativeHandle } from 'react';
import { commands } from '@uiw/react-md-editor';
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import katex from 'katex';
import 'katex/dist/katex.css';
import mermaid from 'mermaid';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkEmoji from 'remark-emoji';
import remarkFootnotes from 'remark-footnotes';
import rehypeKatex from 'rehype-katex';
import { useNoteAIStore } from '../../store/noteAIStore';

// Initialize mermaid
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
}

// 使用React lazy进行动态导入，让Vite正确处理打包
const MDEditorLazy = lazy(() =>
  import('@uiw/react-md-editor').then(m => ({ default: m.default || m }))
);

const randomid = () => parseInt(String(Math.random() * 1e15), 10).toString(36);

const Code = ({ node, inline, children = [], className, ...props }: any) => {
  const demoid = useRef(`mermaid-${randomid()}`);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const isMermaid = className && /^language-mermaid/.test(className.toLocaleLowerCase());
  const isKatex = className && /^language-katex/.test(className.toLocaleLowerCase());
  
  const code = children && Array.isArray(children) ? children[0] : children;

  useEffect(() => {
    if (container && isMermaid && demoid.current && code) {
      try {
        container.innerHTML = '';
        mermaid.render(demoid.current, code as string).then(({ svg }) => {
          if (container) container.innerHTML = svg;
        }).catch(err => {
          console.error('Mermaid render error:', err);
        });
      } catch (error) {
        console.error("error:", error);
      }
    }
  }, [container, isMermaid, code]);

  const refElement = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setContainer(node);
    }
  }, []);

  if (isMermaid) {
    return (
      <Fragment>
        <div ref={refElement} className="mermaid-container flex justify-center my-4 overflow-auto" />
      </Fragment>
    );
  }

  if (isKatex) {
    const html = katex.renderToString(code as string, {
      throwOnError: false,
      displayMode: true
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} className="katex-display my-4 overflow-auto" />;
  }

  // Inline math support: check for $$...$$ or $...$ in children
  if (inline && typeof code === 'string') {
    if (code.startsWith('$$') && code.endsWith('$$')) {
      const html = katex.renderToString(code.slice(2, -2), {
        throwOnError: false,
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
    if (code.startsWith('$') && code.endsWith('$')) {
      const html = katex.renderToString(code.slice(1, -1), {
        throwOnError: false,
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    }
  }

  return <code className={className} {...props}>{children}</code>;
};

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
  onSelectionChange?: (selection: { text: string; start: number; end: number } | null) => void;
}

// 导出编辑器方法接口
export interface MarkdownEditorRef {
  getSelection: () => { text: string; start: number; end: number } | null;
  insertContent: (content: string, position?: 'cursor' | 'end' | 'replace') => void;
  replaceContent: (content: string) => void;
  getContent: () => string;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>((props, ref) => {
  const { value, onChange, darkMode = false, onSelectionChange } = props;
  const [internalValue, setInternalValue] = useState(value);
  const [isClient, setIsClient] = useState(false);
  const editorMode = 'cherry' as const;
  const editorRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cherryRef = useRef<any>(null);
  const cherryContainerId = useRef(`cherry-editor-${randomid()}`);
  const lastValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const { setSelection, pushHistory } = useNoteAIStore();

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getSelection: () => {
      if (editorMode === 'cherry') return null;
      const textarea = textareaRef.current;
      if (!textarea) return null;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return null;
      
      return {
        text: internalValue.slice(start, end),
        start,
        end
      };
    },
    insertContent: (content: string, position: 'cursor' | 'end' | 'replace' = 'cursor') => {
      if (editorMode === 'cherry' && cherryRef.current) {
        if (position === 'replace') {
          cherryRef.current.setValue(content, false);
        } else if (position === 'end') {
          const current = cherryRef.current.getValue();
          cherryRef.current.setValue(`${current}\n\n${content}`, false);
        } else {
          cherryRef.current.insert(content);
        }
        return;
      }
      const textarea = textareaRef.current;
      let newValue = internalValue;
      
      if (position === 'end') {
        newValue = internalValue + '\n\n' + content;
      } else if (position === 'replace' && textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        newValue = internalValue.slice(0, start) + content + internalValue.slice(end);
      } else if (position === 'cursor' && textarea) {
        const pos = textarea.selectionStart;
        newValue = internalValue.slice(0, pos) + content + internalValue.slice(pos);
      }
      
      setInternalValue(newValue);
      onChange(newValue);
      pushHistory(newValue, 'ai-import');
    },
    replaceContent: (content: string) => {
      if (editorMode === 'cherry' && cherryRef.current) {
        cherryRef.current.setValue(content, false);
        return;
      }
      setInternalValue(content);
      onChange(content);
      pushHistory(content, 'ai-import');
    },
    getContent: () => internalValue
  }), [editorMode, internalValue, onChange, pushHistory]);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
    if (editorMode === 'cherry' && cherryRef.current && value !== lastValueRef.current) {
      cherryRef.current.setValue(value, true);
    }
    lastValueRef.current = value;
  }, [value, editorMode]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isClient || editorMode !== 'cherry') return;
    let cancelled = false;

    const initCherry = async () => {
      const { default: Cherry } = await import('cherry-markdown');
      const { default: echarts } = await import('echarts');
      await import('cherry-markdown/dist/cherry-markdown.css');

      if (cancelled) return;

      const instance = new Cherry({
        id: cherryContainerId.current,
        value: internalValue,
        externals: {
          echarts
        },
        toolbars: {
          theme: darkMode ? 'dark' : 'light',
          toolbar: [
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'header', 'list', 'ol', 'ul', 'checklist', '|',
            'link', 'image', 'graph', 'table', 'proTable', 'quickTable', '|',
            'formula', 'toc', 'export', 'pdf', 'word', '|',
            'code', 'inlineCode', 'codeTheme', '|',
            'undo', 'redo', 'fullScreen', 'togglePreview'
          ],
          bubble: ['bold', 'italic', 'underline', 'strikethrough', 'sub', 'sup', '|', 'size', 'color'],
          float: ['h1', 'h2', 'h3', '|', 'checklist', 'quote', 'quickTable', 'code'],
          toc: {
            position: 'fixed',
            defaultModel: 'full',
            updateLocationHash: true
          }
        },
        editor: {
          height: 'calc(100vh - 120px)'
        },
        engine: {
          syntax: {
            table: {
              enableChart: true
            }
          }
        },
        callback: {
          afterChange: (text: string) => {
            setInternalValue(text);
            lastValueRef.current = text;
            onChangeRef.current(text);
          }
        }
      });

      cherryRef.current = instance;
    };

    initCherry();

    return () => {
      cancelled = true;
      if (cherryRef.current?.destroy) {
        cherryRef.current.destroy();
      }
      const container = document.getElementById(cherryContainerId.current);
      if (container) container.innerHTML = '';
      cherryRef.current = null;
    };
  }, [darkMode, editorMode, isClient]);

  // 监听选区变化
  useEffect(() => {
    if (editorMode !== 'uiw') return;
    const handleSelectionChange = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        const selectionInfo = {
          text: internalValue.slice(start, end),
          start,
          end
        };
        setSelection(selectionInfo);
        onSelectionChange?.(selectionInfo);
      } else {
        setSelection(null);
        onSelectionChange?.(null);
      }
    };

    // 获取textarea引用
    const findTextarea = () => {
      const container = document.querySelector('.w-md-editor-text-input');
      if (container instanceof HTMLTextAreaElement) {
        textareaRef.current = container;
        container.addEventListener('select', handleSelectionChange);
        container.addEventListener('mouseup', handleSelectionChange);
        container.addEventListener('keyup', handleSelectionChange);
      }
    };

    // 延迟查找，等待编辑器加载
    const timer = setTimeout(findTextarea, 500);

    return () => {
      clearTimeout(timer);
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.removeEventListener('select', handleSelectionChange);
        textarea.removeEventListener('mouseup', handleSelectionChange);
        textarea.removeEventListener('keyup', handleSelectionChange);
      }
    };
  }, [editorMode, internalValue, setSelection, onSelectionChange]);

  const handleChange = (val?: string) => {
    const newValue = val || '';
    if (newValue !== internalValue) {
      setInternalValue(newValue);
      onChange(newValue);
      // 用户编辑时推入历史（由外部处理防抖）
    }
  };

  // Custom help command
  const exportHtmlCommand = {
    name: 'export-html',
    keyCommand: 'export-html',
    buttonProps: { 'aria-label': 'Export to HTML', title: '导出为 HTML' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
    ),
    execute: () => {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Exported Note</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; max-width: 900px; margin: 0 auto; color: #333; }
            img { max-width: 100%; border-radius: 8px; }
            pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; border: 1px solid #ddd; }
            code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 85%; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
            blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; margin: 0; }
          </style>
        </head>
        <body class="markdown-body">
          ${document.querySelector('.w-md-editor-preview')?.innerHTML || 'No content found'}
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formulaCommand = {
    name: 'formula',
    keyCommand: 'formula',
    buttonProps: { 'aria-label': 'Insert Formula', title: '插入公式' },
    icon: (
      <svg viewBox="0 0 16 16" width="12px" height="12px">
        <path d="M2 2h12v2H9l3 4-3 4h5v2H2v-2h5l3-4-3-4H2V2z" fill="currentColor" />
      </svg>
    ),
    execute: (state: any, api: any) => {
      const placeholder = 'E=mc^2';
      const text = `$$\n${placeholder}\n$$`;
      const start = state.selection.start;
      api.replaceSelection(text);
      api.setSelectionRange({
        start: start + 3,
        end: start + 3 + placeholder.length
      });
    }
  };

  const mermaidCommand = {
    name: 'mermaid',
    keyCommand: 'mermaid',
    buttonProps: { 'aria-label': 'Insert Mermaid', title: '插入 Mermaid 图' },
    icon: (
      <svg viewBox="0 0 16 16" width="12px" height="12px">
        <path d="M2 3h12v2H2V3zm0 4h8v2H2V7zm0 4h12v2H2v-2zm10-2 4-2-4-2v4z" fill="currentColor" />
      </svg>
    ),
    execute: (state: any, api: any) => {
      const placeholder = 'flowchart TD\n  A[Start] --> B[End]';
      const text = `\n\n\`\`\`mermaid\n${placeholder}\n\`\`\`\n\n`;
      const start = state.selection.start;
      api.replaceSelection(text);
      api.setSelectionRange({
        start: start + 10,
        end: start + 10 + placeholder.length
      });
    }
  };

  const emojiCommand = {
    name: 'emoji',
    keyCommand: 'emoji',
    buttonProps: { 'aria-label': 'Insert Emoji', title: '插入 Emoji' },
    icon: (
      <svg viewBox="0 0 16 16" width="12px" height="12px">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 12.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11Zm-2-6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-5 1.5a4 4 0 0 0 6 0H5z" fill="currentColor" />
      </svg>
    ),
    execute: (_state: any, api: any) => {
      api.replaceSelection('😊');
    }
  };

  const helpCommand = {
    name: 'help',
    keyCommand: 'help',
    buttonProps: { 'aria-label': 'Markdown Help' },
    icon: (
      <svg viewBox="0 0 16 16" width="12px" height="12px">
        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8Zm.9 13H7v-1.8h1.9V13Zm-.1-3.6v.5H7.1v-.6c.2-2.1 2-1.9 1.9-3.2.1-.7-.3-1.1-1-1.1-.8 0-1.2.7-1.2 1.6H5c0-1.7 1.2-3 2.9-3 2.3 0 3 1.4 3 2.3.1 2.3-1.9 2-2.1 3.5Z" fill="currentColor" />
      </svg>
    ),
    execute: () => {
      window.open('https://www.markdownguide.org/basic-syntax/', '_blank');
    }
  };

  const allCommands = [
    commands.title,
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.divider,
    commands.link,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.image,
    commands.divider,
    formulaCommand,
    mermaidCommand,
    emojiCommand,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
    commands.divider,
    commands.table,
    commands.comment,
    commands.divider,
    commands.fullscreen,
    exportHtmlCommand,
    helpCommand
  ].filter(Boolean) as any[];

  const extraCommands = [
    commands.codeEdit,
    commands.codePreview,
    commands.codeLive,
    commands.fullscreen,
  ].filter(Boolean) as any[];

  // 统计字数
  const stats = {
    lines: internalValue.split('\n').length,
    words: internalValue.trim() ? internalValue.trim().split(/\s+/).length : 0,
    chars: internalValue.length
  };

  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center bg-transparent">
          <div className="flex flex-col items-center gap-3">
             <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
             <span className="text-xs text-gray-500">Loading Markdown Editor...</span>
          </div>
        </div>
      }
    >
      <style>{`
        .w-md-editor-fullscreen {
          z-index: 9999;
          background: ${darkMode ? '#0f172a' : '#ffffff'};
        }
        .w-md-editor-fullscreen .w-md-editor,
        .w-md-editor-fullscreen .w-md-editor-text,
        .w-md-editor-fullscreen .w-md-editor-preview {
          background: ${darkMode ? '#0f172a' : '#ffffff'};
        }
        /* Markdown Preview Enhancements */
        .markdown-body mark {
          background-color: #fef08a;
          color: #000;
          padding: 0 2px;
          border-radius: 2px;
        }
        /* Callout Styles (GitHub Style) */
        .markdown-body blockquote {
          border-left: 4px solid #dfe2e5;
          color: ${darkMode ? '#94a3b8' : '#6a737d'};
          padding: 0 1em;
          margin-bottom: 16px;
        }
        .markdown-body blockquote p:first-child strong:first-child {
          display: block;
          margin-bottom: 4px;
        }
        /* Basic support for ==highlight== if rendered as mark */
        /* If not rendered as mark, we might need a rehype plugin */
      `}</style>
      <div className="h-full w-full flex flex-col" data-color-mode={darkMode ? 'dark' : 'light'}>
        <div className="flex-1 overflow-hidden">
          <div id={cherryContainerId.current} className="h-full w-full" />
        </div>
        <div className={`flex justify-between items-center px-4 py-1 text-[10px] border-t ${darkMode ? 'bg-[#0f172a] border-gray-800 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
          <div className="flex gap-4">
            <span>行数: {stats.lines}</span>
            <span>单词: {stats.words}</span>
            <span>字符: {stats.chars}</span>
          </div>
          <div className="flex gap-4">
            <span>Markdown 模式</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </Suspense>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;

export type { MarkdownEditorRef };
