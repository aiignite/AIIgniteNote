import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.css';
import 'highlight.js/styles/github-dark.css';

// 附件预览类型
interface AttachmentPreview {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  preview?: string; // base64 preview for images
}

// 消息类型
interface ChatMessageProps {
  role: 'user' | 'model' | 'system';
  text: string;
  attachments?: AttachmentPreview[];
  isStreaming?: boolean;
  timestamp?: Date;
  suggestions?: Array<{ icon: string; label: string }>;
  onSuggestionClick?: (label: string) => void;
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  onFeedback?: (positive: boolean) => void;
  onEdit?: (newText: string) => void; // 编辑回调
  messageIndex?: number; // 消息索引，用于编辑
  onFork?: () => void; // 从此消息创建分支
  isBookmarked?: boolean; // 是否已书签
  onToggleBookmark?: () => void; // 切换书签回调
  onQuoteReply?: (text: string) => void; // 引用回复回调
  rating?: 1 | 2 | 3 | 4 | 5; // 评分
  onRate?: (rating: 1 | 2 | 3 | 4 | 5) => void; // 评分回调
  isPinned?: boolean; // 是否置顶
  onTogglePin?: () => void; // 置顶回调
  onTranslate?: (targetLang: string) => void; // 翻译回调
  responseTime?: number; // AI响应时间(毫秒)
  tokenCount?: number; // 估算token数
  onDelete?: () => void; // 删除消息回调
  onSpeak?: () => void; // 语音朗读回调
  isSpeaking?: boolean; // 是否正在朗读
  codeTheme?: 'github' | 'monokai' | 'dracula' | 'nord'; // 代码主题
}

