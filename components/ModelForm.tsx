import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ModelFormProps {
  model?: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

export const ModelForm: React.FC<ModelFormProps> = ({ model, onSave, onClose }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [formData, setFormData] = useState({
    name: model?.name || '',
    modelId: model?.modelId || '',
    provider: model?.provider || 'GEMINI',
    endpoint: model?.endpoint || '',
    apiKey: model?.apiKey || '',
    popularity: model?.popularity || 50,
    isPublic: model?.isPublic ?? true,
    description: model?.description || '',
    speed: model?.speed || 'Fast',
    cost: model?.cost || '$',
    context: model?.context || '128K',
    defaultTemplateId: model?.defaultTemplateId || '',
  });

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await api.getTemplates() as any;
        if (response.success) {
          setTemplates(response.data);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15232a] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">neurology</span>
          {model ? 'Edit Model' : 'Add New Model'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Model Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="e.g., Gemini 2.0 Flash"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Model ID *
              </label>
              <input
                type="text"
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="e.g., gemini-2.0-flash-exp"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => {
                const newProvider = e.target.value;
                let newEndpoint = formData.endpoint;

                // Auto-fill default endpoint for local providers
                if (newProvider === 'OLLAMA') {
                  newEndpoint = 'http://localhost:11434';
                } else if (newProvider === 'LMSTUDIO') {
                  newEndpoint = 'http://localhost:1234';
                } else {
                  // Clear endpoint for cloud providers
                  newEndpoint = '';
                }

                setFormData({ ...formData, provider: newProvider, endpoint: newEndpoint });
              }}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="GEMINI">Google Gemini</option>
              <option value="ANTHROPIC">Anthropic Claude</option>
              <option value="OPENAI">OpenAI GPT</option>
              <option value="OLLAMA">Ollama (Local)</option>
              <option value="LMSTUDIO">LM Studio (Local)</option>
            </select>
          </div>

          {/* API 配置 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">settings</span>
              API Configuration
            </h4>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Custom Endpoint {formData.provider === 'OLLAMA' || formData.provider === 'LMSTUDIO' ? '' : '(Optional)'}
              </label>
              <input
                type="url"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder={
                  formData.provider === 'OLLAMA' ? 'http://localhost:11434' :
                  formData.provider === 'LMSTUDIO' ? 'http://localhost:1234' :
                  'https://api.example.com/v1'
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                API Key (Optional)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="sk-..."
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  lock
                </span>
              </div>
            </div>
          </div>

          {/* 模型特性 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Speed
              </label>
              <select
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="Ultra Fast">Ultra Fast</option>
                <option value="Fast">Fast</option>
                <option value="Moderate">Moderate</option>
                <option value="Slow">Slow</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Cost
              </label>
              <select
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="Free">Free</option>
                <option value="$">$</option>
                <option value="$$">$$</option>
                <option value="$$$">$$$</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Context
              </label>
              <select
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="4K">4K</option>
                <option value="8K">8K</option>
                <option value="16K">16K</option>
                <option value="32K">32K</option>
                <option value="128K">128K</option>
                <option value="200K">200K</option>
                <option value="1M">1M</option>
                <option value="2M">2M</option>
              </select>
            </div>
          </div>

          {/* 热度滑块 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Popularity: {formData.popularity}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.popularity}
              onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Niche</span>
              <span>Popular</span>
              <span>Trending</span>
            </div>
          </div>

          {/* 默认模板选择 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Default Template (Optional)
            </label>
            <select
              value={formData.defaultTemplateId}
              onChange={(e) => setFormData({ ...formData, defaultTemplateId: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="">No Default Template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1 pl-1">
              {loadingTemplates ? 'Loading templates...' : 'Link a template to this model for specific tasks.'}
            </p>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
              rows={3}
              placeholder="Brief description of the model capabilities..."
            />
          </div>

          {/* 公开开关 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Model</p>
              <p className="text-xs text-gray-400">Available to all users</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.isPublic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.isPublic ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">save</span>
              {model ? 'Save Changes' : 'Add Model'}
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
