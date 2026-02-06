import React, { useEffect, useState, useRef } from 'react';
import { socketService, ChatMessage as SocketMessage } from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { api, ChatRoom, ChatMessage, ChatFileItem, ChatUser, Note as ApiNote } from '../services/api';

type TabType = 'messages' | 'contacts';
type EmojiCategory = 'smileys' | 'people' | 'food' | 'objects' | 'symbols';

const EMOJI_MAP = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '😍', '🥰', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤐', '🤨', '😏', '😒'],
  people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '👊', '✊', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '🙏', '💅', '🦾', '🦿', '👂'],
  food: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞'],
  objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎬', '📺', '📷', '📸', '📹', '🎞️', '📽️', '🎦', '📞', '☎️', '📟', '📠', '📺'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🧡', '💛', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✌️', '☸️', '✡️', '☬️', '♈️', '🔯', '✝️', '⭐', '🌟', '✨', '⚡']
};

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
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUploadNotif, setShowUploadNotif] = useState(false);
  const [mentionDropdown, setMentionDropdown] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>('smileys');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Record<string, boolean>>({});
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupManageModal, setShowGroupManageModal] = useState(false);
  const [groupNameEdit, setGroupNameEdit] = useState('');
  const [groupAddSelections, setGroupAddSelections] = useState<Record<string, boolean>>({});
  const [savingGroup, setSavingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [roomFiles, setRoomFiles] = useState<ChatFileItem[]>([]);
  const [filesCursor, setFilesCursor] = useState<string | null>(null);
  const [filesHasMore, setFilesHasMore] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesPurging, setFilesPurging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const { user } = useAuthStore();
  const { getTheme } = useThemeStore();
  const theme = getTheme();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3215`;
  const FILE_BASE_URL = API_BASE_URL;
  
  // Draggable position state
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default: bottom-right (24px from edges)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

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

      const loadChatUsers = async () => {
        if (!user) return;
        try {
          const res = await api.getChatUsers();
          if (res.success) {
            setChatUsers(res.data);
          }
        } catch (e) { console.error('Failed to load chat users', e); }
      };

      const openGroupModal = async () => {
        setShowGroupModal(true);
        await loadChatUsers();
      };

      const syncLatestMessages = async () => {
      if (!currentRoom || messages.length === 0) return;
      const last = messages[messages.length - 1] as any;
      const lastTime = last.timestamp || last.createdAt;
      if (!lastTime) return;
      try {
        const res = await api.getRoomMessages(currentRoom.id, { since: lastTime });
        if (res.success && res.data.length > 0) {
          const incoming = res.data.slice().reverse();
          setMessages(prev => [...prev, ...incoming]);
          api.markRoomRead(currentRoom.id).then(loadRooms).catch(() => undefined);
        }
      } catch (e) {
        console.error('Sync latest messages failed:', e);
      }
    };

    // Initialize Socket & Listeners
    useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinChat(user.id, user.name || user.email || 'User');
    }

    const unsubscribe = socketService.onMessage((message) => {
      // If message belongs to current open room
      if (currentRoom && message.roomId === currentRoom.id) {
        setMessages((prev) => [...prev, message as any]); // Type cast for compatibility
        api.markRoomRead(currentRoom.id).then(loadRooms).catch(() => undefined);
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

    const unsubscribeConnect = socketService.onConnect(() => {
      if (currentRoom) {
        socketService.joinRoom(currentRoom.id);
        syncLatestMessages();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOnline();
      unsubscribeConnect();
      socketService.disconnect();
    };
  }, [user, currentRoom, isOpen, isMinimized]);

  useEffect(() => {
      if (isOpen && user) {
          loadRooms();
        loadChatUsers();
      }
  }, [isOpen, user]);

  // Load Messages for Room
    useEffect(() => {
      if (currentRoom) {
        setSearchActive(false);
        setSearchQuery('');
        loadRoomMessages({});
        loadPinnedMessage();
      } else {
        setMessages([]);
        setHistoryCursor(null);
        setHasMoreHistory(false);
        setPinnedMessage(null);
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
  
  // Start self-chat (for note-taking)
  const handleSelfChat = async () => {
      if (!user) return;
      try {
          const res = await api.startDirectChat(user.id);
          if (res.success) {
              setCurrentRoom(res.data);
              setActiveTab('messages');
              loadRooms(); // Refresh list
          }
      } catch (e) { console.error(e); }
  };
  
  // Upload file to server
  const handleFileUpload = async (file: File): Promise<string | null> => {
      if (!user || !currentRoom) return null;
      
      try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('roomId', currentRoom.id);
          
          const response = await fetch(`${API_BASE_URL}/api/chats/upload`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${api.getToken()}`
              },
              body: formData
          });
          
          if (response.ok) {
              const result = await response.json();
              return result.data?.fileUrl || null;
          } else {
              // 解析错误信息
              try {
                  const errorResult = await response.json();
                  console.error('Upload failed:', errorResult);
                  throw new Error(errorResult.error?.message || '上传失败');
              } catch {
                  throw new Error(`上传失败 (${response.status})`);
              }
          }
      } catch (e) {
          console.error('File upload failed:', e);
          throw e; // 重新抛出以便调用方处理
      }
  };
  
  // 获取或创建"即时通讯文件"文件夹
  const getOrCreateChatFolder = async (): Promise<string | undefined> => {
      try {
          // 获取所有文件夹
          const foldersRes = await api.getFolders();
          if (foldersRes.success && Array.isArray(foldersRes.data)) {
              // 查找是否已存在"即时通讯文件"文件夹
              const chatFolder = foldersRes.data.find((f: any) => f.name === '即时通讯文件');
              if (chatFolder) {
                  return chatFolder.id;
              }
          }
          
          // 如果不存在，创建新文件夹
          const createRes = await api.createFolder({ name: '即时通讯文件' });
          if (createRes.success && createRes.data) {
              return createRes.data.id;
          }
          
          return undefined;
      } catch (e) {
          console.error('Failed to get or create chat folder:', e);
          return undefined;
      }
  };
  
  // Save chat history to note
  const handleSaveToNote = async () => {
      if (!user || !currentRoom || messages.length === 0) {
          alert('没有可保存的聊天记录');
          return;
      }
      
      try {
          // 获取或创建"即时通讯文件"文件夹
          const folderId = await getOrCreateChatFolder();
          
          // Format chat history as markdown
          const chatContent = messages.map(msg => {
              const senderName = msg.sender?.name || (msg as any).senderName || 'User';
              const time = new Date(msg.timestamp).toLocaleString('zh-CN');
              // 处理文件消息
              if (msg.type === 'FILE' && msg.fileUrl) {
                  const fileLink = msg.fileUrl.startsWith('http') ? msg.fileUrl : `${FILE_BASE_URL}${msg.fileUrl}`;
                  return `## ${senderName} (${time})\n📎 [${msg.fileName || msg.content}](${fileLink})\n`;
              }
              return `## ${senderName} (${time})\n${msg.content}\n`;
          }).join('\n---\n\n');
          
          const noteTitle = `聊天记录 - ${currentRoom.type === 'DIRECT' 
              ? (currentRoom.members.find(m => m.userId !== user.id)?.user.name || '自记') 
              : (currentRoom.name || '群聊')} - ${new Date().toLocaleDateString('zh-CN')}`;
          
          const res = await api.createNote({
              title: noteTitle,
              noteType: 'MARKDOWN',
              content: chatContent,
              folderId: folderId
          });
          
          if (res.success) {
              alert(`✅ 已保存为笔记: ${noteTitle}\n📁 文件夹: 即时通讯文件`);
          } else {
              alert('保存失败，请重试');
          }
      } catch (e) {
          console.error('Save to note failed:', e);
          alert('保存失败: ' + (e as Error).message);
      }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user || !currentRoom) return;

    const message = {
      id: Date.now().toString(), // temporary ID
      senderId: user.id,
      senderName: user.name || user.email || 'User',
      content: inputValue,
      roomId: currentRoom.id,
      timestamp: new Date().toISOString(),
      type: 'TEXT' as const
    };

    socketService.sendMessage(message);
    setInputValue('');
  };

  const handleFileSelect = () => fileInputRef.current?.click();
   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
       const files = e.target.files;
       if (!files || files.length === 0 || !user || !currentRoom) return;
       
       setUploadingFiles(true);
       let successCount = 0;
       
       try {
           for (const file of Array.from(files)) {
               try {
                   const fileUrl = await handleFileUpload(file);
                   if (!fileUrl) {
                     alert(`文件上传失败：${file.name}`);
                     continue;
                   }
                   const fileName = file.name;
                   const fileSize = file.size;
                   const mimeType = file.type || undefined;
                   
                   const message = {
                       id: Date.now().toString() + Math.random(),
                       senderId: user.id,
                       senderName: user.name || user.email || 'User',
                     content: fileName,
                       roomId: currentRoom.id,
                       timestamp: new Date().toISOString(),
                     type: 'FILE' as const,
                       fileUrl,
                     fileName,
                     fileSize,
                     mimeType
                   };
                   socketService.sendMessage(message);
                   successCount++;
               } catch (uploadErr) {
                   console.error(`Upload failed for ${file.name}:`, uploadErr);
                   alert(`文件上传失败：${file.name} - ${(uploadErr as Error).message}`);
               }
           }
           if (successCount > 0) {
               setShowUploadNotif(true);
               setTimeout(() => setShowUploadNotif(false), 3000);
           }
       } catch (e) {
           console.error('File upload error:', e);
           alert('文件上传失败: ' + (e as Error).message);
       } finally {
           setUploadingFiles(false);
           if (fileInputRef.current) fileInputRef.current.value = '';
       }
   };
  
  const handleEmojiSelect = (emoji: string) => {
      setInputValue(prev => prev + emoji);
      setShowEmojiPicker(false);
  };
  
  // 处理粘贴事件（支持截图粘贴）
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (!user || !currentRoom) return;
      
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      // 检查是否有图片数据
      const items = Array.from(clipboardData.items);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      
      if (imageItem) {
          e.preventDefault(); // 阻止默认粘贴行为
          
          const file = imageItem.getAsFile();
          if (!file) {
              alert('无法读取剪贴板中的图片');
              return;
          }
          
          // 生成文件名
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = file.type === 'image/png' ? 'png' : 'jpg';
          const fileName = `screenshot-${timestamp}.${extension}`;
          
          // 创建新的 File 对象（带有文件名）
          const namedFile = new File([file], fileName, { type: file.type });
          
          setUploadingFiles(true);
          try {
              const fileUrl = await handleFileUpload(namedFile);
              if (!fileUrl) {
                  alert('截图上传失败，请重试');
                  return;
              }
              
              // 发送图片消息
              const message = {
                  id: Date.now().toString() + Math.random(),
                  senderId: user.id,
                  senderName: user.name || user.email || 'User',
                  content: fileName,
                  roomId: currentRoom.id,
                  timestamp: new Date().toISOString(),
                  type: 'IMAGE' as const,
                  fileUrl,
                  fileName,
                  fileSize: namedFile.size,
                  mimeType: namedFile.type
              };
              socketService.sendMessage(message);
              
              setShowUploadNotif(true);
              setTimeout(() => setShowUploadNotif(false), 3000);
          } catch (err) {
              console.error('Screenshot paste upload error:', err);
              alert('截图上传失败: ' + (err as Error).message);
          } finally {
              setUploadingFiles(false);
          }
      }
  };
  
  const handleScreenshot = async () => {
      if (!user || !currentRoom) return;
      
      try {
          // 简化实现：提示用户使用系统截图工具，然后通过粘贴或拖拽上传
          alert('请使用系统截图工具（macOS: Cmd+Shift+4, Windows: Win+Shift+S），截图后直接使用 Ctrl+V / Cmd+V 粘贴到输入框即可自动上传。');
      } catch (e) {
          console.error('Screenshot error:', e);
          alert('截图功能暂不可用，请直接使用文件上传按钮上传截图。');
      }
  };
  
    const handleHistory = () => {
      if (!currentRoom) {
        alert('请先选择一个聊天室');
        return;
      }
      // 打开历史记录查看器
      setShowHistoryModal(true);
    };
  
  const handleMentionClick = (userId: string, userName: string) => {
      setInputValue(prev => prev + `@${userName} `);
      setMentionDropdown(false);
  };

    const toggleGroupMember = (userId: string) => {
      setSelectedGroupMembers(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const handleCreateGroup = async () => {
      if (!user) return;
      const memberIds = Object.keys(selectedGroupMembers).filter(id => selectedGroupMembers[id]);
      if (memberIds.length === 0) {
        alert('请至少选择一个成员');
        return;
      }

      setCreatingGroup(true);
      try {
        const res = await api.createGroupRoom(groupName || '群组聊天', memberIds);
        if (res.success) {
          setCurrentRoom(res.data);
          setActiveTab('messages');
          setShowGroupModal(false);
          setGroupName('');
          setSelectedGroupMembers({});
          loadRooms();
        }
      } catch (e) {
        console.error('Create group failed:', e);
        alert('创建群聊失败，请重试');
      } finally {
        setCreatingGroup(false);
      }
    };

      const openGroupManage = () => {
        if (!currentRoom) return;
        setGroupNameEdit(currentRoom.name || '');
        setGroupAddSelections({});
        loadChatUsers();
        setShowGroupManageModal(true);
      };

      const handleUpdateGroupName = async () => {
        if (!currentRoom) return;
        if (!groupNameEdit.trim()) {
          alert('群聊名称不能为空');
          return;
        }
        setSavingGroup(true);
        try {
          const res = await api.updateGroupRoomName(currentRoom.id, groupNameEdit.trim());
          if (res.success) {
            setCurrentRoom(res.data);
            loadRooms();
          }
        } catch (e) {
          console.error('Update group name failed:', e);
          alert('更新群名失败');
        } finally {
          setSavingGroup(false);
        }
      };

        const openFiles = async () => {
          if (!currentRoom) return;
          setShowFilesModal(true);
          await loadRoomFiles(true);
        };

        const loadRoomFiles = async (reset = false) => {
          if (!currentRoom || filesLoading) return;
          setFilesLoading(true);
          try {
            const res = await api.getRoomFiles(currentRoom.id, {
            limit: 50,
            cursor: reset ? undefined : filesCursor || undefined
            });
            if (res.success) {
              const fetched = res.data;
              setRoomFiles(prev => (reset ? fetched : [...prev, ...fetched]));
              setFilesCursor(fetched.length > 0 ? fetched[fetched.length - 1].id : null);
              setFilesHasMore(fetched.length === 50);
            }
          } catch (e) {
            console.error('Load files failed:', e);
          } finally {
            setFilesLoading(false);
          }
        };

          const handlePurgeFiles = async () => {
            if (!currentRoom) return;
            const input = prompt('请输入要清理的天数（默认30天）', '30');
            if (input === null) return;
            const days = Number(input);
            if (!Number.isFinite(days) || days <= 0) {
              alert('请输入有效天数');
              return;
            }
            setFilesPurging(true);
            try {
              const res = await api.purgeRoomFiles(currentRoom.id, days);
              if (res.success) {
                await loadRoomFiles(true);
                alert(`已清理 ${res.data.removed} 个文件记录`);
              }
            } catch (e) {
              console.error('Purge files failed:', e);
              alert('清理失败');
            } finally {
              setFilesPurging(false);
            }
          };

            const handlePurgeSystemMessages = async () => {
              if (!currentRoom) return;
              const input = prompt('请输入要清理的天数（默认30天）', '30');
              if (input === null) return;
              const days = Number(input);
              if (!Number.isFinite(days) || days <= 0) {
                alert('请输入有效天数');
                return;
              }
              setSavingGroup(true);
              try {
                const res = await api.purgeSystemMessages(currentRoom.id, days);
                if (res.success) {
                  alert(`已清理 ${res.data.removed} 条系统消息`);
                }
              } catch (e) {
                console.error('Purge system messages failed:', e);
                alert('清理失败');
              } finally {
                setSavingGroup(false);
              }
            };

      const handleAddGroupMembers = async () => {
        if (!currentRoom) return;
        const memberIds = Object.keys(groupAddSelections).filter(id => groupAddSelections[id]);
        if (memberIds.length === 0) {
          alert('请选择要添加的成员');
          return;
        }
        setSavingGroup(true);
        try {
          const res = await api.addGroupMembers(currentRoom.id, memberIds);
          if (res.success) {
            setCurrentRoom(res.data);
            setGroupAddSelections({});
            loadRooms();
          }
        } catch (e) {
          console.error('Add group members failed:', e);
          alert('添加成员失败');
        } finally {
          setSavingGroup(false);
        }
      };

      const handleRemoveGroupMember = async (memberId: string) => {
        if (!currentRoom) return;
        if (memberId === user?.id) {
          alert('暂不支持在此处移除自己');
          return;
        }
        setSavingGroup(true);
        try {
          const res = await api.removeGroupMember(currentRoom.id, memberId);
          if (res.success) {
            setCurrentRoom(res.data);
            loadRooms();
          }
        } catch (e) {
          console.error('Remove group member failed:', e);
          alert('移除成员失败');
        } finally {
          setSavingGroup(false);
        }
      };

        const handleUpdateMemberRole = async (memberId: string, role: 'ADMIN' | 'MEMBER') => {
          if (!currentRoom) return;
          setSavingGroup(true);
          try {
            const res = await api.updateGroupMemberRole(currentRoom.id, memberId, role);
            if (res.success) {
              setCurrentRoom(res.data);
              loadRooms();
            }
          } catch (e) {
            console.error('Update member role failed:', e);
            alert('更新成员角色失败');
          } finally {
            setSavingGroup(false);
          }
        };

        const handleLeaveRoom = async () => {
          if (!currentRoom) return;
          setSavingGroup(true);
          try {
            const res = await api.leaveRoom(currentRoom.id);
            if (res.success) {
              setCurrentRoom(null);
              setShowGroupManageModal(false);
              loadRooms();
            }
          } catch (e) {
            console.error('Leave room failed:', e);
            alert('退出群聊失败');
          } finally {
            setSavingGroup(false);
          }
        };

          const handleDeleteMessage = async (messageId: string) => {
            if (!currentRoom) return;
            try {
              const res = await api.deleteChatMessage(messageId);
              if (res.success) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
              }
            } catch (e) {
              console.error('Delete message failed:', e);
              alert('删除消息失败');
            }
          };

            const startEditMessage = (messageId: string, content: string) => {
              setEditingMessageId(messageId);
              setEditingContent(content);
            };

            const cancelEditMessage = () => {
              setEditingMessageId(null);
              setEditingContent('');
            };

            const saveEditMessage = async () => {
              if (!editingMessageId) return;
              if (!editingContent.trim()) {
                alert('内容不能为空');
                return;
              }
              try {
                const res = await api.updateChatMessage(editingMessageId, editingContent.trim());
                if (res.success) {
                  setMessages(prev => prev.map(m => (m.id === editingMessageId ? { ...m, content: res.data.content } : m)));
                  cancelEditMessage();
                }
              } catch (e) {
                console.error('Update message failed:', e);
                alert('编辑失败');
              }
            };

              const handlePostAnnouncement = async () => {
                if (!currentRoom) return;
                if (!announcementDraft.trim()) {
                  alert('公告内容不能为空');
                  return;
                }
                setSavingGroup(true);
                try {
                  const res = await api.postAnnouncement(currentRoom.id, announcementDraft.trim());
                  if (res.success) {
                    setAnnouncementDraft('');
                    setMessages(prev => [...prev, res.data]);
                  }
                } catch (e) {
                  console.error('Post announcement failed:', e);
                  alert('发布公告失败');
                } finally {
                  setSavingGroup(false);
                }
              };

              const handlePinMessage = async (messageId: string) => {
                if (!currentRoom) return;
                try {
                  const res = await api.pinMessage(currentRoom.id, messageId);
                  if (res.success) {
                    setPinnedMessage(res.data || null);
                  }
                } catch (e) {
                  console.error('Pin message failed:', e);
                  alert('置顶失败');
                }
              };

              const handleUnpinMessage = async () => {
                if (!currentRoom) return;
                try {
                  const res = await api.unpinMessage(currentRoom.id);
                  if (res.success) {
                    setPinnedMessage(null);
                  }
                } catch (e) {
                  console.error('Unpin message failed:', e);
                  alert('取消置顶失败');
                }
              };

    const formatFileSize = (size?: number) => {
      if (!size && size !== 0) return '';
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

      const loadRoomMessages = async (options: { query?: string } = {}) => {
        if (!currentRoom) return;
        try {
          const res = await api.getRoomMessages(currentRoom.id, { limit: 50, query: options.query });
          if (res.success) {
            const fetched = res.data;
            setMessages(fetched.slice().reverse());
            setHistoryCursor(fetched.length > 0 ? fetched[fetched.length - 1].id : null);
            setHasMoreHistory(fetched.length === 50);
            socketService.joinRoom(currentRoom.id);
              api.markRoomRead(currentRoom.id).then(loadRooms).catch(() => undefined);
          }
        } catch (e) {
          console.error('Load messages failed:', e);
        }
      };

      const loadPinnedMessage = async () => {
        if (!currentRoom) return;
        setPinnedLoading(true);
        try {
          const res = await api.getPinnedMessage(currentRoom.id);
          if (res.success) {
            setPinnedMessage(res.data || null);
          }
        } catch (e) {
          console.error('Load pinned message failed:', e);
        } finally {
          setPinnedLoading(false);
        }
      };

      const handleSearch = async () => {
        if (!currentRoom) return;
        const query = searchQuery.trim();
        if (!query) {
          setSearchActive(false);
          await loadRoomMessages();
          return;
        }
        setSearchLoading(true);
        try {
          await loadRoomMessages({ query });
          setSearchActive(true);
        } finally {
          setSearchLoading(false);
        }
      };

    const loadMoreHistory = async () => {
      if (!currentRoom || !hasMoreHistory || loadingHistory) return;
      setLoadingHistory(true);
      try {
            const res = await api.getRoomMessages(currentRoom.id, {
              limit: 50,
              cursor: historyCursor || undefined,
              query: searchActive ? searchQuery.trim() : undefined
            });
        if (res.success) {
          const fetched = res.data;
          if (fetched.length > 0) {
            const older = fetched.slice().reverse();
            setMessages(prev => [...older, ...prev]);
            setHistoryCursor(fetched[fetched.length - 1].id);
            setHasMoreHistory(fetched.length === 50);
          } else {
            setHasMoreHistory(false);
          }
        }
      } catch (e) {
        console.error('Load history failed:', e);
      } finally {
        setLoadingHistory(false);
      }
    };


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
          className="relative w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center group"
          title="即时通讯 (可拖动)"
        >
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
           {currentRoom?.type === 'GROUP' && !isMinimized && (
             <button onClick={openGroupManage} className="text-white hover:bg-green-600 rounded p-1" title="群组管理">
               ⚙️
             </button>
           )}
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
              {/* 左侧窄栏：联系人/会话 图标列表 + 右侧消息/空状态区 */}
              <div className="flex-1 overflow-hidden bg-white">
                <div className="flex h-full">
                  {/* 左侧图标列（宽度 56px） */}
                  <div className="w-14 bg-white border-r flex flex-col items-center py-2 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {/* 创建群聊按钮（小图标） */}
                    <div
                      onClick={openGroupModal}
                      title="创建群聊"
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM14 7a2 2 0 11-4 0 2 2 0 014 0zM3 13a4 4 0 018 0v1H3v-1z" />
                      </svg>
                    </div>

                    <div className="w-full border-t"></div>

                    {/* 最近会话（rooms） */}
                    {rooms.map(room => {
                      const otherMember = room.members.find(m => m.userId !== user?.id);
                      const name = room.type === 'DIRECT' ? otherMember?.user.name : room.name || '群聊';
                      const label = name || 'Chat';
                      return (
                        <div
                          key={room.id}
                          title={label}
                          onClick={() => setCurrentRoom(room)}
                          className="relative w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform"
                        >
                          {label.charAt(0).toUpperCase()}
                          {room.unreadCount && room.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {room.unreadCount > 99 ? '•' : room.unreadCount}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <div className="w-full border-t"></div>

                    {/* 联系人（chatUsers） */}
                    {chatUsers.filter(u => u.id !== user?.id).map(u => {
                      const isOnline = onlineUsers.some((ou: any) => ou.userId === u.id);
                      const display = (u.name || u.email || 'U').charAt(0).toUpperCase();
                      return (
                        <div
                          key={u.id}
                          title={u.name || u.email}
                          onClick={() => handleStartChat(u.id)}
                          className="relative w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform"
                        >
                          {display}
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                      );
                    })}

                  </div>

                  {/* 右侧：消息列表或空状态（保持之前 messages 的显示逻辑） */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    {rooms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm mb-4">暂无聊天记录</p>
                        <button onClick={openGroupModal} className="bg-gradient-to-r from-green-400 to-green-500 text-white px-6 py-2 rounded-md hover:from-green-500 hover:to-green-600 transition-all duration-200 font-medium text-sm">创建群聊</button>
                      </div>
                    ) : (
                      rooms.map(room => {
                        const otherMember = room.members.find(m => m.userId !== user?.id);
                        const name = room.type === 'DIRECT' ? otherMember?.user.name : room.name;
                        return (
                          <div key={room.id} onClick={() => setCurrentRoom(room)} className="p-3 border-b hover:bg-gray-50 cursor-pointer flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">{name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="font-medium text-sm text-gray-800">{name}</div>
                              <div className="text-xs text-gray-500">点击进入聊天</div>
                            </div>
                            {room.unreadCount && room.unreadCount > 0 && (
                              <div className="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{room.unreadCount > 99 ? '99+' : room.unreadCount}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
             /* Chat Room View */
             <>
               <div className="border-b border-gray-200 bg-white px-3 py-2">
                 <div className="flex items-center gap-2">
                   <input
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleSearch();
                       }
                     }}
                     placeholder="搜索当前群聊消息..."
                     className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
                   />
                   <button
                     onClick={handleSearch}
                     disabled={searchLoading}
                     className="text-sm px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                   >
                     {searchLoading ? '搜索中...' : '搜索'}
                   </button>
                   {searchActive && (
                     <button
                       onClick={() => {
                         setSearchQuery('');
                         setSearchActive(false);
                         loadRoomMessages();
                       }}
                       className="text-sm px-3 py-2 rounded-md text-gray-500 hover:text-gray-700"
                     >
                       清除
                     </button>
                   )}
                 </div>
               </div>

                {pinnedMessage && (
                  <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2 text-xs text-yellow-800 flex items-center justify-between">
                    <div className="truncate">📌 {pinnedMessage.content}</div>
                    {currentRoom?.members.find(m => m.userId === user?.id)?.role === 'ADMIN' && (
                      <button onClick={handleUnpinMessage} className="text-xs text-yellow-700 hover:underline">
                        取消置顶
                      </button>
                    )}
                  </div>
                )}
                {pinnedLoading && !pinnedMessage && (
                  <div className="bg-white border-b border-gray-200 px-3 py-2 text-xs text-gray-400">加载置顶消息...</div>
                )}

               <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {hasMoreHistory && (
                    <div className="flex justify-center">
                      <button
                        onClick={loadMoreHistory}
                        disabled={loadingHistory}
                        className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {loadingHistory ? '加载中...' : '加载更多历史'}
                      </button>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    const currentRole = currentRoom?.members.find(m => m.userId === user?.id)?.role;
                    const canDelete = isOwn || (currentRoom?.type === 'GROUP' && currentRole === 'ADMIN');
                    const canEdit = isOwn && msg.type !== 'FILE' && msg.type !== 'IMAGE' && msg.type !== 'SYSTEM';
                    const canPin = currentRoom?.type === 'GROUP' && currentRole === 'ADMIN';
                    const isFile = msg.type === 'FILE' || !!msg.fileUrl || (msg.content || '').includes('📎');
                    const isScreenshot = msg.type === 'IMAGE' || (msg.content || '').includes('📸');
                    const isMention = (msg.content || '').includes('@');
                    const messageTime = (msg.timestamp || (msg as any).createdAt) as string;
                    const fileHref = msg.fileUrl
                      ? (msg.fileUrl.startsWith('http') ? msg.fileUrl : `${FILE_BASE_URL}${msg.fileUrl}`)
                      : undefined;
                    
                    if (msg.type === 'SYSTEM') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start space-x-2 group`}>
                        {!isOwn && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                            {(msg.sender?.name || (msg as any).senderName || msg.senderId).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {!isOwn && (
                            <span className="text-xs text-gray-500 px-2 mb-1">
                              {msg.sender?.name || (msg as any).senderName || 'User'}
                            </span>
                          )}
                          <div className={`rounded-lg px-3 py-2 text-sm break-words ${isOwn ? 'bg-green-500 text-white' : 'bg-white border border-gray-200'}`}>
                            {isFile && <span className="mr-1">📎</span>}
                            {isScreenshot && <span className="mr-1">📸</span>}
                            {isMention && <span className="mr-1">💬</span>}
                            {editingMessageId === msg.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-800"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={saveEditMessage}
                                    className="text-xs px-2 py-1 rounded bg-white/80 text-gray-700"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={cancelEditMessage}
                                    className="text-xs px-2 py-1 rounded bg-white/50 text-gray-700"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : isFile ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{msg.fileName || msg.content}</span>
                                <div className="text-xs opacity-80">
                                  {formatFileSize(msg.fileSize)}
                                </div>
                                {fileHref && (
                                  <a
                                    href={fileHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`text-xs underline ${isOwn ? 'text-white' : 'text-blue-600'}`}
                                  >
                                    下载文件
                                  </a>
                                )}
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
                              {messageTime ? new Date(messageTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            {canEdit && editingMessageId !== msg.id && (
                              <button
                                onClick={() => startEditMessage(msg.id, msg.content)}
                                className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                编辑
                              </button>
                            )}
                            {canPin && (
                              <button
                                onClick={() => handlePinMessage(msg.id)}
                                className="text-xs text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                置顶
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
               </div>
               
               {/* Input Area with Toolbar */}
               <div className="bg-white border-t border-gray-200">
                 {/* Toolbar */}
                 <div className="flex items-center space-x-1 px-3 py-2 border-b border-gray-100">
                   <button
                     onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                     type="button"
                     className="p-2 hover:bg-gray-100 rounded transition-colors relative"
                     title="表情"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                     </svg>
                   </button>
                   
                   {/* Emoji Picker Popup */}
                   {showEmojiPicker && (
                     <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-lg p-3 w-80 z-50 border border-gray-200">
                       {/* Category Tabs */}
                       <div className="flex gap-2 mb-3 pb-2 border-b overflow-x-auto">
                         {(['smileys', 'people', 'food', 'objects', 'symbols'] as EmojiCategory[]).map(cat => (
                           <button
                             key={cat}
                             onClick={() => setEmojiCategory(cat)}
                             className={`px-2 py-1 text-sm rounded whitespace-nowrap ${
                               emojiCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100'
                             }`}
                           >
                             {cat === 'smileys' && '😊'}
                             {cat === 'people' && '👋'}
                             {cat === 'food' && '🍎'}
                             {cat === 'objects' && '📱'}
                             {cat === 'symbols' && '❤️'}
                           </button>
                         ))}
                       </div>
                       
                       {/* Emoji Grid */}
                       <div className="grid grid-cols-7 gap-2 max-h-48 overflow-y-auto">
                         {EMOJI_MAP[emojiCategory].map((emoji, idx) => (
                           <button
                             key={idx}
                             onClick={() => handleEmojiSelect(emoji)}
                             className="text-xl hover:bg-gray-100 p-2 rounded cursor-pointer"
                           >
                             {emoji}
                           </button>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   <button
                     onClick={handleFileSelect}
                     type="button"
                     className="p-2 hover:bg-gray-100 rounded transition-colors"
                     title="发送文件"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                     </svg>
                   </button>

                   <button
                     onClick={handleScreenshot}
                     type="button"
                     className="p-2 hover:bg-gray-100 rounded transition-colors"
                     title="截图"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                     </svg>
                   </button>

                    <button
                      onClick={handleHistory}
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                      title="聊天记录"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </button>

                    <button
                      onClick={openFiles}
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                      title="文件管理"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={handleSaveToNote}
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                      title="保存到笔记"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: theme.hex }} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 012-2h4.586a1 1 0 01.707.293l.707.707a1 1 0 01.293.707V8a1 1 0 01-1 1v8a1 1 0 001 1h5a1 1 0 001-1V8a1 1 0 00-1-1V5a1 1 0 00-.293-.707l-.707-.707A1 1 0 009.586 4H6zm7 1a1 1 0 110 2v5a1 1 0 110-2V5zM4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm8 5a1 1 0 110 2v3a1 1 0 110-2V7z" />
                      </svg>
                    </button>
                  </div>

                 {/* Input Form with Upload Notification */}
                 <form onSubmit={(e) => {
                   handleSend(e);
                   setShowEmojiPicker(false);
                 }} className="p-3">
                   {/* Upload Notification */}
                   {showUploadNotif && (
                     <div className="mb-2 bg-green-100 border border-green-400 text-green-800 px-3 py-2 rounded text-sm flex items-center gap-2">
                       <span>✅</span>
                       <span>文件已成功上传到消息！</span>
                     </div>
                   )}
                   
                   <div className="flex gap-2">
                     <input
                       type="file"
                       ref={fileInputRef}
                       onChange={handleFileChange}
                       className="hidden"
                       multiple
                     />
                     <div className="flex-1 relative">
                       <input
                         type="text"
                         value={inputValue}
                         onChange={(e) => {
                           setInputValue(e.target.value);
                           // Show mention dropdown when user types @
                           if (e.target.value.includes('@')) {
                             setMentionDropdown(true);
                           } else {
                             setMentionDropdown(false);
                           }
                         }}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             handleSend(e as any);
                           }
                         }}
                         onPaste={handlePaste}
                         placeholder="输入消息...（@ 提及成员，Enter 发送，可粘贴截图）"
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                       />
                       
                       {/* Mention Dropdown */}
                       {mentionDropdown && currentRoom && onlineUsers.length > 0 && (
                         <div className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg p-2 z-50 mb-2 border border-gray-200 max-h-40 overflow-y-auto">
                           <div className="text-xs font-semibold text-gray-600 px-2 py-1">提及成员：</div>
                           {onlineUsers
                             .filter(u => u.id !== user?.id)
                             .map(u => (
                               <div
                                 key={u.id}
                                 onClick={() => handleMentionClick(u.id, u.name || u.email)}
                                 className="p-2 hover:bg-blue-100 cursor-pointer rounded flex items-center gap-2"
                               >
                                 <span className="text-base">👤</span>
                                 <span className="text-sm">{u.name || u.email}</span>
                               </div>
                             ))}
                         </div>
                       )}
                     </div>
                     <button
                       type="submit"
                       disabled={!inputValue.trim()}
                       className="bg-gradient-to-r from-green-400 to-green-500 text-white px-5 py-2 rounded-md hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                     >
                       发送
                     </button>
                   </div>
                 </form>
               </div>
             </>
          )}
        </>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw]">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">创建群聊</div>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-600">群聊名称</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="例如：项目协作群"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-2">选择成员</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {chatUsers
                    .filter(u => u.id !== user?.id)
                    .map((u) => (
                      <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={!!selectedGroupMembers[u.id]}
                          onChange={() => toggleGroupMember(u.id)}
                        />
                        <span>{u.name || u.email}</span>
                      </label>
                    ))}
                  {chatUsers.filter(u => u.id !== user?.id).length === 0 && (
                    <div className="text-xs text-gray-400 p-3">暂无可选成员</div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-sm px-3 py-2 rounded-md border border-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="text-sm px-4 py-2 rounded-md bg-green-500 text-white disabled:opacity-50"
              >
                {creatingGroup ? '创建中...' : '创建群聊'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupManageModal && currentRoom && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[420px] max-w-[92vw]">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">群组管理</div>
              <button
                onClick={() => setShowGroupManageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const me = currentRoom.members.find(m => m.userId === user?.id);
                const isAdmin = me?.role === 'ADMIN';
                return (
                  <>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">群聊名称</div>
                      <div className="flex gap-2">
                        <input
                          value={groupNameEdit}
                          onChange={(e) => setGroupNameEdit(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button
                          onClick={handleUpdateGroupName}
                          disabled={savingGroup || !isAdmin}
                          className="text-sm px-3 py-2 rounded-md bg-green-500 text-white disabled:opacity-50"
                        >
                          保存
                        </button>
                      </div>
                      {!isAdmin && (
                        <div className="text-xs text-gray-400 mt-1">仅管理员可修改群名</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-2">成员列表</div>
                      <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                        {currentRoom.members.map(member => (
                          <div key={member.userId} className="flex items-center justify-between px-3 py-2 text-sm">
                            <div>
                              <div>
                                {member.user.name}
                                {member.userId === user?.id ? ' (你)' : ''}
                              </div>
                              <div className="text-xs text-gray-400">{member.role === 'ADMIN' ? '管理员' : '成员'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && member.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUpdateMemberRole(member.userId, 'ADMIN')}
                                  className="text-xs text-blue-500 hover:text-blue-600"
                                >
                                  设为管理员
                                </button>
                              )}
                              {isAdmin && member.role === 'ADMIN' && member.userId !== user?.id && (
                                <button
                                  onClick={() => handleUpdateMemberRole(member.userId, 'MEMBER')}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  设为成员
                                </button>
                              )}
                              {isAdmin && member.userId !== user?.id && (
                                <button
                                  onClick={() => handleRemoveGroupMember(member.userId)}
                                  className="text-xs text-red-500 hover:text-red-600"
                                >
                                  移除
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-2">添加成员</div>
                      <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                        {chatUsers
                          .filter(u => !currentRoom.members.some(m => m.userId === u.id) && u.id !== user?.id)
                          .map((u) => (
                            <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!groupAddSelections[u.id]}
                                onChange={() => setGroupAddSelections(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                              />
                              <span>{u.name || u.email}</span>
                            </label>
                          ))}
                        {chatUsers.filter(u => !currentRoom.members.some(m => m.userId === u.id) && u.id !== user?.id).length === 0 && (
                          <div className="text-xs text-gray-400 p-3">暂无可添加成员</div>
                        )}
                      </div>
                      <button
                        onClick={handleAddGroupMembers}
                        disabled={savingGroup || !isAdmin}
                        className="mt-2 text-sm px-3 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50"
                      >
                        添加成员
                      </button>
                      {!isAdmin && (
                        <div className="text-xs text-gray-400 mt-1">仅管理员可添加成员</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-2">群公告</div>
                      <div className="flex gap-2">
                        <input
                          value={announcementDraft}
                          onChange={(e) => setAnnouncementDraft(e.target.value)}
                          placeholder="输入公告内容"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button
                          onClick={handlePostAnnouncement}
                          disabled={savingGroup || !isAdmin}
                          className="text-sm px-3 py-2 rounded-md bg-purple-500 text-white disabled:opacity-50"
                        >
                          发布
                        </button>
                      </div>
                      {!isAdmin && (
                        <div className="text-xs text-gray-400 mt-1">仅管理员可发布公告</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 mb-2">系统消息清理</div>
                      <button
                        onClick={handlePurgeSystemMessages}
                        disabled={savingGroup || !isAdmin}
                        className="text-sm px-3 py-2 rounded-md border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                      >
                        清理系统消息
                      </button>
                      {!isAdmin && (
                        <div className="text-xs text-gray-400 mt-1">仅管理员可清理</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-4 py-3 border-t flex justify-between items-center">
              <button
                onClick={handleLeaveRoom}
                disabled={savingGroup}
                className="text-sm px-3 py-2 rounded-md text-red-500 border border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                退出群聊
              </button>
              <button
                onClick={() => setShowGroupManageModal(false)}
                className="text-sm px-3 py-2 rounded-md border border-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilesModal && currentRoom && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[520px] max-w-[94vw]">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">文件管理</div>
              <button
                onClick={() => setShowFilesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="flex justify-end mb-2">
                <button
                  onClick={handlePurgeFiles}
                  disabled={filesPurging}
                  className="text-xs px-3 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {filesPurging ? '清理中...' : '清理旧文件'}
                </button>
              </div>
              <div className="border border-gray-200 rounded-md max-h-80 overflow-y-auto">
                {roomFiles.map(file => {
                  const fileHref = file.fileUrl
                    ? (file.fileUrl.startsWith('http') ? file.fileUrl : `${FILE_BASE_URL}${file.fileUrl}`)
                    : undefined;
                  return (
                    <div key={file.id} className="px-3 py-2 border-b last:border-b-0 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{file.fileName || file.content}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      {fileHref && (
                        <a
                          href={fileHref}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          下载
                        </a>
                      )}
                    </div>
                  );
                })}
                {roomFiles.length === 0 && !filesLoading && (
                  <div className="text-xs text-gray-400 p-4">暂无文件</div>
                )}
              </div>
              {filesHasMore && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => loadRoomFiles(false)}
                    disabled={filesLoading}
                    className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {filesLoading ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && currentRoom && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-[94vw] max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">聊天记录</div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {hasMoreHistory && (
                <div className="flex justify-center mb-3">
                  <button
                    onClick={loadMoreHistory}
                    disabled={loadingHistory}
                    className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {loadingHistory ? '加载中...' : '加载更早消息'}
                  </button>
                </div>
              )}
              {messages.map(msg => {
                const isOwn = msg.senderId === user?.id;
                const senderName = msg.sender?.name || (msg as any).senderName || 'User';
                const messageTime = msg.timestamp || (msg as any).createdAt;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOwn ? 'bg-green-500 text-white' : 'bg-gray-100'} px-3 py-2 rounded-lg`}>
                      {!isOwn && <div className="text-xs font-semibold mb-1">{senderName}</div>}
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {messageTime ? new Date(messageTime).toLocaleString('zh-CN') : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">暂无消息</div>
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-sm px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
