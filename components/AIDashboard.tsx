
import React, { useState } from 'react';
import { ChatMessage } from '../types';

const AIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Models' | 'Assistants' | 'Chat'>('Chat');
  const [inputText, setInputText] = useState('');

  // ... (Data Constants kept same as before for brevity, logic is the focus)
  const chatHistory = [
    { title: 'Analyzing Product Roadmap 2024', time: '2 mins ago', active: true },
    { title: 'React Hooks Best Practices', time: '1 hour ago', active: false },
    { title: 'Campaign Strategy: Blue Horizon', time: 'Yesterday', active: false },
    { title: 'Market Research - Q4', time: 'Yesterday', active: false },
  ];

  const messages: ChatMessage[] = [
    {
      role: 'model',
      text: "I've reviewed your recent notes on the Product Roadmap 2024. It looks like you're focusing on AI-driven productivity for Q1.",
      suggestions: [
        { label: 'Generate Action Items', icon: 'format_list_bulleted' },
        { label: 'Visualize as Mind Map', icon: 'account_tree' },
      ]
    },
    {
      role: 'user',
      text: "Can you extract all the Q1 focus points into a checklist? I need to share this with the engineering team tomorrow morning."
    },
    {
      role: 'model',
      text: "Certainly! Here are the core focus points for Q1 extracted from your roadmap:",
      type: 'checklist',
      items: [
        { label: 'Integrate GPT-4 Turbo for summarization', checked: true },
        { label: 'Real-time voice-to-text transcription', checked: false },
        { label: 'Semantic search implementation', checked: false },
        { label: 'Speaker identification in transcripts', checked: false },
      ]
    }
  ];

  const models = [
    { id: 'gemini-pro', name: 'Gemini 3 Pro', desc: 'Best for complex reasoning & coding', speed: 'Fast', cost: '$$', context: '2M' },
    { id: 'gemini-flash', name: 'Gemini 3 Flash', desc: 'Lightning fast for daily tasks', speed: 'Ultra Fast', cost: '$', context: '1M' },
    { id: 'gpt-4', name: 'GPT-4o', desc: 'Versatile problem solver', speed: 'Fast', cost: '$$$', context: '128K' },
    { id: 'claude', name: 'Claude 3.5 Sonnet', desc: 'Excellent at creative writing', speed: 'Moderate', cost: '$$', context: '200K' },
  ];

  const assistants = [
    { id: 'coder', name: 'Code Architect', role: 'Engineering', desc: 'Specialized in React, Python, and System Design patterns.', avatar: 'code' },
    { id: 'writer', name: 'Copy Editor', role: 'Marketing', desc: 'Refines tone, grammar, and SEO optimization for content.', avatar: 'edit' },
    { id: 'data', name: 'Data Analyst', role: 'Business', desc: 'Converts raw CSV/JSON data into actionable insights.', avatar: 'analytics' },
    { id: 'pm', name: 'Product Lead', role: 'Product', desc: 'Helps with PRDs, user stories, and roadmap prioritization.', avatar: 'rocket_launch' },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'Models':
        return (
           <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold mb-6">Available Models</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {models.map(model => (
                <div key={model.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined">neurology</span>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-500">{model.speed}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{model.name}</h3>
                  <p className="text-sm text-gray-500 mb-6">{model.desc}</p>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">memory</span> {model.context} Context</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">payments</span> {model.cost}</span>
                  </div>
                </div>
              ))}
            </div>
           </div>
        );
      case 'Assistants':
        return (
          <div className="p-12 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold mb-6">Specialized Assistants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assistants.map(agent => (
                <div key={agent.id} className="bg-white dark:bg-[#15232a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer text-center">
                  <div className="size-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-primary">{agent.avatar}</span>
                  </div>
                  <h3 className="text-lg font-bold">{agent.name}</h3>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 mt-1">{agent.role}</span>
                  <p className="text-sm text-gray-500">{agent.desc}</p>
                  <button className="mt-6 w-full py-2 rounded-xl bg-primary/10 text-primary text-sm font-bold hover:bg-primary hover:text-white transition-all">Start Chat</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Chat':
      default:
        return (
          <>
            <main className="flex-1 overflow-y-auto p-12 scrollbar-hide w-full animate-in fade-in duration-300">
              <div className="max-w-4xl mx-auto space-y-10">
                {messages.map((msg, idx) => (
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
                            <button key={s.label} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold hover:shadow-md hover:border-primary/50 transition-all">
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

            {/* Input Bar */}
            <div className="p-8 w-full">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-4 shadow-xl shadow-gray-200/20 dark:shadow-none flex flex-col gap-4">
                  <textarea 
                    rows={2}
                    className="w-full bg-transparent border-none focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none p-2"
                    placeholder="Message your AI Assistant..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">attach_file</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">image</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">mic</span>
                      </button>
                    </div>
                    <button className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-4">
                  Powered by GPT-4o. Always check important information.
                </p>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white dark:bg-[#0c1419]">
      {/* Left History Sidebar - Only visible in Chat mode */}
      {activeTab === 'Chat' && (
        <aside className="w-72 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/20 dark:bg-background-dark/50 shrink-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <button className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">add</span> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Today</h3>
              <div className="space-y-2">
                {chatHistory.slice(0, 2).map((item) => (
                  <div 
                    key={item.title}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      item.active 
                        ? 'bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700' 
                        : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <h4 className="text-xs font-bold truncate">{item.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Yesterday</h3>
              <div className="space-y-2">
                {chatHistory.slice(2).map((item) => (
                  <div key={item.title} className="p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50 cursor-pointer transition-all">
                    <h4 className="text-xs font-bold truncate text-gray-600 dark:text-gray-400">{item.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{item.time}</p>
                  </div>
                ))}
              </div>
            </div>
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
  );
};

export default AIDashboard;
