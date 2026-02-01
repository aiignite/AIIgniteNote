import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChatMessage } from '../types';
import { api } from '../services/api';
import { indexedDB } from '../services/indexedDB';
import { ModelForm } from './ModelForm';
import { AssistantForm } from './AssistantForm';

// AI Model 类型定义
interface AIModel {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  popularity: number;
  isPublic: boolean;
  isCustom: boolean;
  speed: string;
  cost: string;
  context: string;
  description: string;
}

// AI Assistant 类型定义
interface AIAssistant {
  id: string;
  name: string;
  description: string;
  role: string;
  avatar: string;
  systemPrompt: string;
  category: string;
  isSystem: boolean;
  isCustom?: boolean;
  usageCount: number;
  model?: string;  // Model ID to use for this assistant
}

const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Models' | 'Assistants' | 'Chat'>('Chat');
  const [modelViewMode, setModelViewMode] = useState<'grid' | 'list'>('grid');
  const [assistantViewMode, setAssistantViewMode] = useState<'grid' | 'list'>('grid');
  const [inputText, setInputText] = useState('');
  const [models, setModels] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // 表单状态
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [showAssistantForm, setShowAssistantForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<any>(null);

  // Chat 功能状态
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversationMeta, setCurrentConversationMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiSettings, setAiSettings] = useState<any>(null);

  // Refs for stream control
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const stopSignalRef = useRef(false);

  const loadCustomModelsAndAssistants = async () => {
    try {
      console.log('[Load] Loading models and assistants from database...');

      // Load models from database only
      const modelsResponse = await api.getAIModels() as any;
      if (modelsResponse.success && modelsResponse.data) {
        const dbModels = modelsResponse.data;
        console.log('[Load] Loaded models from database:', dbModels);

        // Cache to IndexedDB using clear-and-replace to ensure deleted items are removed
        await indexedDB.clearAndCacheModels(dbModels);
        console.log('[Load] Models synced to IndexedDB:', dbModels.length);

        // All models come from database - mark them all as custom/deletable
        const mappedModels = dbModels.map((m: any) => ({
          id: m.id,
          name: m.name,
          modelId: m.modelId,
          provider: m.provider,
          endpoint: m.endpoint,
          desc: m.description || `${m.provider} model`,
          speed: m.speed || 'Fast',
          cost: m.cost || '$',
          context: m.context || 'N/A',
          isCustom: true,  // All database models are deletable
          popularity: m.popularity,
          defaultTemplateId: m.defaultTemplateId,
        }));
        console.log('[Load] Mapped models:', mappedModels);
        setModels(mappedModels);
        console.log('[Load] Models loaded:', dbModels.length);
      }

      // Load assistants from database only
      const assistantsResponse = await api.getAIAssistants() as any;
      let firstAssistant: AIAssistant | null = null;
      if (assistantsResponse.success && assistantsResponse.data) {
        const { system, custom } = assistantsResponse.data;
        const allAssistants = [...(system || []), ...(custom || [])];
        
        // Cache to IndexedDB
        await indexedDB.clearAndCacheAssistants(allAssistants);
        console.log('[Load] Assistants synced to IndexedDB:', allAssistants.length);
        
        // All assistants come from database - mark custom ones as deletable
        const mappedAssistants = allAssistants.map((a: any) => ({
          ...a,
          isCustom: !a.isSystem,  // Only non-system assistants are deletable
        }));
        setAssistants(mappedAssistants);
        if (mappedAssistants.length > 0) {
          const defaultAssistant = mappedAssistants.find((a: any) => a.isDefault);
          firstAssistant = defaultAssistant || mappedAssistants[0];
          setCurrentAssistant(firstAssistant);
        }
        console.log('[Load] Assistants loaded:', allAssistants.length);
      }
      setLoadingProviders(false);
      return firstAssistant;
    } catch (error) {
      console.error('[Load] Error loading data:', error);
      
      // Fallback to IndexedDB cache
      try {
        const cachedModels = await indexedDB.getAIModels();
        if (cachedModels.length > 0) {
          setModels(cachedModels.map((m: any) => ({
            ...m,
            isCustom: true,
          })));
          console.log('[Load] Loaded models from IndexedDB cache:', cachedModels.length);
        }
        
        const cachedAssistants = await indexedDB.getAIAssistants();
        if (cachedAssistants.length > 0) {
          const mappedAssistants = cachedAssistants.map((a: any) => ({
            ...a,
            isCustom: !a.isSystem,
          }));
          setAssistants(mappedAssistants);
          const defaultAssistant = mappedAssistants.find((a: any) => a.isDefault);
          const firstAssistant = defaultAssistant || mappedAssistants[0];
          setCurrentAssistant(firstAssistant);
          setLoadingProviders(false);
          return firstAssistant;
        }
      } catch (cacheError) {
        console.error('[Load] Failed to load from IndexedDB cache:', cacheError);
      }
      setLoadingProviders(false);
      return null;
    }
  };

  const saveCustomModelsAndAssistants = async (modelsToSave?: any[], assistantsToSave?: AIAssistant[]) => {
    try {
      const modelsList = modelsToSave || models;
      
      // Save models to database
      const customModels = modelsList.filter(m => m.isCustom);
      console.log('Saving custom models to database:', customModels.length, customModels);

      for (const model of customModels) {
        if (model.id && !model.id.startsWith('gemini-') && !model.id.startsWith('gpt-') && !model.id.startsWith('claude-')) {
          try {
            await api.createAIModel({
              name: model.name || model.id,
              modelId: model.modelId || model.id,
              provider: model.provider || 'GEMINI',
              popularity: model.popularity || 50,
              speed: model.speed,
              cost: model.cost,
              context: model.context,
              description: model.desc,
            });
          } catch (error) {
            console.error('Failed to save model to database:', error);
          }
        }
      }
      
      // Note: Assistants are now saved individually via handleSaveAssistant/handleDeleteAssistant
    } catch (error) {
      console.error('Error saving custom data:', error);
    }
  };

  // Initialize with empty array - assistants will be loaded from database
  const [assistants, setAssistants] = useState<AIAssistant[]>([]);
  
  // Default assistant for new chats (used when no assistant is selected)
  const [currentAssistant, setCurrentAssistant] = useState<AIAssistant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'messages'>('updated');

  // Load available AI data on mount
  useEffect(() => {
    const loadAllData = async () => {
      // 先加载自定义模型（需要等待完成）
      const firstAssistant = await loadCustomModelsAndAssistants();
      await loadAISettings();
      await loadConversationHistory();
      
      // Initialize with greeting if starting fresh in Chat tab
      // Only create new chat if we don't have any conversations
      if (chatMessages.length === 0 && !currentConversationId) {
        try {
          // Pass the freshly loaded assistant if state isn't updated yet
          await handleNewChat(firstAssistant || undefined);
        } catch (error) {
          console.error('Failed to initialize new chat:', error);
        }
      }
    };

    loadAllData();
  }, []);

  const loadAISettings = async () => {
    try {
      const response = await api.getAISettings() as any;
      if (response.success && response.data) {
        setAiSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      setLoadingConversations(true);
      const response = await api.getAIConversations() as any;
      if (response.success && Array.isArray(response.data)) {
        setConversations(response.data);
        // Cache to IndexedDB using clear-and-replace to ensure deleted items are removed
        await indexedDB.clearAndCacheConversations(response.data);
        console.log('[loadConversationHistory] Conversations synced to IndexedDB:', response.data.length);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to IndexedDB if API fails
      try {
        const cachedConversations = await indexedDB.getConversations();
        if (cachedConversations.length > 0) {
          setConversations(cachedConversations);
          console.log('[loadConversationHistory] Loaded from IndexedDB cache:', cachedConversations.length);
        }
      } catch (cacheError) {
        console.error('Failed to load from IndexedDB:', cacheError);
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  // 过滤和排序对话
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchQuery) {
      filtered = filtered.filter(conv =>
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'messages':
          return (b.messageCount || 0) - (a.messageCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [conversations, searchQuery, sortBy]);

  const currentModelLabel = useMemo(() => {
    const modelId = currentConversationMeta?.model || currentAssistant?.model || aiSettings?.defaultModel;
    console.log('[AIDashboard] Calculating currentModelLabel:', {
      conversationMetaModel: currentConversationMeta?.model,
      assistantModel: currentAssistant?.model,
      defaultModel: aiSettings?.defaultModel,
      selectedModelId: modelId,
      availableModels: models.map((m: any) => ({ id: m.id, modelId: m.modelId, name: m.name }))
    });
    const dbModel = models.find((m: any) => m.modelId === modelId);
    const result = dbModel?.name || modelId || '未选择模型';
    console.log('[AIDashboard] Found model:', dbModel ? { id: dbModel.id, modelId: dbModel.modelId, name: dbModel.name } : null, 'result:', result);
    return result;
  }, [currentConversationMeta?.model, currentAssistant?.model, aiSettings?.defaultModel, models]);

  const currentAssistantLabel = currentAssistant?.name || '未选择助手';

  // 模型操作处理器
  const handleSaveModel = async (data: any) => {
    try {
      if (editingModel) {
        // Update existing model in database
        if (editingModel.isCustom) {
          const response = await api.updateAIModel(editingModel.id, data) as any;
          if (response.success && response.data) {
            await indexedDB.cacheAIModel(response.data);
          }
        }
      } else {
        // Create new model in database
        const response = await api.createAIModel({
          name: data.name,
          modelId: data.modelId,
          provider: data.provider,
          popularity: data.popularity || 50,
          speed: data.speed,
          cost: data.cost,
          context: data.context,
          description: data.description,
          defaultTemplateId: data.defaultTemplateId,
        }) as any;
        
        // Cache to IndexedDB
        if (response.success && response.data) {
          await indexedDB.cacheAIModel(response.data);
        }
      }
      setShowModelForm(false);
      setEditingModel(null);
      // Reload models to get updated data including template relations
      loadCustomModelsAndAssistants();
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model. Please try again.');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        // Delete from database if it's a custom model
        const modelToDelete = models.find(m => m.id === modelId);
        console.log('[AIDashboard] Deleting model:', modelId, 'isCustom:', modelToDelete?.isCustom);
        
        if (modelToDelete?.isCustom) {
          const response = await api.deleteAIModel(modelId) as any;
          console.log('[AIDashboard] Delete API response:', response);
          
          if (!response.success) {
            throw new Error(response?.message || 'Failed to delete model from server');
          }
          
          // Remove from IndexedDB cache to ensure sync consistency
          await indexedDB.removeAIModel(modelId);
          console.log('[AIDashboard] Model removed from IndexedDB');
        }
        // Update local state
        const updatedModels = models.filter(m => m.id !== modelId);
        setModels(updatedModels);
        console.log('[AIDashboard] Local state updated, remaining models:', updatedModels.length);
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  // 助手操作处理器
  const handleSaveAssistant = async (data: any) => {
    try {
      if (editingAssistant) {
        const response = await api.updateAIAssistant(editingAssistant.id, data) as any;
        if (response.success && response.data) {
          await indexedDB.cacheAIAssistant(response.data);
        }
      } else {
        const response = await api.createAIAssistant({
          ...data,
          isSystem: false
        }) as any;
        
        if (response.success && response.data) {
          await indexedDB.cacheAIAssistant(response.data);
        }
      }
      setShowAssistantForm(false);
      setEditingAssistant(null);
      
      // Reload to reflect changes and potentially updated isDefault status on other assistants
      loadCustomModelsAndAssistants();
    } catch (error) {
      console.error('Failed to save assistant:', error);
      alert('Failed to save assistant. Please try again.');
    }
  };

  const handleSetDefaultAssistant = async (assistantId: string) => {
    try {
      const response = await api.updateAIAssistant(assistantId, { isDefault: true }) as any;
      if (response.success) {
        // Refresh assistants list
        const assistantsResponse = await api.getAIAssistants() as any;
        if (assistantsResponse.success && assistantsResponse.data) {
          const { system, custom } = assistantsResponse.data;
          const allAssistants = [...(system || []), ...(custom || [])];
          const mappedAssistants = allAssistants.map((a: any) => ({
            ...a,
            isCustom: !a.isSystem,
          }));
          setAssistants(mappedAssistants);
          
          // If we just set a default, it should probably be the current one if none selected
          const newDefault = mappedAssistants.find((a: any) => a.isDefault);
          if (newDefault && !currentAssistant) {
            setCurrentAssistant(newDefault);
          }
        }
      }
    } catch (error) {
      console.error('Failed to set default assistant:', error);
    }
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    if (confirm('Are you sure you want to delete this assistant?')) {
      try {
        const assistantToDelete = assistants.find(a => a.id === assistantId);
        console.log('[AIDashboard] Deleting assistant:', assistantId, 'isCustom:', assistantToDelete?.isCustom);
        
        if (assistantToDelete?.isCustom) {
          const response = await api.deleteAIAssistant(assistantId) as any;
          console.log('[AIDashboard] Delete assistant API response:', response);
          
          if (!response.success) {
            throw new Error(response?.message || 'Failed to delete assistant from server');
          }
          
          await indexedDB.removeAIAssistant(assistantId);
          console.log('[AIDashboard] Assistant removed from IndexedDB');
        }
        
        const updatedAssistants = assistants.filter(a => a.id !== assistantId);
        setAssistants(updatedAssistants);
        console.log('[AIDashboard] Local state updated, remaining assistants:', updatedAssistants.length);
      } catch (error) {
        console.error('Failed to delete assistant:', error);
        alert('Failed to delete assistant. Please try again.');
      }
    }
  };

  const handleSelectAssistant = (assistant: AIAssistant) => {
    setCurrentAssistant(assistant);
    setActiveTab('Chat');
    // If we switch assistant, it's like a new chat with that specific persona
    handleNewChat(assistant);
  };

  const handleNewChat = async (assistant?: AIAssistant) => {
    const targetAssistant = assistant || currentAssistant;
    if (!targetAssistant) {
      alert('No assistant available. Please create or sync an assistant first.');
      return;
    }
    console.log('[AIDashboard] handleNewChat called with assistant:', targetAssistant?.name);
    
    try {
      // Create a new conversation in the backend
      console.log('[AIDashboard] Creating new conversation via API...');
      const response = await api.createAIConversation(targetAssistant.name) as any;
      console.log('[AIDashboard] API response:', response);
      
      if (response.success && response.data) {
        const newConversation = response.data;
        console.log('[AIDashboard] New conversation created:', newConversation.id);
        
        // Cache to IndexedDB
        try {
          await indexedDB.cacheConversation(newConversation);
          console.log('[AIDashboard] Conversation cached to IndexedDB');
        } catch (cacheError) {
          console.warn('Failed to cache new conversation to IndexedDB:', cacheError);
        }
        
        // Add to conversations list at the top
        setConversations(prev => [newConversation, ...prev]);
        
        // Set as current conversation
        setCurrentConversationId(newConversation.id);
        setCurrentConversationMeta({
          provider: newConversation.provider,
          model: newConversation.model,
        });
        
        // Initialize with greeting message
        setChatMessages([
          {
            role: 'model',
            text: `Hello! I'm your ${targetAssistant.name}. ${targetAssistant.description} How can I help you today?`,
            suggestions: [
              { icon: 'edit_note', label: 'Help me write a note' },
              { icon: 'lightbulb', label: 'Brainstorm some ideas' },
              { icon: 'summarize', label: 'Summarize my recent work' }
            ]
          }
        ]);
        
        setActiveTab('Chat');
      } else {
        console.error('[AIDashboard] API returned unsuccessful response:', response);
        throw new Error(response?.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('[AIDashboard] Error creating new conversation:', error);
      // Fallback to local-only mode if API fails
      setCurrentConversationId(null);
      setCurrentConversationMeta(null);
      setChatMessages([
        {
          role: 'model',
          text: `Hello! I'm your ${targetAssistant.name}. ${targetAssistant.description} How can I help you today?`,
          suggestions: [
            { icon: 'edit_note', label: 'Help me write a note' },
            { icon: 'lightbulb', label: 'Brainstorm some ideas' },
            { icon: 'summarize', label: 'Summarize my recent work' }
          ]
        }
      ]);
      setActiveTab('Chat');
    }
  };

  const handleSelectConversation = async (conversation: any) => {
    console.log('[AIDashboard] handleSelectConversation called:', {
      conversationId: conversation.id,
      conversationTitle: conversation.title
    });
    try {
      setCurrentConversationId(conversation.id);
      setCurrentConversationMeta({
        provider: conversation.provider,
        model: conversation.model,
      });
      setActiveTab('Chat');
      console.log('[AIDashboard] Fetching conversation messages...');
      const response = await api.getAIConversation(conversation.id) as any;
      console.log('[AIDashboard] API response:', response);
      if (response.success && response.data) {
        // Map backend messages to ChatMessage interface
        // Backend uses 'assistant', frontend uses 'model' (based on types.ts and current implementation)
        const messages = response.data.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          text: m.content
        }));
        console.log('[AIDashboard] Setting chat messages:', messages);
        setChatMessages(messages);
      } else {
        console.warn('[AIDashboard] No messages data in response');
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  };

  // Chat 操作处理器
  const handleSendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMessage = inputText;
    setInputText('');
    setIsGenerating(true);
    stopSignalRef.current = false;

    const newUserMessage: ChatMessage = { role: 'user', text: userMessage };
    const aiPlaceholderMsg: ChatMessage = { role: 'model', text: '' };
    const updatedMessages = [...chatMessages, newUserMessage, aiPlaceholderMsg];
    setChatMessages(updatedMessages);

    // Determine provider and model from current conversation, assistant, or settings
    let provider: any = currentConversationMeta?.provider;
    let model = currentConversationMeta?.model;

    // Search models to find the correct provider for the current model
    if (model) {
      const dbModel = models.find((m: any) => m.modelId === model);
      if (dbModel) {
        provider = dbModel.provider;
        console.log('[AIDashboard] Model found in cache, using provider:', provider);
      }
    }

    if (!model && currentAssistant?.model) {
      const dbModel = models.find((m: any) => m.modelId === currentAssistant.model);
      if (dbModel) {
        provider = dbModel.provider;
        model = dbModel.modelId;
        console.log('[AIDashboard] Using assistant model config:', { provider, model });
      } else {
        model = currentAssistant.model;
        // Even if not in local cache, let the backend try to resolve it
      }
    }

    if (!model && aiSettings?.defaultModel) {
      const dbModel = models.find((m: any) => m.modelId === aiSettings.defaultModel);
      if (dbModel) {
        provider = dbModel.provider;
        model = dbModel.modelId;
      } else {
        model = aiSettings.defaultModel;
      }
    }

    if (!model && models.length > 0) {
      model = models[0].modelId;
      provider = models[0].provider;
    }

    if (model) {
      const dbModel = models.find((m: any) => m.modelId === model);
      if (dbModel) {
        provider = dbModel.provider;
      }
    }

    if (!model || !provider) {
      setIsGenerating(false);
      stopSignalRef.current = false;
      alert('No available model found. Please add a model first.');
      return;
    }

    // Build messages for API - exclude the AI placeholder
    const messagesForApi = updatedMessages.slice(0, -1);

    // Convert image attachments to base64 for model input
    if (attachments.length > 0) {
      const imageFiles = attachments.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        const imagePayloads = await Promise.all(
          imageFiles.map(async (file, idx) => {
            try {
              const base64 = await readImageAsDataUrl(file);
              return `Image ${idx + 1}: ${file.name}\nMIME: ${file.type}\nBase64: ${base64}`;
            } catch (error) {
              console.error('Failed to read image as base64:', error);
              return null;
            }
          })
        );

        const validPayloads = imagePayloads.filter(Boolean);
        if (validPayloads.length > 0) {
          messagesForApi.unshift({
            role: 'system',
            content: `User provided image data in base64:\n${validPayloads.join('\n\n')}`
          } as any);
        }
      }
    }
    const requestData = {
      provider,
      conversationId: currentConversationId || undefined,
      messages: messagesForApi.map(m => ({
        role: (m.role === 'model' ? 'assistant' : m.role) as any,
        content: m.text
      })),
      options: {
        model
      }
    };

    console.log('[AIDashboard] Sending streaming chat request:', JSON.stringify(requestData, null, 2));

    try {
      // Use streaming API
      let accumulatedText = '';
      let finalConversationId: string | undefined;

      const controller = await api.chatAIStream(
        requestData,
        // onChunk callback
        (chunk, _done, conversationId) => {
          accumulatedText += chunk;
          finalConversationId = conversationId;

          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: accumulatedText };
            return newMessages;
          });
        },
        // onComplete callback
        (conversationId) => {
          console.log('[AIDashboard] Stream complete, conversationId:', conversationId);
          
          // Update conversation meta and ID
          if (conversationId) {
            if (!currentConversationId) {
              setCurrentConversationId(conversationId);
            }
            setCurrentConversationMeta({ provider, model });
          }
        },
        // onError callback
        (error) => {
          console.error('[AIDashboard] Stream error:', error);
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            newMessages[lastMsgIndex] = {
              ...newMessages[lastMsgIndex],
              text: 'Sorry, I encountered an error. Please try again.'
            };
            return newMessages;
          });
        }
      );

      streamAbortControllerRef.current = controller;

      // Wait for stream to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (controller.signal.aborted || stopSignalRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Also set a timeout to avoid hanging
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 120000); // 2 minute timeout
      });

      // Update or create conversation
      if (!currentConversationId && finalConversationId) {
        console.log('[AIDashboard] Setting conversation ID after stream:', finalConversationId);
        setCurrentConversationId(finalConversationId);
      }
      setCurrentConversationMeta({ provider, model });
      
      // Reload conversation history in background
      try {
        await loadConversationHistory();
      } catch (error) {
        console.warn('[AIDashboard] Failed to reload conversation history:', error);
      }
    } catch (error) {
      console.error('[AIDashboard] Error sending message:', error);
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.length - 1;
        newMessages[lastMsgIndex] = {
          ...newMessages[lastMsgIndex],
          text: 'Sorry, I encountered an error. Please try again.'
        };
        return newMessages;
      });
    } finally {
      setIsGenerating(false);
      stopSignalRef.current = false;
      streamAbortControllerRef.current = null;
      setAttachments([]);
    }
  };

  const handleStopGeneration = () => {
    stopSignalRef.current = true;
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
      streamAbortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const readImageAsDataUrl = (file: File, maxSize = 1024, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const mimeType = ['image/jpeg', 'image/webp'].includes(file.type) ? file.type : 'image/png';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceInput = () => {
    console.log('Voice input not implemented yet');
  };

  const handleRenameConversation = (conversationId: string) => {
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle } : c)
      );
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        console.log('[AIDashboard] Deleting conversation:', conversationId);
        const response = await api.deleteAIConversation(conversationId) as any;
        console.log('[AIDashboard] Delete conversation API response:', response);
        
        if (!response.success) {
          throw new Error(response?.message || 'Failed to delete conversation from server');
        }
        
        // Remove from IndexedDB cache to ensure sync consistency
        await indexedDB.removeConversation(conversationId);
        console.log('[AIDashboard] Conversation removed from IndexedDB');
        
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setChatMessages([]);
        }
        console.log('[AIDashboard] Local state updated');
      } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
      }
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'Models':
        return (
           <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
            {/* 标题栏 - 添加新增按钮 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Available Models</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setModelViewMode('grid')}
                    className={`p-1 flex items-center justify-center rounded-md transition-all ${modelViewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setModelViewMode('list')}
                    className={`p-1 flex items-center justify-center rounded-md transition-all ${modelViewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingModel(null);
                  setShowModelForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <span className="material-symbols-outlined">add</span>
                Add Model
              </button>
            </div>

            {loadingProviders ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-gray-500">Loading models...</p>
                </div>
              </div>
            ) : models.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary">neurology</span>
                </div>
                <h3 className="text-xl font-bold mb-2">No Models Available</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  You haven't added any AI models yet. Click the button below to add your first custom model.
                </p>
                <button
                  onClick={() => {
                    setEditingModel(null);
                    setShowModelForm(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                  Add Your First Model
                </button>
              </div>
            ) : modelViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {models.map(model => (
                  <div key={model.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group relative">
                    {/* 编辑/删除按钮 - 悬停显示 */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingModel(model);
                          setShowModelForm(true);
                        }}
                        className="p-1.5 bg-white dark:bg-gray-800 hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                        title="Edit model"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      {model.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModel(model.id);
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Delete model"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-start mb-4 pr-16">
                      <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">neurology</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-500">{model.speed}</span>
                        {model.isCustom && (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">Custom</span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-1">{model.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{model.desc}</p>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">memory</span> {model.context} Context</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">payments</span> {model.cost}</span>
                      {model.defaultTemplateId && (
                        <span className="flex items-center gap-1 text-primary"><span className="material-symbols-outlined text-sm">auto_awesome</span> Has Default Template</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Model Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Provider</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Speed</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Context</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map(model => (
                      <tr key={model.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-sm">neurology</span>
                            </div>
                            <div>
                              <div className="font-bold text-sm">{model.name}</div>
                              {model.defaultTemplateId && (
                                <div className="text-[10px] text-primary flex items-center gap-0.5 mt-0.5">
                                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                  Default Template active
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {model.provider}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500">{model.speed}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500">{model.context}</span>
                        </td>
                        <td className="px-6 py-4">
                          {model.isCustom ? (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold">Custom</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg text-[10px] font-bold">Standard</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingModel(model);
                                setShowModelForm(true);
                              }}
                              className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            {model.isCustom && (
                              <button
                                onClick={() => handleDeleteModel(model.id)}
                                className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
           </div>
        );
      case 'Assistants':
        return (
          <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
            {/* 标题栏 - 添加新增按钮 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Specialized Assistants</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setAssistantViewMode('grid')}
                    className={`p-1 flex items-center justify-center rounded-md transition-all ${assistantViewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setAssistantViewMode('list')}
                    className={`p-1 flex items-center justify-center rounded-md transition-all ${assistantViewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingAssistant(null);
                  setShowAssistantForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <span className="material-symbols-outlined">add</span>
                Create Assistant
              </button>
            </div>

            {assistants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="size-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary">smart_toy</span>
                </div>
                <h3 className="text-xl font-bold mb-2">No Assistants Available</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  You haven't created any AI assistants yet. Click the button below to create your first custom assistant with a specialized role.
                </p>
                <button
                  onClick={() => {
                    setEditingAssistant(null);
                    setShowAssistantForm(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                  Create Your First Assistant
                </button>
              </div>
            ) : assistantViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assistants.map(agent => (
                  <div key={agent.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer text-center group relative">
                    {/* 编辑/删除/设为默认按钮 - 悬停显示 */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {!agent.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefaultAssistant(agent.id);
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-yellow-500 hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Set as Default"
                        >
                          <span className="material-symbols-outlined text-sm">star</span>
                        </button>
                      )}
                      {!agent.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAssistant(agent);
                            setShowAssistantForm(true);
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-primary hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Edit assistant"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                      )}
                      {agent.isCustom && !agent.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssistant(agent.id);
                          }}
                          className="p-1.5 bg-white dark:bg-gray-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors shadow-sm"
                          title="Delete assistant"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>

                    {/* 状态标签 */}
                    <div className="absolute top-4 left-4 flex flex-col gap-1">
                      {agent.isDefault && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">star</span>
                          Default
                        </span>
                      )}
                      {agent.isSystem ? (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg self-start">
                          System
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg self-start">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="size-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4 mt-4">
                      <span className="material-symbols-outlined text-4xl text-primary">{agent.avatar || 'smart_toy'}</span>
                    </div>
                    <h3 className="text-lg font-bold">{agent.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 mt-1">{agent.role}</span>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6">{agent.description}</p>
                    <button
                      onClick={() => handleSelectAssistant(agent)}
                      className="w-full py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Chat with {agent.name.split(' ')[0]}
                    </button>
                    {/* 非悬停状态下的 Start Chat 按钮 */}
                    <button
                      className="w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold group-hover:hidden transition-all"
                    >
                      Select Assistant
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Assistant</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Model</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistants.map(agent => (
                      <tr key={agent.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">{agent.avatar || 'smart_toy'}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{agent.name}</span>
                                {agent.isDefault && (
                                  <span className="material-symbols-outlined text-yellow-500 text-sm">star</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{agent.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase">
                            {agent.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{agent.category || 'General'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">{agent.model || 'Default'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSelectAssistant(agent)}
                              className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors mr-2 opacity-0 group-hover:opacity-100"
                            >
                              Chat
                            </button>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              {!agent.isDefault && (
                                <button
                                  onClick={() => handleSetDefaultAssistant(agent.id)}
                                  className="p-1.5 hover:bg-yellow-500/10 hover:text-yellow-500 rounded-lg transition-colors"
                                  title="Set as Default"
                                >
                                  <span className="material-symbols-outlined text-sm">star</span>
                                </button>
                              )}
                              {!agent.isSystem && (
                                <button
                                  onClick={() => {
                                    setEditingAssistant(agent);
                                    setShowAssistantForm(true);
                                  }}
                                  className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                              )}
                              {agent.isCustom && !agent.isSystem && (
                                <button
                                  onClick={() => handleDeleteAssistant(agent.id)}
                                  className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'Chat':
      default:
        return (
          <>
            <main className="flex-1 overflow-y-auto p-12 scrollbar-hide w-full animate-in fade-in duration-300">
              <div className="max-w-4xl mx-auto space-y-10">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.role === 'model' ? 'bg-primary/10 text-primary' : 'bg-amber-100 border-2 border-amber-200'
                    }`}>
                      <span className="material-symbols-outlined text-xl">
                        {msg.role === 'model' ? 'robot_2' : 'person'}
                      </span>
                    </div>
                    
                    <div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                      <div className={`p-6 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none shadow-primary/20' 
                          : 'bg-gray-50 dark:bg-gray-800/50 rounded-tl-none border border-gray-100 dark:border-gray-700'
                      }`}>
                        {msg.text}
                        
                        {msg.type === 'checklist' && (
                          <div className="mt-6 p-6 bg-white dark:bg-[#15232a] rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                            {msg.items?.map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={item.checked} 
                                  readOnly
                                  className="size-5 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className={item.checked ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {msg.suggestions && (
                        <div className="flex gap-3">
                          {msg.suggestions.map((s) => (
                            <button 
                              key={s.label} 
                              onClick={() => setInputText(s.label)}
                              className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold hover:shadow-md hover:border-primary/50 transition-all"
                            >
                              <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.type === 'checklist' && (
                        <div className="flex items-center gap-4 text-[10px] font-bold text-primary uppercase tracking-widest pl-2">
                          <button className="flex items-center gap-1 hover:underline">
                            <span className="material-symbols-outlined text-xs">description</span> Copy to Note
                          </button>
                          <div className="w-px h-3 bg-gray-200 dark:bg-gray-700"></div>
                          <button className="flex items-center gap-1 hover:underline">
                            <span className="material-symbols-outlined text-xs">picture_as_pdf</span> Export PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </main>

            {/* Input Bar - 增强版 */}
            <div className="p-8 w-full">
              <div className="max-w-4xl mx-auto">
                {/* 当前模型和助手信息 */}
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    <span>{currentModelLabel}</span>
                    <span>•</span>
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    <span>{currentAssistantLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('Assistants')}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs hover:border-primary/50 transition-all"
                      title="Change assistant"
                    >
                      <span className="material-symbols-outlined text-sm">swap_horiz</span>
                      Change
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-4 shadow-xl shadow-gray-200/20 dark:shadow-none">
                  {/* 文本输入区 */}
                  <textarea
                    rows={2}
                    className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none p-2 pr-24"
                    placeholder="Message your AI Assistant..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  {/* 工具栏 */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      {/* 附件按钮 */}
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                      />
                      <label
                        htmlFor="file-upload"
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                        title="Attach files"
                      >
                        <span className="material-symbols-outlined">attach_file</span>
                      </label>

                      {/* 图片按钮 */}
                      <input
                        type="file"
                        id="image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      <label
                        htmlFor="image-upload"
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                        title="Upload image"
                      >
                        <span className="material-symbols-outlined">image</span>
                      </label>

                      {/* 语音按钮 */}
                      <button
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Voice input"
                        onClick={handleVoiceInput}
                      >
                        <span className="material-symbols-outlined">mic</span>
                      </button>
                    </div>

                    {/* 发送/停止按钮 */}
                    {isGenerating ? (
                      <button
                        onClick={handleStopGeneration}
                        className="px-4 h-10 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                      >
                        <span className="material-symbols-outlined">stop</span>
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim()}
                        className="px-4 h-10 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <span className="material-symbols-outlined">send</span>
                        Send
                      </button>
                    )}
                  </div>

                  {/* 附件预览区 */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                        >
                          <span className="material-symbols-outlined text-sm text-primary">description</span>
                          <span className="max-w-[150px] truncate">{file.name}</span>
                          <button
                            onClick={() => removeAttachment(index)}
                            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <span className="material-symbols-outlined text-sm text-gray-400">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-4">
                  Powered by multiple AI providers. Always check important information.
                </p>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      {/* 模型表单 */}
      {showModelForm && (
        <ModelForm
          model={editingModel}
          onSave={handleSaveModel}
          onClose={() => {
            setShowModelForm(false);
            setEditingModel(null);
          }}
        />
      )}

      {/* 助手表单 */}
      {showAssistantForm && (
        <AssistantForm
          assistant={editingAssistant}
          onSave={handleSaveAssistant}
          onClose={() => {
            setShowAssistantForm(false);
            setEditingAssistant(null);
          }}
        />
      )}

      <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#0c1419]">
        {/* Left History Sidebar - Only visible in Chat mode */}
      {activeTab === 'Chat' && (
        <aside className="w-72 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/20 dark:bg-background-dark/50 shrink-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => handleNewChat()}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span> New Chat
            </button>
          </div>

          {/* 搜索和排序 */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
            {/* 搜索框 */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* 排序选项 */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 bg-white dark:bg-[#1c2b33] border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="updated">Recent</option>
                <option value="created">Created</option>
                <option value="name">Name</option>
                <option value="messages">Messages</option>
              </select>
            </div>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                  <p className="text-xs text-gray-400">Loading...</p>
                </div>
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                  <span>Conversations</span>
                  <span className="text-gray-500 font-normal">{filteredConversations.length}</span>
                </h3>

                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3 rounded-xl cursor-pointer transition-all group ${
                      currentConversationId === conv.id
                        ? 'bg-primary text-white shadow-md'
                        : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${
                          currentConversationId === conv.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {conv.title || 'Untitled'}
                        </h4>
                        <p className={`text-[10px] mt-1 truncate ${
                          currentConversationId === conv.id ? 'text-white/70' : 'text-gray-400'
                        }`}>
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>

                      {/* 操作按钮（悬停显示） */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameConversation(conv.id);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Rename"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-500 rounded"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[12px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <p className={`text-[9px] mt-2 ${
                      currentConversationId === conv.id ? 'text-white/50' : 'text-gray-400'
                    }`}>
                      {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messageCount || 0} messages
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-700">
                  search_off
                </span>
                <p className="text-xs text-gray-400 mt-2">No conversations found</p>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
            <h2 className="text-lg font-bold">AI Dashboard</h2>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {['Models', 'Assistants', 'Chat'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="w-24"></div> {/* Spacer for symmetry */}
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {renderContent()}
        </div>
      </div>
      </div>
    </>
  );
};

export default AIDashboard;