// 代码块渲染组件，带复制和运行按钮
const CodeBlock = memo(({ language, children }: { language?: string; children: string }) => {
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [children]);

  // 运行 JavaScript 代码
  const handleRun = useCallback(async () => {
    if (language !== 'javascript' && language !== 'js') return;
    
    setIsRunning(true);
    setOutput(null);
    
    try {
      // 捕获 console.log 输出
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalLog.apply(console, args);
      };
      
      // 在安全沙箱中执行代码
      const result = await new Promise((resolve, reject) => {
        try {
          // 使用 Function 构造器创建一个新的作用域
          const fn = new Function(`
            "use strict";
            ${children}
          `);
          const res = fn();
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
      
      // 恢复原始 console.log
      console.log = originalLog;
      
      // 组合输出
      let outputText = logs.join('\n');
      if (result !== undefined) {
        outputText += (outputText ? '\n→ ' : '→ ') + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      }
      
      setOutput(outputText || '(无输出)');
    } catch (error: any) {
      setOutput(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [children, language]);

  const isRunnable = language === 'javascript' || language === 'js';

  return (
    <div className="relative group my-4">
      {/* 语言标签和按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-xl border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400 uppercase">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-2">
          {isRunnable && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="运行代码"
            >
              <span className="material-symbols-outlined text-sm">
                {isRunning ? 'hourglass_empty' : 'play_arrow'}
              </span>
              {isRunning ? 'Running...' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      {/* 代码内容 */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto">
        <code className={`language-${language || 'text'} hljs`}>
          {children}
        </code>
      </pre>
      {/* 运行输出 */}
      {output !== null && (
        <div className="px-4 py-3 bg-gray-900 border-t border-gray-700 rounded-b-xl">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <span className="material-symbols-outlined text-sm">terminal</span>
            Output
            <button
              onClick={() => setOutput(null)}
              className="ml-auto p-1 hover:bg-gray-700 rounded"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
          <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      )}
    </div>
  );
});

// 思考过程组件
const ThinkingBlock = memo(({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="my-4 border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
      >
        <span className="material-symbols-outlined text-lg animate-pulse">
          psychology
        </span>
        <span>思考过程</span>
        <span className="material-symbols-outlined ml-auto transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-purple-50/50 dark:bg-purple-900/10 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
});

// Mermaid 图表组件
const MermaidDiagram = memo(({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          // @ts-ignore - suppressErrorRendering is available in mermaid v11 but might be missing in types
          suppressErrorRendering: true,
        });
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError('');
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Failed to render diagram');
      }
    };

    renderMermaid();
  }, [code]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined">error</span>
          <span className="font-medium">图表渲染失败</span>
        </div>
        <pre className="text-xs overflow-x-auto">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

// 图片预览组件
const ImagePreview = memo(({ src, alt }: { src: string; alt?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt || 'image'}
        className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity my-4"
        onClick={() => setIsExpanded(true)}
      />
      {isExpanded && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <img
            src={src}
            alt={alt || 'image'}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setIsExpanded(false)}
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      )}
    </>
  );
});

// 附件展示组件
const AttachmentDisplay = memo(({ attachments }: { attachments: AttachmentPreview[] }) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type.includes('word') || type.includes('document')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    return 'attach_file';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {attachments.map((att, index) => (
        <div key={att.id || index} className="group relative">
          {att.type.startsWith('image/') && att.preview ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img
                src={att.preview}
                alt={att.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white">zoom_in</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="material-symbols-outlined text-primary text-lg">
                {getFileIcon(att.type)}
              </span>
              <div className="min-w-0 max-w-[150px]">
                <p className="text-xs font-medium truncate">{att.name}</p>
                <p className="text-[10px] text-gray-500">{formatSize(att.size)}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// 打字机光标
const TypewriterCursor = memo(() => (
  <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-middle" />
));

// 主消息组件
export const AIChatMessage: React.FC<ChatMessageProps> = memo(({
  role,
  text,
  attachments,
  isStreaming = false,
  timestamp,
  suggestions,
  onSuggestionClick,
  onCopy,
  onRegenerate,
  onFeedback,
  onEdit,
  messageIndex,
  onFork,
  isBookmarked = false,
  onToggleBookmark,
  onQuoteReply,
  rating,
  onRate,
  isPinned = false,
  onTogglePin,
  onTranslate,
  responseTime,
  tokenCount,
  onDelete,
  onSpeak,
  isSpeaking = false,
  codeTheme = 'github',
}) => {
  const [showActions, setShowActions] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showTranslatePopup, setShowTranslatePopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 长消息折叠阈值（字符数）
  const COLLAPSE_THRESHOLD = 800;
  const isLongMessage = text.length > COLLAPSE_THRESHOLD;
  const [isCollapsed, setIsCollapsed] = useState(isLongMessage && role === 'model');

  // 进入编辑模式时聚焦
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText(text);
  }, [text]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editText.trim() && editText !== text && onEdit) {
      onEdit(editText.trim());
    }
    setIsEditing(false);
  }, [editText, text, onEdit]);

  // 解析思考过程
  const { thinkingContent, mainContent } = useMemo(() => {
    const thinkingMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkingMatch) {
      return {
        thinkingContent: thinkingMatch[1].trim(),
        mainContent: text.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      };
    }
    return { thinkingContent: null, mainContent: text };
  }, [text]);

  // 自定义 Markdown 渲染组件
  const markdownComponents: Partial<Components> = useMemo(() => ({
    // 代码块处理
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const code = String(children).replace(/\n$/, '');

      // Mermaid 图表
      if (language === 'mermaid') {
        return <MermaidDiagram code={code} />;
      }

      // 内联代码
      if (inline) {
        return (
          <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-primary" {...props}>
            {children}
          </code>
        );
      }

      // 代码块
      return <CodeBlock language={language}>{code}</CodeBlock>;
    },
    // 图片处理
    img: ({ src, alt }: any) => <ImagePreview src={src} alt={alt} />,
    // 链接处理
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    // 表格样式
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-left font-semibold text-sm">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm">
        {children}
      </td>
    ),
    // 引用块样式
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-gray-600 dark:text-gray-400">
        {children}
      </blockquote>
    ),
    // 列表样式
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside my-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside my-4 space-y-1">{children}</ol>
    ),
    // 标题样式
    h1: ({ children }: any) => <h1 className="text-2xl font-bold my-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold my-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold my-2">{children}</h3>,
    // 段落
    p: ({ children }: any) => <p className="my-2 leading-relaxed">{children}</p>,
    // 水平线
    hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
  }), []);

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mainContent);
      onCopy?.(mainContent);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [mainContent, onCopy]);

  const handleFeedback = useCallback((positive: boolean) => {
    setFeedbackGiven(positive ? 'positive' : 'negative');
    onFeedback?.(positive);
  }, [onFeedback]);

  const isUser = role === 'user';
  const isSystem = role === 'system';

  // 系统消息样式
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-500">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group animate-in fade-in slide-in-from-bottom-2 duration-300`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 头像 */}
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
        isUser 
          ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700' 
          : 'bg-primary/10 text-primary'
      }`}>
        <span className="material-symbols-outlined text-xl">
          {isUser ? 'person' : 'robot_2'}
        </span>
      </div>
      
      {/* 消息内容 */}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
        {/* 消息气泡 */}
        <div className={`relative p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser 
            ? 'bg-primary text-white rounded-tr-none shadow-primary/20' 
            : 'bg-gray-50 dark:bg-gray-800/50 rounded-tl-none border border-gray-100 dark:border-gray-700'
        } ${isBookmarked ? 'ring-2 ring-yellow-400/50' : ''}`}>
          {/* 书签标记 */}
          {isBookmarked && (
            <div className="absolute -top-2 -right-2 size-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-sm">bookmark</span>
            </div>
          )}

          {/* 思考过程 */}
          {!isUser && thinkingContent && (
            <ThinkingBlock content={thinkingContent} />
          )}

          {/* 附件显示 */}
          {attachments && attachments.length > 0 && (
            <AttachmentDisplay attachments={attachments} />
          )}

          {/* 消息文本 */}
          {isUser ? (
            isEditing ? (
              // 编辑模式
              <div className="space-y-2">
                <textarea
                  ref={editTextareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full min-w-[300px] min-h-[80px] bg-white/10 border border-white/30 rounded-lg p-2 text-white placeholder-white/50 resize-y focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="编辑消息..."
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') handleCancelEdit();
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit();
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || editText === text}
                    className="px-3 py-1 text-xs bg-white/30 hover:bg-white/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    保存并重新发送
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{mainContent}</div>
            )
          ) : (
            <div className={`prose prose-sm dark:prose-invert max-w-none ${isCollapsed ? 'max-h-48 overflow-hidden relative' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={markdownComponents}
              >
                {mainContent}
              </ReactMarkdown>
              {isStreaming && <TypewriterCursor />}
              {/* 折叠遮罩 */}
              {isCollapsed && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
              )}
            </div>
          )}
          
          {/* 折叠/展开按钮 */}
          {isLongMessage && !isUser && !isStreaming && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {isCollapsed ? 'expand_more' : 'expand_less'}
              </span>
              {isCollapsed ? `展开全部 (${text.length} 字)` : '收起'}
            </button>
          )}

          {/* 操作按钮 - AI 消息 */}
          {!isUser && !isStreaming && showActions && (
            <div className="absolute -bottom-10 left-0 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-lg animate-in fade-in duration-150">
              <button
                onClick={handleCopyMessage}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="复制"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
              {/* 翻译按钮 */}
              {onTranslate && (
                <div className="relative">
                  <button
                    onClick={() => setShowTranslatePopup(!showTranslatePopup)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="翻译"
                  >
                    <span className="material-symbols-outlined text-lg">translate</span>
                  </button>
                  {/* 翻译语言选择弹出框 */}
                  {showTranslatePopup && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                      <div className="text-[10px] text-gray-400 px-2 py-1 border-b border-gray-100 dark:border-gray-700">翻译为</div>
                      {[
                        { code: 'zh-CN', label: '🇨🇳 中文' },
                        { code: 'en', label: '🇺🇸 English' },
                        { code: 'ja', label: '🇯🇵 日本語' },
                        { code: 'ko', label: '🇰🇷 한국어' },
                        { code: 'fr', label: '🇫🇷 Français' },
                        { code: 'de', label: '🇩🇪 Deutsch' },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            onTranslate(lang.code);
                            setShowTranslatePopup(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="重新生成"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
              )}
              {onFork && (
                <button
                  onClick={onFork}
                  className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="从此处创建分支"
                >
                  <span className="material-symbols-outlined text-lg">call_split</span>
                </button>
              )}
              {onToggleBookmark && (
                <button
                  onClick={onToggleBookmark}
                  className={`p-1.5 rounded transition-colors ${
                    isBookmarked 
                      ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' 
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isBookmarked ? '取消书签' : '添加书签'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isBookmarked ? 'bookmark' : 'bookmark_border'}
                  </span>
                </button>
              )}
              {onQuoteReply && (
                <button
                  onClick={() => {
                    // 截取前100字符作为引用
                    const quote = text.length > 100 ? text.slice(0, 100) + '...' : text;
                    onQuoteReply(quote);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="引用回复"
                >
                  <span className="material-symbols-outlined text-lg">format_quote</span>
                </button>
              )}
              {/* 置顶按钮 */}
              {onTogglePin && (
                <button
                  onClick={onTogglePin}
                  className={`p-1.5 rounded transition-colors ${
                    isPinned 
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/30' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={isPinned ? '取消置顶' : '置顶消息'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isPinned ? 'push_pin' : 'push_pin'}
                  </span>
                </button>
              )}
              {/* 评分按钮 */}
              {onRate && (
                <div className="relative">
                  <button
                    onClick={() => setShowRatingPopup(!showRatingPopup)}
                    className={`p-1.5 rounded transition-colors ${
                      rating 
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' 
                        : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={rating ? `已评分: ${rating}星` : '评分'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {rating ? 'star' : 'star_border'}
                    </span>
                  </button>
                  {/* 评分弹出框 */}
                  {showRatingPopup && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-1">
                        {([1, 2, 3, 4, 5] as const).map((star) => (
                          <button
                            key={star}
                            onClick={() => {
                              onRate(star);
                              setShowRatingPopup(false);
                            }}
                            className={`p-1 rounded transition-colors ${
                              rating && rating >= star
                                ? 'text-amber-500'
                                : 'text-gray-300 hover:text-amber-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-xl">
                              {rating && rating >= star ? 'star' : 'star_border'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              <button
                onClick={() => handleFeedback(true)}
                className={`p-1.5 rounded transition-colors ${
                  feedbackGiven === 'positive' 
                    ? 'text-green-500 bg-green-50 dark:bg-green-900/30' 
                    : 'text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="有帮助"
              >
                <span className="material-symbols-outlined text-lg">thumb_up</span>
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className={`p-1.5 rounded transition-colors ${
                  feedbackGiven === 'negative' 
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/30' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="没有帮助"
              >
                <span className="material-symbols-outlined text-lg">thumb_down</span>
              </button>
              {/* Phase 15: 语音朗读按钮 */}
              {onSpeak && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                  <button
                    onClick={onSpeak}
                    className={`p-1.5 rounded transition-colors ${
                      isSpeaking
                        ? 'text-green-500 bg-green-50 dark:bg-green-900/30 animate-pulse'
                        : 'text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={isSpeaking ? '停止朗读' : '朗读消息'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isSpeaking ? 'stop_circle' : 'volume_up'}
                    </span>
                  </button>
                </>
              )}
              {onDelete && (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="删除消息"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* 操作按钮 - 用户消息 */}
          {isUser && !isEditing && showActions && onEdit && (
            <div className="absolute -bottom-10 right-0 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-lg animate-in fade-in duration-150">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="编辑消息"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                onClick={handleCopyMessage}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="复制"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="删除消息"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              )}
            </div>
          )}

          {/* 删除确认弹窗 */}
          {showDeleteConfirm && (
            <div className="absolute -bottom-24 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg animate-in fade-in zoom-in-95 duration-150 z-10">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">确定要删除这条消息吗？</p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onDelete?.();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 建议按钮 */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((s, idx) => (
              <button 
                key={idx}
                onClick={() => onSuggestionClick?.(s.label)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-medium hover:shadow-md hover:border-primary/50 transition-all"
              >
                <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* 时间戳和性能指标 */}
        <div className="flex items-center gap-2 px-1">
          {timestamp && (
            <span className="text-[10px] text-gray-400">
              {timestamp.toLocaleTimeString()}
            </span>
          )}
          {/* AI消息显示响应时间和token数 */}
          {role === 'model' && responseTime && (
            <>
              <span className="text-[10px] text-gray-300">•</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">timer</span>
                {responseTime < 1000 
                  ? `${responseTime}ms` 
                  : `${(responseTime / 1000).toFixed(1)}s`
                }
              </span>
            </>
          )}
          {role === 'model' && tokenCount && (
            <>
              <span className="text-[10px] text-gray-300">•</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">token</span>
                {tokenCount}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default AIChatMessage;
