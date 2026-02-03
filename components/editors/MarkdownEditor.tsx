
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
  const editorRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { setSelection, pushHistory } = useNoteAIStore();

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getSelection: () => {
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
      setInternalValue(content);
      onChange(content);
      pushHistory(content, 'ai-import');
    },
    getContent: () => internalValue
  }), [internalValue, onChange, pushHistory]);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 监听选区变化
  useEffect(() => {
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
  }, [internalValue, setSelection, onSelectionChange]);

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

  const formulaCommand = {
    name: 'formula',
    keyCommand: 'formula',
    buttonProps: { 'aria-label': 'Insert formula', title: '插入公式' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 20h10" />
        <path d="M18 6H6l10 6-10 6h12" />
      </svg>
    ),
    children: [
      {
        name: 'inline-formula',
        label: '行内公式 ($...$)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || 'expression';
          api.replaceSelection(`$${selection}$`);
        }
      },
      {
        name: 'block-formula',
        label: '块级公式 ($$...$$)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || 'expression';
          api.replaceSelection(`\n$$\n${selection}\n$$\n`);
        }
      }
    ]
  };

  const mermaidCommand = {
    name: 'mermaid',
    keyCommand: 'mermaid',
    buttonProps: { 'aria-label': 'Insert diagram', title: '插入图表' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <path d="M10 6.5h4" />
        <path d="M6.5 10v4" />
      </svg>
    ),
    children: [
      {
        name: 'flowchart',
        label: '流程图 (Flowchart)',
        execute: (state: any, api: any) => {
          api.replaceSelection(`\n\`\`\`mermaid\ngraph TD\n    A[开始] --> B{判断}\n    B -- 是 --> C[确认]\n    B -- 否 --> D[结束]\n\`\`\`\n`);
        }
      },
      {
        name: 'sequence',
        label: '时序图 (Sequence)',
        execute: (state: any, api: any) => {
          api.replaceSelection(`\n\`\`\`mermaid\nsequenceDiagram\n    Alice->>John: Hello John, how are you?\n    John-->>Alice: Great!\n\`\`\`\n`);
        }
      },
      {
        name: 'gantt',
        label: '甘特图 (Gantt)',
        execute: (state: any, api: any) => {
          api.replaceSelection(`\n\`\`\`mermaid\ngantt\n    title 项目计划\n    section 任务\n    任务1 :a1, 2023-01-01, 30d\n    任务2 :after a1, 20d\n\`\`\`\n`);
        }
      },
      {
        name: 'mindmap',
        label: '思维导图 (Mindmap)',
        execute: (state: any, api: any) => {
          api.replaceSelection(`\n\`\`\`mermaid\nmindmap\n  root((中心))\n    分支1\n      子分支1.1\n    分支2\n      子分支2.1\n\`\`\`\n`);
        }
      }
    ]
  };

  const calloutCommand = {
    name: 'callout',
    keyCommand: 'callout',
    buttonProps: { 'aria-label': 'Insert callout', title: '插入提示' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    children: [
      {
        name: 'note',
        label: '备注 (Note)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || '内容';
          api.replaceSelection(`> [!NOTE]\n> ${selection}`);
        }
      },
      {
        name: 'tip',
        label: '提示 (Tip)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || '内容';
          api.replaceSelection(`> [!TIP]\n> ${selection}`);
        }
      },
      {
        name: 'important',
        label: '重要 (Important)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || '内容';
          api.replaceSelection(`> [!IMPORTANT]\n> ${selection}`);
        }
      },
      {
        name: 'warning',
        label: '警告 (Warning)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || '内容';
          api.replaceSelection(`> [!WARNING]\n> ${selection}`);
        }
      },
      {
        name: 'caution',
        label: '小心 (Caution)',
        execute: (state: any, api: any) => {
          const selection = state.selectedText || '内容';
          api.replaceSelection(`> [!CAUTION]\n> ${selection}`);
        }
      }
    ]
  };

  const highlightCommand = {
    name: 'highlight',
    keyCommand: 'highlight',
    buttonProps: { 'aria-label': 'Highlight text', title: '高亮' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 11-6 6v3h9l3-3" />
        <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
      </svg>
    ),
    execute: (state: any, api: any) => {
      const selection = state.selectedText || '文本';
      api.replaceSelection(`==${selection}==`);
    }
  };

  const tocCommand = {
    name: 'toc',
    keyCommand: 'toc',
    buttonProps: { 'aria-label': 'Table of Contents', title: '插入目录' },
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
      </svg>
    ),
    execute: (state: any, api: any) => {
      api.replaceSelection(`\n[TOC]\n`);
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
    calloutCommand,
    highlightCommand,
    tocCommand,
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
    commands.help,
  ].filter(Boolean) as any[];

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
        <MDEditorLazy
          value={internalValue}
          onChange={handleChange}
          height="calc(100vh - 120px)"
          preview="live"
          className="flex-1 border-none shadow-none bg-transparent"
          textareaProps={{
            placeholder: "Start writing your markdown note..."
          }}
          commands={allCommands}
          extraCommands={extraCommands}
          previewOptions={{
             remarkPlugins: [remarkMath, remarkGfm, [remarkToc, { heading: 'toc|目录', tight: true }], remarkEmoji],
             rehypePlugins: [rehypeKatex],
             components: {
               code: Code
             }
          }}
        />
      </div>
    </Suspense>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;

export type { MarkdownEditorRef };
