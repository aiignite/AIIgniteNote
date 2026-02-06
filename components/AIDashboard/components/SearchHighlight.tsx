/**
 * SearchHighlight - 搜索高亮组件
 * 用于在文本中高亮显示搜索关键词
 */

import React, { useMemo } from 'react';

interface SearchHighlightProps {
  text: string;
  search: string;
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
  maxMatches?: number;
}

/**
 * 将文本分割为匹配和非匹配部分
 */
const splitBySearch = (
  text: string, 
  search: string, 
  caseSensitive: boolean,
  maxMatches: number
): { text: string; isMatch: boolean }[] => {
  if (!search.trim()) {
    return [{ text, isMatch: false }];
  }

  const parts: { text: string; isMatch: boolean }[] = [];
  const flags = caseSensitive ? 'g' : 'gi';
  
  // 转义正则特殊字符
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedSearch})`, flags);
  
  const segments = text.split(regex);
  let matchCount = 0;

  for (const segment of segments) {
    if (!segment) continue;
    
    const isMatch = caseSensitive 
      ? segment === search 
      : segment.toLowerCase() === search.toLowerCase();
    
    if (isMatch && matchCount < maxMatches) {
      parts.push({ text: segment, isMatch: true });
      matchCount++;
    } else {
      parts.push({ text: segment, isMatch: false });
    }
  }

  return parts;
};

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  search,
  className = '',
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-600 rounded px-0.5',
  caseSensitive = false,
  maxMatches = Infinity,
}) => {
  const parts = useMemo(
    () => splitBySearch(text, search, caseSensitive, maxMatches),
    [text, search, caseSensitive, maxMatches]
  );

  if (!search.trim()) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => (
        part.isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </span>
  );
};

/**
 * 搜索结果摘要组件
 * 显示搜索匹配的上下文
 */
interface SearchExcerptProps {
  text: string;
  search: string;
  contextLength?: number;
  maxExcerpts?: number;
  className?: string;
}

export const SearchExcerpt: React.FC<SearchExcerptProps> = ({
  text,
  search,
  contextLength = 50,
  maxExcerpts = 3,
  className = '',
}) => {
  const excerpts = useMemo(() => {
    if (!search.trim()) return [];
    
    const results: string[] = [];
    const lowerText = text.toLowerCase();
    const lowerSearch = search.toLowerCase();
    let startIndex = 0;

    while (results.length < maxExcerpts) {
      const matchIndex = lowerText.indexOf(lowerSearch, startIndex);
      if (matchIndex === -1) break;

      const excerptStart = Math.max(0, matchIndex - contextLength);
      const excerptEnd = Math.min(text.length, matchIndex + search.length + contextLength);
      
      let excerpt = '';
      if (excerptStart > 0) excerpt += '...';
      excerpt += text.slice(excerptStart, excerptEnd);
      if (excerptEnd < text.length) excerpt += '...';
      
      results.push(excerpt);
      startIndex = matchIndex + search.length;
    }

    return results;
  }, [text, search, contextLength, maxExcerpts]);

  if (excerpts.length === 0) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      {excerpts.map((excerpt, index) => (
        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
          <SearchHighlight text={excerpt} search={search} />
        </div>
      ))}
    </div>
  );
};

/**
 * 搜索统计组件
 */
interface SearchStatsProps {
  total: number;
  current?: number;
  searchTerm: string;
  className?: string;
}

export const SearchStats: React.FC<SearchStatsProps> = ({
  total,
  current,
  searchTerm,
  className = '',
}) => {
  if (!searchTerm.trim()) return null;

  return (
    <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
      {current !== undefined ? (
        <span>第 {current} / {total} 个结果</span>
      ) : (
        <span>
          找到 <strong>{total}</strong> 个 "{searchTerm}" 的匹配
        </span>
      )}
    </div>
  );
};

export default SearchHighlight;
