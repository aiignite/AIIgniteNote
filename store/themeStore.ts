
import { create } from 'zustand';
import { offlineSync } from '../services/offlineSync';
import { indexedDB } from '../services/indexedDB';

export type ThemeColor = 'orange' | 'purple' | 'green' | 'blue';

interface ThemeDefinition {
  name: string;
  hex: string;
  rgb: string; // For CSS variables (legacy)
  tailwindVar: string; // Tailwind v4 CSS variable name (e.g., 'var(--color-orange-600)')
  tailwindBgVar: string; // Background variant (e.g., 'var(--color-orange-50)')
  gradientStart: string;
  gradientEnd: string;
  tailwindBg: string; // For the selector circle
}

interface ThemeState {
  primaryColor: ThemeColor;
  setPrimaryColor: (color: ThemeColor) => void;
  getTheme: () => ThemeDefinition;
  initialize: () => Promise<void>;
}

const THEMES: Record<ThemeColor, ThemeDefinition> = {
  orange: {
    name: 'Orange',
    hex: '#EA580C',
    rgb: '234 88 12',
    tailwindVar: 'var(--color-orange-600)',
    tailwindBgVar: 'var(--color-orange-50)',
    gradientStart: '#F97316',
    gradientEnd: '#EA580C',
    tailwindBg: 'bg-orange-600'
  },
  purple: {
    name: 'Purple',
    hex: '#8B5CF6',
    rgb: '139 92 246',
    tailwindVar: 'var(--color-violet-500)',
    tailwindBgVar: 'var(--color-violet-50)',
    gradientStart: '#A78BFA',
    gradientEnd: '#7C3AED',
    tailwindBg: 'bg-violet-500'
  },
  green: {
    name: 'Emerald',
    hex: '#10B981',
    rgb: '16 185 129',
    tailwindVar: 'var(--color-emerald-500)',
    tailwindBgVar: 'var(--color-emerald-50)',
    gradientStart: '#34D399',
    gradientEnd: '#059669',
    tailwindBg: 'bg-emerald-500'
  },
  blue: {
    name: 'Blue',
    hex: '#3B82F6',
    rgb: '59 130 246',
    tailwindVar: 'var(--color-blue-500)',
    tailwindBgVar: 'var(--color-blue-50)',
    gradientStart: '#60A5FA',
    gradientEnd: '#2563EB',
    tailwindBg: 'bg-blue-500'
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  primaryColor: 'orange',
  setPrimaryColor: (color) => {
    set({ primaryColor: color });
    offlineSync.enqueueRequest('PUT', '/api/users/settings', { primaryColor: color });
    indexedDB.getSettings().then(settings => {
      indexedDB.cacheSettings({ ...settings, primaryColor: color });
    });
  },
  getTheme: () => THEMES[get().primaryColor],
  initialize: async () => {
    const settings = await indexedDB.getSettings();
    if (settings && settings.primaryColor) {
      set({ primaryColor: settings.primaryColor });
    }
  }
}));
