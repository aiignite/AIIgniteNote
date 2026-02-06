import React from 'react';

type ToneType = 'default' | 'professional' | 'casual' | 'humorous' | 'concise' | 'detailed' | 'encouraging' | 'academic';

interface ToneSelectorProps {
  selectedTone: string;
  showMenu: boolean;
  onToggleMenu: () => void;
  onSelectTone: (tone: ToneType) => void;
}

const toneOptions: { value: ToneType; icon: string; label: string; desc: string }[] = [
  { value: 'default', icon: 'auto_fix_high', label: '默认', desc: 'AI 自动判断' },
  { value: 'professional', icon: 'business_center', label: '专业正式', desc: '规范术语，结构化' },
  { value: 'casual', icon: 'mood', label: '轻松随意', desc: '像朋友聊天' },
  { value: 'humorous', icon: 'sentiment_very_satisfied', label: '幽默风趣', desc: '适当加入玩笑' },
  { value: 'concise', icon: 'short_text', label: '简洁明了', desc: '直接给答案' },
  { value: 'detailed', icon: 'article', label: '详细全面', desc: '充分解释举例' },
  { value: 'encouraging', icon: 'thumb_up', label: '积极鼓励', desc: '正面支持' },
  { value: 'academic', icon: 'school', label: '学术严谨', desc: '逻辑性强' },
];

const getToneLabel = (tone: string): string => {
  switch (tone) {
    case 'default': return '语气';
    case 'professional': return '专业';
    case 'casual': return '随意';
    case 'humorous': return '幽默';
    case 'concise': return '简洁';
    case 'detailed': return '详细';
    case 'encouraging': return '鼓励';
    case 'academic': return '学术';
    default: return '语气';
  }
};

/**
 * 语气风格选择器组件
 * 允许用户选择 AI 回复的语气风格
 */
export const ToneSelector: React.FC<ToneSelectorProps> = ({
  selectedTone,
  showMenu,
  onToggleMenu,
  onSelectTone,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggleMenu}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
          selectedTone !== 'default'
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="选择回复语气风格"
      >
        <span className="material-symbols-outlined text-sm">sentiment_satisfied</span>
        <span className="hidden sm:inline">{getToneLabel(selectedTone)}</span>
        <span className="material-symbols-outlined text-xs">expand_more</span>
      </button>
      {showMenu && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500">选择回复语气</span>
          </div>
          {toneOptions.map(({ value, icon, label, desc }) => (
            <button
              key={value}
              onClick={() => onSelectTone(value)}
              className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                selectedTone === value 
                  ? 'bg-purple-50 dark:bg-purple-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                selectedTone === value ? 'text-purple-500' : 'text-gray-400'
              }`}>{icon}</span>
              <div className="flex-1">
                <p className={`text-sm ${
                  selectedTone === value ? 'text-purple-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                }`}>{label}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
              {selectedTone === value && (
                <span className="material-symbols-outlined text-sm text-purple-500">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
