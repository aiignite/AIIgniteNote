
import React, { useState, useEffect, useRef, Suspense, lazy, useCallback, Fragment } from 'react';
import { commands } from '@uiw/react-md-editor';
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import katex from 'katex';
import 'katex/dist/katex.css';
import mermaid from 'mermaid';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, darkMode = false }) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isClient, setIsClient] = useState(false);

  // Sync internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleChange = (val?: string) => {
    const newValue = val || '';
    if (newValue !== internalValue) {
      setInternalValue(newValue);
      onChange(newValue);
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
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; max-width: 900px; margin: 0 auto; color: #333; }
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
        />
      </div>
    </Suspense>
  );
};

export default MarkdownEditor;
