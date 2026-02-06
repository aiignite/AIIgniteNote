import React from 'react';
import { QuickActionsMenu } from './QuickActionsMenu';
import { ReferenceChainIndicator } from './ReferenceChainIndicator';
import { InputHistoryIndicator } from './InputHistoryIndicator';
import { CharacterCounter } from './CharacterCounter';
import { SendButton } from './SendButton';

interface ToolbarProps {
  // 文件上传
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // 语音
  voiceSupported: boolean;
  isListening: boolean;
  onVoiceInput: () => void;
  // 快捷操作菜单
  showQuickActions: boolean;
  hasConversation: boolean;
  hasMessages: boolean;
  lastMessageIsModel: boolean;
  onToggleQuickActions: () => void;
  onShowQuickPhrases: () => void;
  onShowTemplates: () => void;
  onGenerateSummary: () => void;
  onGenerateContinuations: () => void;
  onShowShortcuts: () => void;
  // 引用链
  referenceChainLength: number;
  onClearReferenceChain: () => void;
  // 输入历史
  inputHistoryLength: number;
  // 发送
  inputLength: number;
  maxInputLength?: number;
  isGenerating: boolean;
  sendDisabled: boolean;
  onSend: () => void;
  onStop: () => void;
}

/**
 * 输入区工具栏组件
 * 包含文件上传、语音、快捷操作、发送按钮等
 */
export const InputToolbar: React.FC<ToolbarProps> = ({
  onFileUpload,
  onImageUpload,
  voiceSupported,
  isListening,
  onVoiceInput,
  showQuickActions,
  hasConversation,
  hasMessages,
  lastMessageIsModel,
  onToggleQuickActions,
  onShowQuickPhrases,
  onShowTemplates,
  onGenerateSummary,
  onGenerateContinuations,
  onShowShortcuts,
  referenceChainLength,
  onClearReferenceChain,
  inputHistoryLength,
  inputLength,
  maxInputLength = 4000,
  isGenerating,
  sendDisabled,
  onSend,
  onStop
}) => {
  return (
    <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-0.5">
        {/* PDF/文档按钮 */}
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md,.json,.csv,application/pdf,text/*"
          onChange={onFileUpload}
        />
        <label
          htmlFor="file-upload"
          className="flex items-center gap-0.5 px-2 py-1 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
          title="上传文档 (PDF/TXT/MD)"
        >
          <span className="material-symbols-outlined text-lg">attach_file</span>
        </label>

        {/* 图片按钮 */}
        <input
          type="file"
          id="image-upload"
          className="hidden"
          accept="image/*"
          multiple
          onChange={onImageUpload}
        />
        <label
          htmlFor="image-upload"
          className="flex items-center gap-0.5 px-2 py-1 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
          title="上传图片"
        >
          <span className="material-symbols-outlined text-lg">image</span>
        </label>

        {/* 语音按钮 */}
        {voiceSupported && (
          <button
            className={`p-1 rounded-lg transition-all ${
              isListening 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/30 animate-pulse' 
                : 'text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isListening ? '停止录音' : '语音输入'}
            onClick={onVoiceInput}
          >
            <span className="material-symbols-outlined text-lg">mic</span>
          </button>
        )}

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* 更多工具 - 下拉菜单 */}
        <QuickActionsMenu
          show={showQuickActions}
          hasConversation={hasConversation}
          hasMessages={hasMessages}
          lastMessageIsModel={lastMessageIsModel}
          onToggle={onToggleQuickActions}
          onShowQuickPhrases={onShowQuickPhrases}
          onShowTemplates={onShowTemplates}
          onGenerateSummary={onGenerateSummary}
          onGenerateContinuations={onGenerateContinuations}
          onShowShortcuts={onShowShortcuts}
        />

        {/* 引用链指示器 */}
        <ReferenceChainIndicator
          chainLength={referenceChainLength}
          onClear={onClearReferenceChain}
        />

        {/* 输入历史指示 */}
        <InputHistoryIndicator historyLength={inputHistoryLength} />
      </div>

      {/* 发送/停止按钮 */}
      <div className="flex items-center gap-2">
        {/* 字符计数 */}
        <CharacterCounter inputLength={inputLength} maxLength={maxInputLength} />
        
        <SendButton
          isGenerating={isGenerating}
          disabled={sendDisabled}
          onSend={onSend}
          onStop={onStop}
        />
      </div>
    </div>
  );
};
