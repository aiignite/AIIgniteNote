import React from 'react';

interface InputHistoryIndicatorProps {
  historyLength: number;
}

/**
 * 输入历史指示器组件
 * Phase 27: 显示输入历史的存在提示
 */
export const InputHistoryIndicator: React.FC<InputHistoryIndicatorProps> = ({
  historyLength
}) => {
  if (historyLength === 0) {
    return null;
  }

  return (
    <span className="text-[10px] text-gray-400 px-2" title="按↑键浏览历史">
      ↑ 历史
    </span>
  );
};
