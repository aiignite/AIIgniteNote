
import React, { useState, useRef, useEffect } from 'react';
import { Note, ChatMessage } from '../types';
import { generateAIResponse } from '../services/gemini';

interface AIPanelProps {
  activeNote: Note | null;
  onClose: () => void;
}

const AIPanel: React.FC<AIPanelProps> = ({ activeNote, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I've analyzed your current note. How can I help you today?", type: 'text' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await generateAIResponse(input, activeNote?.content);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  const smartActions = [
    { label: 'Summarize action items', icon: 'check_circle' },
    { label: 'Generate a mind map', icon: 'account_tree' },
    { label: 'Translate to 12 languages', icon: 'translate' },
  ];

  return (
    <aside className="w-80 flex flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0c1419] shrink-0">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#15232a]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">auto_awesome</span>
          <h2 className="text-sm font-bold uppercase tracking-wider">AI Assistant</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-sm">robot_2</span>
              </div>
            )}
            <div className={`p-3 rounded-xl text-sm leading-relaxed max-w-[85%] ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none text-gray-700 dark:text-gray-300'
            }`}>
              {msg.text}
              {idx === 0 && (
                <ul className="mt-2 space-y-1 list-none">
                  {smartActions.map(action => (
                    <li 
                      key={action.label} 
                      onClick={() => setInput(action.label)}
                      className="flex items-center gap-1 text-primary cursor-pointer hover:underline"
                    >
                      <span className="material-symbols-outlined text-xs">{action.icon}</span>
                      {action.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
             <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 animate-pulse">
                <span className="material-symbols-outlined text-sm">robot_2</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl rounded-tl-none text-sm animate-pulse">
                Thinking...
              </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="relative">
          <textarea 
            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm p-3 pr-10 resize-none focus:ring-1 focus:ring-primary min-h-[80px]" 
            placeholder="Ask anything about your notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          />
          <button 
            onClick={handleSend}
            className="absolute bottom-3 right-3 text-primary hover:text-primary/80"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">AI can make mistakes. Always check important info.</p>
      </div>
    </aside>
  );
};

export default AIPanel;
