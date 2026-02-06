import React from 'react';

interface CharacterCounterProps {
  inputLength: number;
  maxLength?: number;
}

/**
 * 字符计数器组件
 * 显示当前输入的字符数
 */
export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  inputLength,
  maxLength = 4000
}) => {
  if (inputLength === 0) {
    return null;
  }

  return (
    <span className={`text-xs ${inputLength > maxLength ? 'text-red-500' : 'text-gray-400'}`}>
      {inputLength}/{maxLength}
    </span>
  );
};
