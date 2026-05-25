import { create } from 'zustand';

const FAVORITES_KEY = 'pdf-editor-nav-favorites';
const RECENT_KEY = 'pdf-editor-nav-recent';
const COLLAPSED_KEY = 'pdf-editor-nav-collapsed';
const SIDEBAR_KEY = 'pdf-editor-sidebar-collapsed';
const USAGE_COUNTS_KEY = 'pdf-editor-usage-counts';
const MAX_FAVORITES = 8;
const MAX_RECENT = 3;

export interface NavStoreState {
  favorites: string[];
  recentTools: string[];
  collapsedCategories: Record<string, boolean>;
  sidebarCollapsed: boolean;
  filterQuery: string;
  usageCounts: Record<string, number>;

  addFavorite: (path: string) => boolean;
  removeFavorite: (path: string) => void;
  toggleFavorite: (path: string) => boolean;
  addRecentTool: (path: string) => void;
  incrementUsage: (path: string) => void;
  getTopUsedTools: (count: number) => string[];
  toggleCategory: (categoryId: string) => void;
  toggleSidebar: () => void;
  setFilterQuery: (query: string) => void;
  loadFromStorage: () => void;
}

export const useNavStore = create<NavStoreState>((set, get) => ({
  favorites: [],
  recentTools: [],
  collapsedCategories: {},
  sidebarCollapsed: false,
  filterQuery: '',
  usageCounts: {},

  addFavorite: (path) => {
    const { favorites } = get();
    if (favorites.includes(path)) return true;
    if (favorites.length >= MAX_FAVORITES) return false;
    const updated = [...favorites, path];
    set({ favorites: updated });
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable or quota exceeded — continue without persisting
    }
    return true;
  },

  removeFavorite: (path) => {
    const { favorites } = get();
    const updated = favorites.filter((p) => p !== path);
    set({ favorites: updated });
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable or quota exceeded
    }
  },

  toggleFavorite: (path) => {
    const { favorites, addFavorite, removeFavorite } = get();
    if (favorites.includes(path)) {
      removeFavorite(path);
      return true;
    }
    return addFavorite(path);
  },

  addRecentTool: (path) => {
    const { recentTools } = get();
    const filtered = recentTools.filter((p) => p !== path);
    const updated = [path, ...filtered].slice(0, MAX_RECENT);
    set({ recentTools: updated });
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable or quota exceeded
    }
  },

  incrementUsage: (path) => {
    const { usageCounts } = get();
    const updated = { ...usageCounts, [path]: (usageCounts[path] || 0) + 1 };
    set({ usageCounts: updated });
    try {
      localStorage.setItem(USAGE_COUNTS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable or quota exceeded
    }
  },

  getTopUsedTools: (count) => {
    const { usageCounts } = get();
    return Object.entries(usageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([path]) => path);
  },

  toggleCategory: (categoryId) => {
    const { collapsedCategories } = get();
    const updated = {
      ...collapsedCategories,
      [categoryId]: !collapsedCategories[categoryId],
    };
    set({ collapsedCategories: updated });
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable or quota exceeded
    }
  },

  toggleSidebar: () => {
    const collapsed = !get().sidebarCollapsed;
    set({ sidebarCollapsed: collapsed });
    try {
      localStorage.setItem(SIDEBAR_KEY, JSON.stringify(collapsed));
    } catch {
      // localStorage unavailable or quota exceeded
    }
  },

  setFilterQuery: (query) => set({ filterQuery: query }),

  loadFromStorage: () => {
    try {
      const favs = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const collapsed = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '{}');
      const sidebar = JSON.parse(localStorage.getItem(SIDEBAR_KEY) || 'false');
      const usage = JSON.parse(localStorage.getItem(USAGE_COUNTS_KEY) || '{}');

      set({
        favorites: Array.isArray(favs) ? favs : [],
        recentTools: Array.isArray(recent) ? recent : [],
        collapsedCategories:
          collapsed && typeof collapsed === 'object' && !Array.isArray(collapsed) ? collapsed : {},
        sidebarCollapsed: typeof sidebar === 'boolean' ? sidebar : false,
        usageCounts: usage && typeof usage === 'object' && !Array.isArray(usage) ? usage : {},
      });
    } catch {
      // Parse errors — fall back to defaults (already set)
    }
  },
}));
