/**
 * MarkdownRenderer - Markdown 渲染组件
 * 支持代码高亮、表格、链接等
 */

import React, { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  codeTheme?: 'github' | 'monokai' | 'dracula' | 'nord';
  onCopyCode?: (code: string) => void;
}

// 代码主题颜色
const codeThemes = {
  github: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-800 dark:text-gray-200',
    border: 'border-gray-200 dark:border-gray-700',
  },
  monokai: {
    bg: 'bg-[#272822]',
    text: 'text-[#f8f8f2]',
    border: 'border-[#49483e]',
  },
  dracula: {
    bg: 'bg-[#282a36]',
    text: 'text-[#f8f8f2]',
    border: 'border-[#44475a]',
  },
  nord: {
    bg: 'bg-[#2e3440]',
    text: 'text-[#eceff4]',
    border: 'border-[#3b4252]',
  },
};

/**
 * 简易 Markdown 解析器
 * 支持: 代码块、行内代码、粗体、斜体、链接、列表、标题
 */
const parseMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType === 'ul' ? 'ul' : 'ol';
      elements.push(
        <ListTag 
          key={`list-${elements.length}`} 
          className={listType === 'ul' ? 'list-disc pl-4 my-2' : 'list-decimal pl-4 my-2'}
        >
          {listItems.map((item, i) => (
            <li key={i} className="my-1">{parseInline(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  const parseInline = (text: string): React.ReactNode => {
    // 处理行内元素
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // 行内代码
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // 粗体
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // 斜体
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // 链接
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a 
            key={key++} 
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // 普通文本
      const textMatch = remaining.match(/^[^`*\[]+/);
      if (textMatch) {
        parts.push(textMatch[0]);
        remaining = remaining.slice(textMatch[0].length);
        continue;
      }

      // 无法匹配，添加单个字符
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块开始/结束
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        elements.push(
          <CodeBlock 
            key={`code-${elements.length}`}
            code={codeBlockContent.join('\n')}
            language={codeBlockLang}
          />
        );
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = [];
      }
      continue;
    }

    // 在代码块内
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
      const headingClass = `${sizes[level - 1]} font-bold mt-4 mb-2`;
      const content = parseInline(headingMatch[2]);
      
      switch (level) {
        case 1:
          elements.push(<h1 key={`heading-${elements.length}`} className={headingClass}>{content}</h1>);
          break;
        case 2:
          elements.push(<h2 key={`heading-${elements.length}`} className={headingClass}>{content}</h2>);
          break;
        case 3:
          elements.push(<h3 key={`heading-${elements.length}`} className={headingClass}>{content}</h3>);
          break;
        case 4:
          elements.push(<h4 key={`heading-${elements.length}`} className={headingClass}>{content}</h4>);
          break;
        case 5:
          elements.push(<h5 key={`heading-${elements.length}`} className={headingClass}>{content}</h5>);
          break;
        case 6:
          elements.push(<h6 key={`heading-${elements.length}`} className={headingClass}>{content}</h6>);
          break;
      }
      continue;
    }

    // 无序列表
    if (line.match(/^[-*]\s+/)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    // 有序列表
    if (line.match(/^\d+\.\s+/)) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    // 分隔线
    if (line.match(/^---+$/)) {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-gray-200 dark:border-gray-700" />);
      continue;
    }

    // 引用
    if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote 
          key={`quote-${elements.length}`}
          className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-600 dark:text-gray-400"
        >
          {parseInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      flushList();
      continue;
    }

    // 普通段落
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="my-2">
        {parseInline(line)}
      </p>
    );
  }

  // 处理未闭合的代码块
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <CodeBlock 
        key={`code-${elements.length}`}
        code={codeBlockContent.join('\n')}
        language={codeBlockLang}
      />
    );
  }

  flushList();

  return elements;
};

/**
 * 代码块组件
 */
interface CodeBlockProps {
  code: string;
  language?: string;
  theme?: keyof typeof codeThemes;
  onCopy?: (code: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code, 
  language = '', 
  theme = 'github',
  onCopy 
}) => {
  const [copied, setCopied] = React.useState(false);
  const themeStyles = codeThemes[theme];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  return (
    <div className={`rounded-lg overflow-hidden my-3 border ${themeStyles.border}`}>
      {/* 头部 */}
      <div className={`flex items-center justify-between px-3 py-2 ${themeStyles.bg} border-b ${themeStyles.border}`}>
        <span className={`text-xs font-medium ${themeStyles.text} opacity-70`}>
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-black/10 transition-colors ${themeStyles.text}`}
        >
          <span className="material-symbols-outlined text-sm">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className={`p-3 overflow-x-auto ${themeStyles.bg}`}>
        <code className={`text-sm font-mono ${themeStyles.text}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

/**
 * Markdown 渲染器主组件
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  codeTheme = 'github',
  onCopyCode,
}) => {
  const rendered = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  return (
    <div className={`markdown-content ${className}`}>
      {rendered}
    </div>
  );
};

export default MarkdownRenderer;
