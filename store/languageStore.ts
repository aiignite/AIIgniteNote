
import { create } from 'zustand';

export type Language = 'en' | 'zh';

const translations = {
  en: {
    sidebar: {
      documents: 'Documents',
      templates: 'Templates',
      search: 'Search',
      aiDashboard: 'AI Dashboard',
      favorites: 'Favorites',
      tags: 'Tags',
      trash: 'Trash',
      settings: 'Settings',
      viewProfile: 'View Profile',
      signOut: 'Sign Out'
    },
    noteList: {
      searchPlaceholder: 'Search...',
      emptyFolder: 'Empty Folder',
      addTo: 'Add to',
      newFolder: 'New Folder',
      items: 'items',
      cloudSynced: 'Cloud Synced',
      deleteTitle: 'Delete Note',
      deleteMessage: 'Are you sure you want to delete this note? This action cannot be undone.',
      confirmDelete: 'Delete',
      cancel: 'Cancel',
      create: 'Create',
      moveTitle: 'Move to Folder',
      movePlaceholder: 'Folder Name',
      moveBtn: 'Move',
      tagTitle: 'Add Tag',
      tagPlaceholder: 'e.g. Important, Work',
      tagBtn: 'Add Tag',
      sortModified: 'Modified',
      sortCreated: 'Created',
      sortName: 'Name',
      folderInputTitle: 'New Folder',
      folderInputPlaceholder: 'Enter folder name'
    },
    editor: {
      noNoteSelected: 'No Note Selected',
      noNoteDesc: 'Select a note from the sidebar or create a new one.',
      untitled: 'Untitled Note',
      addTag: 'Add Tag',
      suggested: 'Suggested',
      chars: 'chars'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account and preferences',
      tabs: {
        general: 'General',
        profile: 'User Profile',
        team: 'Team Management'
      },
      appearance: 'Appearance',
      interfaceTheme: 'Interface Theme',
      interfaceThemeDesc: 'Choose your preferred visual mode',
      light: 'Light',
      dark: 'Dark',
      primaryColor: 'Primary Accent Color',
      primaryColorDesc: 'Change the primary color of the interface',
      language: 'Language',
      languageDesc: 'Choose your preferred language',
      save: 'Save Changes',
      discard: 'Discard'
    },
    aiPanel: {
      thinking: 'Thinking...',
      askPlaceholder: 'Ask',
      stop: 'Stop generation',
      disclaimer: 'AI can make mistakes. Always check important info.',
      assistants: {
        general: 'General Assistant',
        coder: 'Code Architect',
        writer: 'Copy Editor',
        data: 'Data Analyst',
        pm: 'Product Lead'
      }
    },
    login: {
      welcome: 'Welcome Back',
      subtitle: 'Sign in to your intelligent workspace',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      signInBtn: 'Sign In',
      signingIn: 'Signing in...',
      newHere: 'New here?',
      createAccount: 'Create an account'
    }
  },
  zh: {
    sidebar: {
      documents: '文档',
      templates: '模板库',
      search: '全局搜索',
      aiDashboard: 'AI 仪表盘',
      favorites: '收藏夹',
      tags: '标签管理',
      trash: '回收站',
      settings: '设置',
      viewProfile: '查看个人资料',
      signOut: '退出登录'
    },
    noteList: {
      searchPlaceholder: '搜索...',
      emptyFolder: '空文件夹',
      addTo: '添加到',
      newFolder: '新建文件夹',
      items: '项',
      cloudSynced: '已同步',
      deleteTitle: '删除笔记',
      deleteMessage: '您确定要删除这条笔记吗？此操作无法撤销。',
      confirmDelete: '删除',
      cancel: '取消',
      create: '创建',
      moveTitle: '移动到文件夹',
      movePlaceholder: '文件夹名称',
      moveBtn: '移动',
      tagTitle: '添加标签',
      tagPlaceholder: '例如：重要，工作',
      tagBtn: '添加',
      sortModified: '修改时间',
      sortCreated: '创建时间',
      sortName: '名称',
      folderInputTitle: '新建文件夹',
      folderInputPlaceholder: '输入文件夹名称'
    },
    editor: {
      noNoteSelected: '未选择笔记',
      noNoteDesc: '请从侧边栏选择一个笔记或创建一个新笔记。',
      untitled: '无标题笔记',
      addTag: '添加标签',
      suggested: '建议',
      chars: '字符'
    },
    settings: {
      title: '设置',
      subtitle: '管理您的账户和偏好设置',
      tabs: {
        general: '通用',
        profile: '个人资料',
        team: '团队管理'
      },
      appearance: '外观',
      interfaceTheme: '界面主题',
      interfaceThemeDesc: '选择您喜欢的视觉模式',
      light: '浅色',
      dark: '深色',
      primaryColor: '主题色',
      primaryColorDesc: '更改界面的主要强调色',
      language: '语言',
      languageDesc: '选择您偏好的语言',
      save: '保存更改',
      discard: '放弃'
    },
    aiPanel: {
      thinking: '思考中...',
      askPlaceholder: '提问',
      stop: '停止生成',
      disclaimer: 'AI 可能会犯错。请务必核对重要信息。',
      assistants: {
        general: '通用助手',
        coder: '代码架构师',
        writer: '文案编辑',
        data: '数据分析师',
        pm: '产品专家'
      }
    },
    login: {
      welcome: '欢迎回来',
      subtitle: '登录您的智能工作区',
      emailLabel: '邮箱',
      passwordLabel: '密码',
      signInBtn: '登录',
      signingIn: '登录中...',
      newHere: '新用户？',
      createAccount: '创建账户'
    }
  }
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  t: translations.en, // Initialize explicitly with default language object
  setLanguage: (lang) => set({ language: lang, t: translations[lang] }), // Update explicitly when language changes
}));
