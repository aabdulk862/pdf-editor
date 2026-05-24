import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'pdf-editor-theme';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (e.g., private browsing in some browsers)
  }
  return 'light';
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getStoredTheme(),
  toggleTheme: () =>
    set((state) => {
      const nextTheme: Theme = state.theme === 'light' ? 'dark' : 'light';
      persistTheme(nextTheme);
      return { theme: nextTheme };
    }),
}));
