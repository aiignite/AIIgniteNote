
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, ChatMessage } from '../types';
import { streamAIResponse, generateAIResponse } from '../services/gemini';
import { GenerateContentResponse } from "@google/genai";

interface AIPanelProps {
  activeNote: Note | null;
  onClose: () => void;
  width?: number;
}

const ASSISTANTS = [
  { id: 'general', name: 'General Assistant', icon: 'auto_awesome', role: 'General', desc: 'Helpful for any task' },
  { id: 'coder', name: 'Code Architect', icon: 'code', role: 'Engineering', desc: 'Expert in software design' },
  { id: 'writer', name: 'Copy Editor', icon: 'edit_note', role: 'Marketing', desc: 'Refines tone & grammar' },
  { id: 'data', name: 'Data Analyst', icon: 'analytics', role: 'Business', desc: 'Insights from data' },
  { id: 'pm', name: 'Product Lead', icon: 'rocket_launch', role: 'Product', desc: 'Strategy & prioritization' },
];

const AIPanel: React.FC<AIPanelProps> = ({ activeNote, onClose, width }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I've analyzed your current note. How can I help you today?", type: 'text' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Assistant Dropdown State
  const [currentAssistant, setCurrentAssistant] = useState(ASSISTANTS[0]);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  
  // Refs
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopSignalRef = useRef(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAssistantMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Adjust textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Calculate new height, capped at 200px
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userPrompt = input;
    const userMsg: ChatMessage = { role: 'user', text: userPrompt };
    
    // Optimistic UI updates
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    // Reset height of textarea after sending
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    setLoading(true);
    setIsStreaming(true);
    stopSignalRef.current = false;

    // Add placeholder for AI response
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      // Start Streaming
      const stream = await streamAIResponse(userPrompt, activeNote?.content);
      
      let fullText = '';
      
      for await (const chunk of stream) {
        // Check for stop signal
        if (stopSignalRef.current) {
          break;
        }

        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          
          setMessages(prev => {
             const newMessages = [...prev];
             // Update the last message (which is the AI model placeholder)
             const lastMsgIndex = newMessages.length - 1;
             newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: fullText };
             return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Generation Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error generating the response." }]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      stopSignalRef.current = false;
    }
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setIsStreaming(false);
    setLoading(false);
  };

  const handleAssistantSelect = (assistant: typeof ASSISTANTS[0]) => {
    setCurrentAssistant(assistant);
    setShowAssistantMenu(false);
    setMessages(prev => [...prev, { 
      role: 'model', 
      text: `Switched to **${assistant.name}**. I'm ready to help with ${assistant.role.toLowerCase()} tasks.`,
      type: 'text'
    }]);
  };

  const smartActions = [
    { label: 'Summarize action items', icon: 'check_circle' },
    { label: 'Generate a mind map', icon: 'account_tree' },
    { label: 'Translate to 12 languages', icon: 'translate' },
  ];

  return (
    <aside 
      className="flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c1419] shrink-0 transition-none"
      style={{ width: width ? `${width}px` : '320px' }}
    >
      {/* Header with Dropdown */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#15232a] relative z-20">
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowAssistantMenu(!showAssistantMenu)}
            className="flex items-center gap-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 p-1.5 -ml-1.5 rounded-lg transition-colors group"
          >
             <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">{currentAssistant.icon}</span>
             </div>
             <div className="flex flex-col items-start">
               <span className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">{currentAssistant.name}</span>
               <span className="text-[9px] text-gray-400 font-medium">{currentAssistant.role}</span>
             </div>
             <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-200 ${showAssistantMenu ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {/* Dropdown Menu */}
          {showAssistantMenu && (
             <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1c2b33] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">Select Assistant</p>
                  {ASSISTANTS.map(ast => (
                      <button 
                        key={ast.id}
                        onClick={() => handleAssistantSelect(ast)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-lg transition-colors ${
                          currentAssistant.id === ast.id 
                            ? 'bg-primary/5 dark:bg-primary/10' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg ${currentAssistant.id === ast.id ? 'text-primary' : 'text-gray-400'}`}>{ast.icon}</span>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <p className={`text-sm ${currentAssistant.id === ast.id ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{ast.name}</p>
                              {currentAssistant.id === ast.id && <span className="material-symbols-outlined text-primary text-sm">check</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 line-clamp-1">{ast.desc}</p>
                        </div>
                      </button>
                  ))}
                </div>
             </div>
          )}
        </div>

        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">{currentAssistant.icon}</span>
              </div>
            )}
            <div className={`p-3 rounded-xl text-sm leading-relaxed max-w-[90%] break-words ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none text-gray-800 dark:text-gray-200 prose dark:prose-invert prose-sm max-w-none'
            }`}>
              {msg.role === 'model' ? (
                <ReactMarkdown
                   components={{
                     p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                     ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                     ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                     code: ({children}) => <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>,
                     pre: ({children}) => <pre className="bg-black/10 dark:bg-black/30 p-2 rounded-md overflow-x-auto text-xs my-2">{children}</pre>
                   }}
                >
                  {msg.text}
                </ReactMarkdown>
              ) : (
                msg.text
              )}
              
              {idx === 0 && (
                <ul className="mt-3 space-y-1.5 list-none border-t border-black/10 dark:border-white/10 pt-2">
                  {smartActions.map(action => (
                    <li 
                      key={action.label} 
                      onClick={() => setInput(action.label)}
                      className="flex items-center gap-1.5 text-primary cursor-pointer hover:underline text-xs font-medium"
                    >
                      <span className="material-symbols-outlined text-sm">{action.icon}</span>
                      {action.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {loading && !isStreaming && (
          <div className="flex gap-2">
             <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 animate-pulse">
                <span className="material-symbols-outlined text-sm">{currentAssistant.icon}</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl rounded-tl-none text-sm animate-pulse text-gray-500">
                Thinking...
              </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="relative">
          <textarea 
            ref={textareaRef}
            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm p-3 pr-10 resize-none focus:ring-1 focus:ring-primary overflow-hidden min-h-[44px]" 
            placeholder={`Ask ${currentAssistant.name}...`}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          
          {isStreaming ? (
            <button 
              onClick={handleStop}
              className="absolute bottom-2.5 right-2 size-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              title="Stop generation"
            >
              <span className="material-symbols-outlined text-lg">stop_circle</span>
            </button>
          ) : (
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute bottom-2.5 right-2 size-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">arrow_upward</span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">AI can make mistakes. Always check important info.</p>
      </div>
    </aside>
  );
};

export default AIPanel;
