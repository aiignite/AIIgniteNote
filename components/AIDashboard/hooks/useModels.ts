/**
 * useModels - AI 模型管理钩子
 * 处理模型加载、选择、切换等逻辑
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../../../services/api';
import { AIModel, AIAssistant } from '../types';

// 默认模型配置
const DEFAULT_MODEL_ID = 'gemini-2.0-flash-exp';
const DEFAULT_ASSISTANT_ID = 'default';

interface UseModelsOptions {
  autoLoad?: boolean;
}

interface UseModelsReturn {
  // 模型状态
  models: AIModel[];
  loadingModels: boolean;
  currentModelId: string;
  currentModel: AIModel | null;

  // 助手状态
  assistants: AIAssistant[];
  loadingAssistants: boolean;
  currentAssistantId: string;
  currentAssistant: AIAssistant | null;

  // 模型操作
  loadModels: () => Promise<void>;
  selectModel: (modelId: string) => void;
  createModel: (data: Partial<AIModel>) => Promise<AIModel | null>;
  updateModel: (id: string, data: Partial<AIModel>) => Promise<AIModel | null>;
  deleteModel: (id: string) => Promise<boolean>;

  // 助手操作
  loadAssistants: () => Promise<void>;
  selectAssistant: (assistantId: string) => void;
  createAssistant: (data: Partial<AIAssistant>) => Promise<AIAssistant | null>;
  updateAssistant: (id: string, data: Partial<AIAssistant>) => Promise<AIAssistant | null>;
  deleteAssistant: (id: string) => Promise<boolean>;
  
  // 刷新
  refreshAll: () => Promise<void>;

  // 当前模型标签（用于显示）
  currentModelLabel: string;
}

export function useModels(options: UseModelsOptions = {}): UseModelsReturn {
  const { autoLoad = true } = options;

  // 模型状态
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string>(
    () => localStorage.getItem('aiModelId') || DEFAULT_MODEL_ID
  );

  // 助手状态
  const [assistants, setAssistants] = useState<AIAssistant[]>([]);
  const [loadingAssistants, setLoadingAssistants] = useState(false);
  const [currentAssistantId, setCurrentAssistantId] = useState<string>(
    () => localStorage.getItem('aiAssistantId') || DEFAULT_ASSISTANT_ID
  );

  // 计算当前选中的模型
  const currentModel = useMemo(() => {
    return models.find(m => m.id === currentModelId) || null;
  }, [models, currentModelId]);

  // 计算当前选中的助手
  const currentAssistant = useMemo(() => {
    return assistants.find(a => a.id === currentAssistantId) || 
           assistants.find(a => a.isDefault) || 
           assistants[0] || 
           null;
  }, [assistants, currentAssistantId]);

  // 计算当前模型显示标签
  const currentModelLabel = useMemo(() => {
    if (currentModel) {
      return currentModel.displayName || currentModel.name;
    }
    return currentModelId;
  }, [currentModel, currentModelId]);

  // 加载模型列表
  const loadModels = useCallback(async () => {
    try {
      setLoadingModels(true);
      const response = await api.getAIModels() as any;
      if (response?.success && Array.isArray(response.data)) {
        setModels(response.data);
        
        // 如果当前选中的模型不在列表中，选择默认模型
        if (response.data.length > 0 && !response.data.find((m: any) => m.id === currentModelId)) {
          const defaultModel = response.data.find((m: any) => m.isDefault) || response.data[0];
          if (defaultModel) {
            setCurrentModelId(defaultModel.id);
            localStorage.setItem('aiModelId', defaultModel.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoadingModels(false);
    }
  }, [currentModelId]);

  // 加载助手列表
  const loadAssistants = useCallback(async () => {
    try {
      setLoadingAssistants(true);
      const response = await api.getAIAssistants() as any;
      if (response.success && Array.isArray(response.data)) {
        setAssistants(response.data);
        
        // 如果当前选中的助手不在列表中，选择默认助手
        if (response.data.length > 0 && !response.data.find((a: AIAssistant) => a.id === currentAssistantId)) {
          const defaultAssistant = response.data.find((a: AIAssistant) => a.isDefault) || response.data[0];
          if (defaultAssistant) {
            setCurrentAssistantId(defaultAssistant.id);
            localStorage.setItem('aiAssistantId', defaultAssistant.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load assistants:', error);
    } finally {
      setLoadingAssistants(false);
    }
  }, [currentAssistantId]);

  // 选择模型
  const selectModel = useCallback((modelId: string) => {
    setCurrentModelId(modelId);
    localStorage.setItem('aiModelId', modelId);
  }, []);

  // 选择助手
  const selectAssistant = useCallback((assistantId: string) => {
    setCurrentAssistantId(assistantId);
    localStorage.setItem('aiAssistantId', assistantId);
  }, []);

  // 创建模型
  const createModel = useCallback(async (data: Partial<AIModel>): Promise<AIModel | null> => {
    try {
      const response = await api.createAIModel(data as any) as any;
      if (response?.success && response.data) {
        const newModel = response.data as AIModel;
        setModels(prev => [...prev, newModel]);
        return newModel;
      }
    } catch (error) {
      console.error('Failed to create model:', error);
    }
    return null;
  }, []);

  // 更新模型
  const updateModel = useCallback(async (id: string, data: Partial<AIModel>): Promise<AIModel | null> => {
    try {
      const response = await api.updateAIModel(id, data as any) as any;
      if (response?.success && response.data) {
        const updatedModel = response.data as AIModel;
        setModels(prev => prev.map(m => m.id === id ? updatedModel : m));
        return updatedModel;
      }
    } catch (error) {
      console.error('Failed to update model:', error);
    }
    return null;
  }, []);

  // 删除模型
  const deleteModel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await api.deleteAIModel(id) as any;
      if (response?.success) {
        setModels(prev => prev.filter(m => m.id !== id));
        // 如果删除的是当前选中的模型，选择第一个
        if (currentModelId === id) {
          const remaining = models.filter(m => m.id !== id);
          if (remaining.length > 0) {
            selectModel(remaining[0].id);
          }
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
    return false;
  }, [currentModelId, models, selectModel]);

  // 创建助手
  const createAssistant = useCallback(async (data: Partial<AIAssistant>): Promise<AIAssistant | null> => {
    try {
      const response = await api.createAIAssistant(data as any) as any;
      if (response?.success && response.data) {
        const newAssistant = response.data as AIAssistant;
        setAssistants(prev => [...prev, newAssistant]);
        return newAssistant;
      }
    } catch (error) {
      console.error('Failed to create assistant:', error);
    }
    return null;
  }, []);

  // 更新助手
  const updateAssistant = useCallback(async (id: string, data: Partial<AIAssistant>): Promise<AIAssistant | null> => {
    try {
      const response = await api.updateAIAssistant(id, data as any) as any;
      if (response?.success && response.data) {
        const updatedAssistant = response.data as AIAssistant;
        setAssistants(prev => prev.map(a => a.id === id ? updatedAssistant : a));
        return updatedAssistant;
      }
    } catch (error) {
      console.error('Failed to update assistant:', error);
    }
    return null;
  }, []);

  // 删除助手
  const deleteAssistant = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await api.deleteAIAssistant(id) as any;
      if (response?.success) {
        setAssistants(prev => prev.filter(a => a.id !== id));
        // 如果删除的是当前选中的助手，选择默认助手
        if (currentAssistantId === id) {
          const remaining = assistants.filter(a => a.id !== id);
          const defaultAssistant = remaining.find(a => a.isDefault) || remaining[0];
          if (defaultAssistant) {
            selectAssistant(defaultAssistant.id);
          }
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to delete assistant:', error);
    }
    return false;
  }, [currentAssistantId, assistants, selectAssistant]);

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    await Promise.all([loadModels(), loadAssistants()]);
  }, [loadModels, loadAssistants]);

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }
  }, [autoLoad]); // 只在组件挂载时执行一次

  return {
    // 模型状态
    models,
    loadingModels,
    currentModelId,
    currentModel,

    // 助手状态
    assistants,
    loadingAssistants,
    currentAssistantId,
    currentAssistant,

    // 模型操作
    loadModels,
    selectModel,
    createModel,
    updateModel,
    deleteModel,

    // 助手操作
    loadAssistants,
    selectAssistant,
    createAssistant,
    updateAssistant,
    deleteAssistant,

    // 刷新
    refreshAll,

    // 显示标签
    currentModelLabel,
  };
}
