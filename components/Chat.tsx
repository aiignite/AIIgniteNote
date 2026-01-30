import React, { useEffect, useState, useRef } from 'react';
import { socketService, ChatMessage as SocketMessage } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { api, ChatRoom, ChatMessage } from '../services/api';

type TabType = 'messages' | 'contacts';

const logDebug = (msg: string, data?: any) => {
  console.log(`[Chat Debug] ${msg}`, data || '');
};

export const Chat: React.FC = () => {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Data State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Draggable position state
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default: bottom-right (24px from edges)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Initialize Socket & Listeners
  useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinChat(user.id, user.username || user.email || 'User');
    }

    const unsubscribe = socketService.onMessage((message) => {
      // If message belongs to current open room
      if (currentRoom && message.roomId === currentRoom.id) {
        setMessages((prev) => [...prev, message as any]); // Type cast for compatibility
      } else {
        // Increment unread count if we are not in that room
        // If window is closed or minimized, increment global unread
        if (!isOpen || isMinimized) {
          setUnreadCount((prev) => prev + 1);
        }
        // Also refresh room list to show updated last message
        loadRooms();
      }
    });

    const unsubscribeOnline = socketService.onOnlineUsers((users) => {
      setOnlineUsers(users);
    });

    return () => {
      unsubscribe();
      unsubscribeOnline();
      socketService.disconnect();
    };
  }, [user, currentRoom, isOpen, isMinimized]);

  // Load Rooms State
  const loadRooms = async () => {
      if (!user) return;
      try {
          const res = await api.getRooms();
          if (res.success) {
              setRooms(res.data);
          }
      } catch (e) { console.error("Failed to load rooms", e); }
  };

  useEffect(() => {
      if (isOpen && user) {
          loadRooms();
      }
  }, [isOpen, user]);

  // Load Messages for Room
  useEffect(() => {
      if (currentRoom) {
          api.getRoomMessages(currentRoom.id).then(res => {
              if (res.success) {
                  // Messages from API are desc (newest first), reverse for chat view (oldest top)
                  setMessages(res.data.reverse());
                  socketService.joinRoom(currentRoom.id);
              }
          });
      } else {
          setMessages([]);
      }
  }, [currentRoom]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  // Draggable Logic (Preserved)
  useEffect(() => {
    if (!dragRef.current || isDragging) return;
    
    const adjustPosition = () => {
      if (!dragRef.current) return;
      const rect = dragRef.current.getBoundingClientRect();
      const isFullyVisible = rect.top >= 0 && rect.left >= 0 && 
                            rect.bottom <= window.innerHeight && 
                            rect.right <= window.innerWidth;
      
      if (isFullyVisible) return;
      
      const width = rect.width;
      const height = rect.height;
      const currentLeft = window.innerWidth - position.x - width;
      const currentTop = window.innerHeight - position.y - height;
      let newLeft = currentLeft;
      let newTop = currentTop;
      
      if (rect.left < 0) newLeft = 0;
      if (rect.top < 0) newTop = 0;
      if (rect.right > window.innerWidth) newLeft = window.innerWidth - width;
      if (rect.bottom > window.innerHeight) newTop = window.innerHeight - height;
      
      newLeft = Math.max(0, newLeft);
      newTop = Math.max(0, newTop);
      
      if (Math.abs(newLeft - currentLeft) > 1 || Math.abs(newTop - currentTop) > 1) {
        const newRight = window.innerWidth - newLeft - width;
        const newBottom = window.innerHeight - newTop - height;
        setPosition({ x: Math.max(0, newRight), y: Math.max(0, newBottom) });
      }
    };
    
    const timeout = setTimeout(adjustPosition, 100);
    return () => clearTimeout(timeout);
  }, [isOpen, isMinimized, activeTab, isDragging, currentRoom]); // Added currentRoom dep to resize if needed

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const rect = dragRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      let newLeft = e.clientX - dragOffset.x;
      let newTop = e.clientY - dragOffset.y;
      const rect = dragRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - width));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - height));
      const newRight = window.innerWidth - newLeft - width;
      const newBottom = window.innerHeight - newTop - height;
      setPosition({ x: newRight, y: newBottom });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const distanceMoved = Math.sqrt(Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2));
        if (distanceMoved < 5 && !isOpen) {
          setIsOpen(true);
          setIsMinimized(false);
        }
      }
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, dragStart, isOpen, isMinimized]);

  // Actions
  const handleStartChat = async (targetUserId: string) => {
      try {
          const res = await api.startDirectChat(targetUserId);
          if (res.success) {
              setCurrentRoom(res.data);
              setActiveTab('messages');
              loadRooms(); // Refresh list
          }
      } catch (e) { console.error(e); }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || !currentRoom) return;

    const message = {
      id: Date.now().toString(), // temporary ID
      senderId: user.id,
      senderName: user.username || user.email || 'User',
      content: inputValue,
      roomId: currentRoom.id,
      timestamp: new Date().toISOString(),
    };

    socketService.sendMessage(message);
    setInputValue('');
  };

  const handleFileSelect = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Basic file handler mock
      alert('文件上传功能待完善');
  };
  const handleEmojiClick = () => setInputValue(prev => prev + '😊');
  const handleScreenshot = () => alert('截图功能即将上线！');
  const handleHistory = () => alert('已显示历史记录');

  // Render Logic
  if (!isOpen) {
    return (
      <div
        ref={dragRef}
        style={{
          position: 'fixed',
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        className="z-50"
      >
        <button
          onMouseDown={handleMouseDown}
          className="relative w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          title="即时通讯 (可拖动)"
        >
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      style={{
        position: 'fixed',
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        touchAction: 'none',
      }}
      className={`bg-white rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200 transition-all duration-200 ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        className="bg-gradient-to-r from-green-400 to-green-500 px-4 py-3 text-white flex justify-between items-center"
      >
        <div className="flex items-center space-x-3">
          {currentRoom && !isMinimized ? (
             <button onClick={() => setCurrentRoom(null)} className="mr-1 hover:bg-green-600 rounded p-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                 </svg>
             </button>
          ) : null}
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">
                {currentRoom ? (
                    currentRoom.type === 'DIRECT' 
                    ? currentRoom.members.find(m => m.userId !== user?.id)?.user.name || 'Chat'
                    : currentRoom.name || 'Group Chat'
                ) : '消息列表'}
            </h3>
            <p className="text-xs text-green-100">
                {currentRoom ? '在线' : '在线聊天'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
           <button onClick={() => setIsMinimized(!isMinimized)} className="text-white hover:bg-green-600 rounded p-1">
             {isMinimized ? '+' : '-'}
           </button>
           <button onClick={() => setIsOpen(false)} className="text-white hover:bg-green-600 rounded p-1">×</button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Main Content */}
          {!currentRoom ? (
            <>
              {/* Tab Nav */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === 'messages' ? 'text-green-600 border-b-2 border-green-500 bg-white' : 'text-gray-600'
                  }`}
                >
                  消息
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === 'contacts' ? 'text-green-600 border-b-2 border-green-500 bg-white' : 'text-gray-600'
                  }`}
                >
                  联系人
                </button>
              </div>

              {activeTab === 'messages' ? (
                  <div className="flex-1 overflow-y-auto bg-white">
                      {rooms.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无聊天记录</div>
                      ) : (
                          rooms.map(room => {
                              const otherMember = room.members.find(m => m.userId !== user?.id);
                              const name = room.type === 'DIRECT' ? otherMember?.user.name : room.name;
                              return (
                                  <div key={room.id} onClick={() => setCurrentRoom(room)} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                          {name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                          <div className="font-medium text-sm text-gray-800">{name}</div>
                                          <div className="text-xs text-gray-500">点击进入聊天</div>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              ) : (
                  <div className="flex-1 overflow-y-auto bg-white">
                      {onlineUsers.map((u: any) => (
                          <div key={u.userId} onClick={() => handleStartChat(u.userId)} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                                  {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <div className="font-medium text-sm text-gray-800">{u.name} {u.userId === user?.id && '(你)'}</div>
                                  <div className="text-xs text-green-500">在线</div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
            </>
          ) : (
             /* Chat Room View */
             <>
               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start space-x-2`}>
                        {!isOwn && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                            {(msg.sender?.name || (msg as any).senderName || msg.senderId).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          <div className={`rounded-lg px-3 py-2 text-sm break-words ${isOwn ? 'bg-green-500 text-white' : 'bg-white border border-gray-200'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
               </div>
               
               {/* Input Area */}
               <form onSubmit={handleSend} className="p-3 bg-white border-t flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="输入消息..."
                  />
                  <button type="submit" disabled={!inputValue.trim()} className="bg-green-500 text-white px-4 py-2 rounded-md text-sm">发送</button>
               </form>
             </>
          )}
        </>
      )}
    </div>
  );
};
