import React from 'react';

interface InputStats {
  chars: number;
  cjkChars: number;
  words: number;
  lines: number;
}

interface InputStatsDisplayProps {
  show: boolean;
  inputLength: number;
  stats: InputStats;
}

/**
 * 输入统计显示组件
 * Phase 27: 显示输入框的字符、中文、词汇、行数统计
 */
export const InputStatsDisplay: React.FC<InputStatsDisplayProps> = ({
  show,
  inputLength,
  stats
}) => {
  if (!show || inputLength === 0) {
    return null;
  }

  return (
    <div className="absolute -top-6 right-0 flex items-center gap-2 text-[10px] text-gray-400">
      <span>{stats.chars} 字符</span>
      <span>{stats.cjkChars} 中文</span>
      <span>{stats.words} 词</span>
      <span>{stats.lines} 行</span>
    </div>
  );
};
