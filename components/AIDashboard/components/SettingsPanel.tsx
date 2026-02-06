/**
 * SettingsPanel - AI 聊天设置面板组件
 * 管理温度、流式输出、气泡主题等设置
 */

import React, { useState, useCallback } from 'react';
import { BubbleTheme, ToneStyle, CodeTheme } from '../types';

interface ChatSettings {
  temperature: number;
  maxTokens: number;
  streamEnabled: boolean;
  bubbleTheme: BubbleTheme;
  toneStyle: ToneStyle;
  codeTheme: CodeTheme;
  showTimestamps: boolean;
  showAvatars: boolean;
  autoSave: boolean;
  soundEnabled: boolean;
  markdownEnabled: boolean;
}

interface SettingsPanelProps {
  settings: ChatSettings;
  onSettingsChange: (settings: Partial<ChatSettings>) => void;
  onClose: () => void;
  className?: string;
}

// 预设温度配置
const temperaturePresets = [
  { value: 0, label: '精确', description: '最确定性的回复' },
  { value: 0.3, label: '保守', description: '较低的创造性' },
  { value: 0.7, label: '平衡', description: '推荐的默认值' },
  { value: 1.0, label: '创意', description: '较高的创造性' },
  { value: 1.5, label: '随机', description: '非常有创意但可能不准确' },
];

// 气泡主题预览
const bubbleThemes: { value: BubbleTheme; label: string; preview: string }[] = [
  { value: 'default', label: '默认', preview: 'bg-primary' },
  { value: 'minimal', label: '简约', preview: 'bg-blue-50 border border-blue-200' },
  { value: 'gradient', label: '渐变', preview: 'bg-gradient-to-r from-primary to-purple-500' },
  { value: 'glass', label: '玻璃', preview: 'bg-primary/80 backdrop-blur' },
];

// 语气风格
const toneStyles: { value: ToneStyle; label: string; icon: string }[] = [
  { value: 'default', label: '默认', icon: 'chat' },
  { value: 'formal', label: '正式', icon: 'business_center' },
  { value: 'casual', label: '轻松', icon: 'mood' },
  { value: 'creative', label: '创意', icon: 'palette' },
  { value: 'concise', label: '简洁', icon: 'short_text' },
];

// 代码主题
const codeThemes: { value: CodeTheme; label: string; colors: string[] }[] = [
  { value: 'github', label: 'GitHub', colors: ['#24292e', '#f6f8fa', '#032f62'] },
  { value: 'monokai', label: 'Monokai', colors: ['#272822', '#f8f8f2', '#66d9ef'] },
  { value: 'dracula', label: 'Dracula', colors: ['#282a36', '#f8f8f2', '#bd93f9'] },
  { value: 'nord', label: 'Nord', colors: ['#2e3440', '#eceff4', '#88c0d0'] },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'advanced'>('general');

  const updateSetting = useCallback(<K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    onSettingsChange({ [key]: value });
  }, [onSettingsChange]);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">聊天设置</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">close</span>
        </button>
      </div>

      {/* Tab 导航 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'general', label: '常规', icon: 'settings' },
          { id: 'appearance', label: '外观', icon: 'palette' },
          { id: 'advanced', label: '高级', icon: 'tune' },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-colors ${
              activeTab === id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {/* 常规设置 */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* 温度滑块 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                温度 ({settings.temperature.toFixed(1)})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2">
                {temperaturePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => updateSetting('temperature', preset.value)}
                    className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                      Math.abs(settings.temperature - preset.value) < 0.05
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 最大 Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                最大输出长度
              </label>
              <select
                value={settings.maxTokens}
                onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value={256}>256 tokens (简短)</option>
                <option value={512}>512 tokens (默认)</option>
                <option value={1024}>1024 tokens (详细)</option>
                <option value={2048}>2048 tokens (长文)</option>
                <option value={4096}>4096 tokens (超长)</option>
              </select>
            </div>

            {/* 语气风格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                回复语气
              </label>
              <div className="grid grid-cols-5 gap-2">
                {toneStyles.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('toneStyle', value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      settings.toneStyle === value
                        ? 'bg-primary/10 text-primary border-2 border-primary'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 开关选项 */}
            <div className="space-y-3">
              <SwitchOption
                label="流式输出"
                description="实时显示 AI 回复内容"
                checked={settings.streamEnabled}
                onChange={(v) => updateSetting('streamEnabled', v)}
              />
              <SwitchOption
                label="自动保存"
                description="自动保存对话记录"
                checked={settings.autoSave}
                onChange={(v) => updateSetting('autoSave', v)}
              />
              <SwitchOption
                label="提示音"
                description="收到消息时播放提示音"
                checked={settings.soundEnabled}
                onChange={(v) => updateSetting('soundEnabled', v)}
              />
            </div>
          </div>
        )}

        {/* 外观设置 */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            {/* 气泡主题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                消息气泡主题
              </label>
              <div className="grid grid-cols-4 gap-3">
                {bubbleThemes.map(({ value, label, preview }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('bubbleTheme', value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                      settings.bubbleTheme === value
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-full h-6 rounded-lg ${preview}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 代码主题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                代码块主题
              </label>
              <div className="grid grid-cols-4 gap-3">
                {codeThemes.map(({ value, label, colors }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting('codeTheme', value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                      settings.codeTheme === value
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex w-full h-6 rounded overflow-hidden">
                      {colors.map((color, i) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 显示选项 */}
            <div className="space-y-3">
              <SwitchOption
                label="显示时间戳"
                description="在消息上显示发送时间"
                checked={settings.showTimestamps}
                onChange={(v) => updateSetting('showTimestamps', v)}
              />
              <SwitchOption
                label="显示头像"
                description="显示用户和 AI 头像"
                checked={settings.showAvatars}
                onChange={(v) => updateSetting('showAvatars', v)}
              />
              <SwitchOption
                label="Markdown 渲染"
                description="渲染 Markdown 格式内容"
                checked={settings.markdownEnabled}
                onChange={(v) => updateSetting('markdownEnabled', v)}
              />
            </div>
          </div>
        )}

        {/* 高级设置 */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">API 设置</h4>
              <p className="text-sm text-gray-500">
                高级 API 设置请前往全局设置页面进行配置。
              </p>
              <button className="mt-3 text-sm text-primary hover:underline">
                前往设置 →
              </button>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ 危险区域
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                以下操作不可撤销，请谨慎使用。
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200">
                  清除本地缓存
                </button>
                <button className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200">
                  重置所有设置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 开关选项组件
interface SwitchOptionProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SwitchOption: React.FC<SwitchOptionProps> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </div>
);

export default SettingsPanel;
