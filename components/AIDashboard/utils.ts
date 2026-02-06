/**
 * AIDashboard 工具函数集合
 */

import { ChatMessage } from '../../types';
import { AIConversation, ExportFormat, MessageStats, ConversationStats } from './types';

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp: Date | number | string | undefined): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

/**
 * 格式化日期
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return formatDate(d);
  } else if (days > 0) {
    return `${days} 天前`;
  } else if (hours > 0) {
    return `${hours} 小时前`;
  } else if (minutes > 0) {
    return `${minutes} 分钟前`;
  } else {
    return '刚刚';
  }
};

/**
 * 生成会话标题
 */
export const generateConversationTitle = (messages: ChatMessage[]): string => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return '新对话';
  
  const text = firstUserMessage.text.trim();
  if (text.length <= 30) return text;
  return text.substring(0, 30) + '...';
};

/**
 * 计算消息统计
 */
export const calculateMessageStats = (messages: ChatMessage[]): MessageStats => {
  const userMessages = messages.filter(m => m.role === 'user');
  const aiMessages = messages.filter(m => m.role === 'model');
  
  const totalChars = messages.reduce((sum, m) => sum + m.text.length, 0);
  
  // 计算平均响应时间 (简化版)
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === 'model' && messages[i-1].role === 'user') {
      const userTime = messages[i-1].timestamp ? new Date(messages[i-1].timestamp).getTime() : 0;
      const aiTime = messages[i].timestamp ? new Date(messages[i].timestamp).getTime() : 0;
      if (userTime && aiTime) {
        totalResponseTime += (aiTime - userTime);
        responseCount++;
      }
    }
  }
  
  return {
    totalMessages: messages.length,
    userMessages: userMessages.length,
    aiMessages: aiMessages.length,
    totalChars,
    avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
  };
};

/**
 * 导出对话为指定格式
 */
export const exportConversation = (
  conversation: AIConversation,
  format: ExportFormat,
  options?: {
    includeMetadata?: boolean;
    includeTimestamps?: boolean;
  }
): string => {
  const { messages, title, createdAt } = conversation;
  const { includeMetadata = true, includeTimestamps = true } = options || {};

  switch (format) {
    case 'markdown':
      return exportToMarkdown(messages, title, createdAt, includeMetadata, includeTimestamps);
    
    case 'html':
      return exportToHTML(messages, title, createdAt, includeMetadata);
    
    case 'json':
      return JSON.stringify(conversation, null, 2);
    
    case 'javascript':
      return exportToJS(messages, title);
    
    case 'python':
      return exportToPython(messages, title);
    
    default:
      return exportToMarkdown(messages, title, createdAt, includeMetadata, includeTimestamps);
  }
};

// Markdown 导出
const exportToMarkdown = (
  messages: ChatMessage[],
  title: string,
  createdAt: string,
  includeMetadata: boolean,
  includeTimestamps: boolean
): string => {
  let md = `# ${title}\n\n`;
  
  if (includeMetadata) {
    md += `> 创建时间: ${formatDate(createdAt)}\n`;
    md += `> 消息数量: ${messages.length}\n\n`;
  }
  
  md += '---\n\n';
  
  messages.forEach((msg) => {
    const role = msg.role === 'user' ? '👤 你' : '🤖 AI';
    const timestamp = includeTimestamps && msg.timestamp 
      ? ` (${formatTimestamp(msg.timestamp)})` 
      : '';
    
    md += `### ${role}${timestamp}\n\n`;
    md += `${msg.text}\n\n`;
  });
  
  return md;
};

// HTML 导出
const exportToHTML = (
  messages: ChatMessage[],
  title: string,
  createdAt: string,
  includeMetadata: boolean
): string => {
  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .message { margin-bottom: 16px; padding: 12px 16px; border-radius: 12px; }
    .user { background: #007AFF; color: white; margin-left: 20%; }
    .ai { background: white; margin-right: 20%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .role { font-weight: 600; margin-bottom: 4px; font-size: 12px; opacity: 0.7; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>${title}</h1>`;
  
  if (includeMetadata) {
    html += `\n  <p class="meta">创建时间: ${formatDate(createdAt)} | 消息数量: ${messages.length}</p>`;
  }
  
  messages.forEach((msg) => {
    const roleClass = msg.role === 'user' ? 'user' : 'ai';
    const roleLabel = msg.role === 'user' ? '你' : 'AI';
    
    html += `
  <div class="message ${roleClass}">
    <div class="role">${roleLabel}</div>
    <div class="content">${escapeHTML(msg.text)}</div>
  </div>`;
  });
  
  html += '\n</body>\n</html>';
  return html;
};

// JavaScript 导出
const exportToJS = (messages: ChatMessage[], title: string): string => {
  return `// ${title}
// 导出时间: ${new Date().toISOString()}

const conversation = ${JSON.stringify(messages.map(m => ({
  role: m.role,
  content: m.text,
})), null, 2)};

export default conversation;
`;
};

// Python 导出
const exportToPython = (messages: ChatMessage[], title: string): string => {
  return `# ${title}
# 导出时间: ${new Date().toISOString()}

conversation = [
${messages.map(m => `    {"role": "${m.role}", "content": ${JSON.stringify(m.text)}},`).join('\n')}
]
`;
};

// HTML 转义
const escapeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * 下载文件
 */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

/**
 * 生成唯一 ID
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 搜索消息
 */
export const searchMessages = (
  messages: ChatMessage[],
  query: string,
  options?: {
    caseSensitive?: boolean;
    matchRole?: 'all' | 'user' | 'model';
  }
): { message: ChatMessage; index: number; matches: number[] }[] => {
  const { caseSensitive = false, matchRole = 'all' } = options || {};
  const searchText = caseSensitive ? query : query.toLowerCase();
  
  return messages
    .map((message, index) => {
      if (matchRole !== 'all' && message.role !== matchRole) {
        return null;
      }
      
      const text = caseSensitive ? message.text : message.text.toLowerCase();
      const matches: number[] = [];
      let pos = 0;
      
      while ((pos = text.indexOf(searchText, pos)) !== -1) {
        matches.push(pos);
        pos += searchText.length;
      }
      
      return matches.length > 0 ? { message, index, matches } : null;
    })
    .filter((result): result is NonNullable<typeof result> => result !== null);
};

/**
 * 过滤书签消息
 */
export const filterBookmarkedMessages = (
  messages: ChatMessage[],
  bookmarkedIndices: number[]
): { message: ChatMessage; index: number }[] => {
  return bookmarkedIndices
    .filter(index => index >= 0 && index < messages.length)
    .map(index => ({ message: messages[index], index }))
    .sort((a, b) => a.index - b.index);
};

/**
 * 解析斜杠命令
 */
export const parseSlashCommand = (text: string): { command: string; args: string } | null => {
  const match = text.match(/^\/(\w+)(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    command: match[1].toLowerCase(),
    args: match[2]?.trim() || '',
  };
};

/**
 * 验证模型配置
 */
export const validateModelConfig = (config: {
  name?: string;
  modelId?: string;
  provider?: string;
  apiKey?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.name?.trim()) {
    errors.push('模型名称不能为空');
  }
  
  if (!config.modelId?.trim()) {
    errors.push('模型 ID 不能为空');
  }
  
  if (!config.provider?.trim()) {
    errors.push('请选择提供商');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
