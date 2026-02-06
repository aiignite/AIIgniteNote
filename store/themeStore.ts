
import { create } from 'zustand';
import { offlineSync } from '../services/offlineSync';
import { indexedDB } from '../services/indexedDB';

export type ThemeColor = 'orange' | 'purple' | 'green' | 'blue';

interface ThemePalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

interface ThemeDefinition {
  name: string;
  hex: string;
  palette: ThemePalette;
  tailwindBg: string; // For the selector circle
  gradientStart: string; // Logo gradient start color
  gradientEnd: string;   // Logo gradient end color
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
    palette: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12'
    },
    tailwindBg: 'bg-orange-600',
    gradientStart: '#FB923C',  // orange-400
    gradientEnd: '#EA580C'     // orange-600
  },
  purple: {
    name: 'Purple',
    hex: '#8B5CF6',
    palette: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95'
    },
    tailwindBg: 'bg-violet-500',
    gradientStart: '#A78BFA',  // violet-400
    gradientEnd: '#7C3AED'     // violet-600
  },
  green: {
    name: 'Emerald',
    hex: '#10B981',
    palette: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B'
    },
    tailwindBg: 'bg-emerald-500',
    gradientStart: '#34D399',  // emerald-400
    gradientEnd: '#059669'     // emerald-600
  },
  blue: {
    name: 'Blue',
    hex: '#3B82F6',
    palette: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A'
    },
    tailwindBg: 'bg-blue-500',
    gradientStart: '#60A5FA',  // blue-400
    gradientEnd: '#2563EB'     // blue-600
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
