import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface AssistantFormProps {
  assistant?: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  'auto_awesome', 'code', 'edit_note', 'analytics', 'rocket_launch',
  'psychology', 'school', 'business_center', 'lightbulb', 'science',
];

const CATEGORIES = ['General', 'Engineering', 'Marketing', 'Business', 'Product', 'Writing'];

// Model option for dropdown
interface ModelOption {
  id: string;           // Unique ID (e.g., modelId from DB)
  displayName: string;  // Display name like "Gemini 2.0 Flash - gemini-2.0-flash-exp"
  modelId: string;       // The actual model ID to use
  provider: string;      // Provider name for display
}

export const AssistantForm: React.FC<AssistantFormProps> = ({ assistant, onSave, onClose }) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Load models from database
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        const response = await api.getAIModels() as any;
        if (response.success && response.data) {
          // Transform DB models to dropdown options
          const modelOptions: ModelOption[] = response.data.map((m: any) => {
            // Get provider display name
            const providerNames: Record<string, string> = {
              GEMINI: 'Gemini',
              ANTHROPIC: 'Claude',
              OPENAI: 'GPT',
              OLLAMA: 'Ollama',
              LMSTUDIO: 'LM Studio',
            };
            const providerName = providerNames[m.provider] || m.provider;

            return {
              id: m.modelId,
              displayName: `${m.name} - ${m.modelId}`,
              modelId: m.modelId,
              provider: m.provider,
            };
          });

          // Sort by provider then name
          modelOptions.sort((a, b) => {
            if (a.provider !== b.provider) {
              return a.provider.localeCompare(b.provider);
            }
            return a.displayName.localeCompare(b.displayName);
          });

          setModels(modelOptions);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const [formData, setFormData] = useState({
    name: assistant?.name || '',
    description: assistant?.description || '',
    role: assistant?.role || '',
    avatar: assistant?.avatar || 'auto_awesome',
    category: assistant?.category || 'General',
    systemPrompt: assistant?.systemPrompt || '',
    model: assistant?.model || '',
    temperature: assistant?.temperature ?? 0.7,
    maxTokens: assistant?.maxTokens ?? 2048,
    enableMemory: assistant?.enableMemory ?? true,
    enableWebSearch: assistant?.enableWebSearch ?? false,
    isDefault: assistant?.isDefault ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15232a] rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          {assistant ? 'Edit Assistant' : 'Create New Assistant'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Assistant Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="e.g., Code Architect"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Role *
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="e.g., Engineering"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 头像选择 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Avatar Icon *
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              {AVATAR_OPTIONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: icon })}
                  className={`p-2 rounded-lg transition-all ${
                    formData.avatar === icon
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-white dark:bg-[#1c2b33] hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              rows={2}
              placeholder="Brief description of what this assistant does..."
              required
            />
          </div>

          {/* 系统提示词 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              System Prompt *
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
              rows={5}
              placeholder="You are a helpful AI assistant that..."
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">
              This prompt defines the assistant's behavior and personality
            </p>
          </div>

          {/* AI 模型配置 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">settings_suggest</span>
              AI Model Configuration
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Model 选择 - 从数据库加载 */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  AI Model *
                </label>
                {loadingModels ? (
                  <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 text-sm">
                    Loading models...
                  </div>
                ) : (
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="">Select a model...</option>
                    {models.map(option => (
                      <option key={option.id} value={option.modelId}>
                        {option.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  Temperature: {formData.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Lower = more focused, Higher = more creative
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                  Max Tokens
                </label>
                <select
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="1024">1,024</option>
                  <option value="2048">2,048</option>
                  <option value="4096">4,096</option>
                  <option value="8192">8,192</option>
                  <option value="16384">16,384</option>
                </select>
              </div>
            </div>

            {/* 开关选项 */}
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableMemory}
                  onChange={(e) => setFormData({ ...formData, enableMemory: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable Memory</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableWebSearch}
                  onChange={(e) => setFormData({ ...formData, enableWebSearch: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable Web Search</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set as Default Assistant</span>
              </label>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              {assistant ? 'Save Changes' : 'Create Assistant'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
