import React, { useState, useEffect, useMemo } from 'react';
import { AITemplate, CreateTemplateRequest, TemplateCategory, TemplateNoteType } from '../types';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';
import { useLanguageStore } from '../store/languageStore';

interface TemplateFormProps {
  template?: AITemplate | null;
  onSave: (template: AITemplate) => void;
  onCancel: () => void;
}

const CATEGORIES: TemplateCategory[] = ['Planning', 'Brainstorm', 'Writing', 'Business', 'Development', 'Personal', 'General'];

const NOTE_TYPES: TemplateNoteType[] = ['MARKDOWN', 'RICHTEXT', 'MINDMAP', 'FLOWCHART'];

const ICONS = [
  'auto_awesome', 'event_note', 'account_tree', 'article', 'groups',
  'code', 'history_edu', 'lightbulb', 'task_alt', 'checklist',
  'psychology', 'edit_note', 'description', 'title', 'format_quote',
  'analytics', 'rocket_launch', 'stars', 'diamond', 'grade'
];

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const { language } = useLanguageStore();
  const isZh = language === 'zh';

  const categoryLabels: Record<TemplateCategory, string> = {
    Planning: '规划',
    Brainstorm: '头脑风暴',
    Writing: '写作',
    Business: '商务',
    Development: '开发',
    Personal: '个人',
    General: '通用',
  };

  const noteTypeLabels: Record<TemplateNoteType, string> = {
    MARKDOWN: 'Markdown',
    RICHTEXT: '富文本',
    MINDMAP: '思维导图',
    FLOWCHART: '流程图',
  };
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    description: template?.description || '',
    prompt: template?.prompt || '',
    category: template?.category || 'General',
    icon: template?.icon || 'article',
    noteType: template?.noteType || 'MARKDOWN',
    isPublic: template?.isPublic || false,
  });
  const [defaultAssistantId, setDefaultAssistantId] = useState<string | undefined>(template?.defaultAssistantId || undefined);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [assistants, setAssistants] = useState<Array<{ id: string; name: string }>>([]);

  const assistantOptions = useMemo(() => {
    const map = new Map<string, string>();
    assistants.forEach(ast => map.set(ast.id, ast.name));
    if (defaultAssistantId && !map.has(defaultAssistantId)) {
      map.set(defaultAssistantId, isZh ? '已选择助手' : 'Selected assistant');
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assistants, defaultAssistantId, isZh]);

  useEffect(() => {
    setFormData({
      name: template?.name || '',
      description: template?.description || '',
      prompt: template?.prompt || '',
      category: template?.category || 'General',
      icon: template?.icon || 'article',
      noteType: template?.noteType || 'MARKDOWN',
      isPublic: template?.isPublic || false,
    });
    const nextAssistantId = template?.defaultAssistantId || undefined;
    setDefaultAssistantId(nextAssistantId);
    setErrors({});
  }, [template]);

  useEffect(() => {
    const loadAssistants = async () => {
      try {
        const response = await api.getAIAssistants() as any;
        if (response?.success && response.data) {
          const all = [
            ...(response.data.system || []),
            ...(response.data.custom || [])
          ];
          setAssistants(all.map((item: any) => ({ id: item.id, name: item.name })));
        }
      } catch (err) {
        console.warn('[TemplateForm] Failed to load assistants:', err);
      }
    };

    loadAssistants();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = isZh ? '请输入模板名称' : 'Template name is required';
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = isZh ? '请输入模板内容' : 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    try {
      let response;
      const payload: CreateTemplateRequest = {
        ...formData,
        defaultAssistantId: defaultAssistantId || undefined,
      };
      if (template) {
        response = await api.updateTemplate(template.id, payload) as { success: boolean; data: AITemplate };
      } else {
        response = await api.createTemplate(payload) as { success: boolean; data: AITemplate };
      }

      if (response.success) {
        // Cache to IndexedDB after successful API save
        try {
          await indexedDB.cacheTemplate(response.data);
          console.log('[TemplateForm] Template cached to IndexedDB');
        } catch (cacheErr) {
          console.warn('[TemplateForm] Failed to cache template to IndexedDB:', cacheErr);
        }
        
        onSave(response.data);
      }
    } catch (err: any) {
      console.error('Error saving template:', err);
      setErrors({ ...errors, form: err.message || (isZh ? '保存模板失败' : 'Failed to save template') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c2b33] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">
            {template ? (isZh ? '编辑模板' : 'Edit Template') : (isZh ? '创建模板' : 'Create New Template')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {isZh ? '模板名称' : 'Template Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={isZh ? '例如：周计划' : 'e.g., Weekly Planner'}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {isZh ? '描述' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={2}
                placeholder={isZh ? '简要描述该模板' : 'Brief description of this template'}
              />
            </div>

            {/* Template Content */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {isZh ? '模板内容' : 'Template Content'} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={10}
                placeholder={
                  formData.noteType === 'MARKDOWN' 
                    ? (isZh ? "# 标题\n\n在此填写内容..." : "# Title\n\nContent goes here...") 
                    : formData.noteType === 'RICHTEXT'
                    ? (isZh ? '请输入富文本模板内容...' : 'Enter your rich text template content...')
                    : (isZh ? '请输入结构化数据用于可视化...' : 'Enter structured data for visualization...')
                }
              />
              {errors.prompt && <p className="text-red-500 text-sm mt-1">{errors.prompt}</p>}
              <p className="mt-2 text-xs text-gray-400">
                {isZh ? '该内容将作为新笔记的初始正文。' : 'This content will be used as the initial body of the new note.'}
              </p>
            </div>

            {/* Category and Note Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {isZh ? '分类' : 'Category'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{isZh ? categoryLabels[cat] : cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {isZh ? '笔记类型' : 'Note Type'}
                </label>
                <select
                  value={formData.noteType}
                  onChange={(e) => setFormData({ ...formData, noteType: e.target.value as TemplateNoteType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {NOTE_TYPES.map(type => (
                    <option key={type} value={type}>{isZh ? noteTypeLabels[type] : type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {isZh ? '默认 AI 助手' : 'Default AI Assistant'}
              </label>
              <select
                value={defaultAssistantId || ''}
                onChange={(e) => {
                  const nextValue = e.target.value || undefined;
                  setDefaultAssistantId(nextValue);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{isZh ? '不指定' : 'Not set'}</option>
                {assistantOptions.map(ast => (
                  <option key={ast.id} value={ast.id}>{ast.name}</option>
                ))}
              </select>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                {isZh ? '图标' : 'Icon'}
              </label>
              <div className="grid grid-cols-10 gap-2">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 rounded-lg border-2 transition-colors ${
                      formData.icon === icon
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Public checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                {isZh ? '设为公开模板（所有用户可见）' : 'Make this template public (visible to all users)'}
              </label>
            </div>

            {/* Form error */}
            {errors.form && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {errors.form}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (isZh ? '保存中...' : 'Saving...') : template ? (isZh ? '更新模板' : 'Update Template') : (isZh ? '创建模板' : 'Create Template')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TemplateForm;
