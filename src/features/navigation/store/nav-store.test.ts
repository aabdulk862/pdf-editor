import { describe, it, expect, beforeEach } from 'vitest';
import { useNavStore } from './nav-store';

describe('nav-store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useNavStore.setState({
      favorites: [],
      recentTools: [],
      collapsedCategories: {},
      sidebarCollapsed: false,
      filterQuery: '',
    });
    localStorage.clear();
  });

  describe('addFavorite', () => {
    it('adds a tool path to favorites', () => {
      const result = useNavStore.getState().addFavorite('/merge');
      expect(result).toBe(true);
      expect(useNavStore.getState().favorites).toEqual(['/merge']);
    });

    it('returns true if tool is already a favorite', () => {
      useNavStore.getState().addFavorite('/merge');
      const result = useNavStore.getState().addFavorite('/merge');
      expect(result).toBe(true);
      expect(useNavStore.getState().favorites).toEqual(['/merge']);
    });

    it('returns false when at max 8 favorites', () => {
      const paths = Array.from({ length: 8 }, (_, i) => `/tool-${i}`);
      paths.forEach((p) => useNavStore.getState().addFavorite(p));
      expect(useNavStore.getState().favorites).toHaveLength(8);

      const result = useNavStore.getState().addFavorite('/tool-9');
      expect(result).toBe(false);
      expect(useNavStore.getState().favorites).toHaveLength(8);
    });

    it('persists to localStorage', () => {
      useNavStore.getState().addFavorite('/split');
      const stored = JSON.parse(localStorage.getItem('pdf-editor-nav-favorites')!);
      expect(stored).toEqual(['/split']);
    });
  });

  describe('removeFavorite', () => {
    it('removes a tool path from favorites', () => {
      useNavStore.getState().addFavorite('/merge');
      useNavStore.getState().addFavorite('/split');
      useNavStore.getState().removeFavorite('/merge');
      expect(useNavStore.getState().favorites).toEqual(['/split']);
    });

    it('does nothing if path is not in favorites', () => {
      useNavStore.getState().addFavorite('/merge');
      useNavStore.getState().removeFavorite('/split');
      expect(useNavStore.getState().favorites).toEqual(['/merge']);
    });

    it('persists removal to localStorage', () => {
      useNavStore.getState().addFavorite('/merge');
      useNavStore.getState().removeFavorite('/merge');
      const stored = JSON.parse(localStorage.getItem('pdf-editor-nav-favorites')!);
      expect(stored).toEqual([]);
    });
  });

  describe('toggleFavorite', () => {
    it('adds a tool if not in favorites', () => {
      const result = useNavStore.getState().toggleFavorite('/merge');
      expect(result).toBe(true);
      expect(useNavStore.getState().favorites).toContain('/merge');
    });

    it('removes a tool if already in favorites', () => {
      useNavStore.getState().addFavorite('/merge');
      const result = useNavStore.getState().toggleFavorite('/merge');
      expect(result).toBe(true);
      expect(useNavStore.getState().favorites).not.toContain('/merge');
    });

    it('returns false when adding would exceed max', () => {
      const paths = Array.from({ length: 8 }, (_, i) => `/tool-${i}`);
      paths.forEach((p) => useNavStore.getState().addFavorite(p));
      const result = useNavStore.getState().toggleFavorite('/new-tool');
      expect(result).toBe(false);
    });
  });

  describe('addRecentTool', () => {
    it('adds a tool to the front of recentTools', () => {
      useNavStore.getState().addRecentTool('/merge');
      useNavStore.getState().addRecentTool('/split');
      expect(useNavStore.getState().recentTools).toEqual(['/split', '/merge']);
    });

    it('deduplicates by moving existing entry to front', () => {
      useNavStore.getState().addRecentTool('/merge');
      useNavStore.getState().addRecentTool('/split');
      useNavStore.getState().addRecentTool('/merge');
      expect(useNavStore.getState().recentTools).toEqual(['/merge', '/split']);
    });

    it('trims to max 5 entries', () => {
      for (let i = 0; i < 7; i++) {
        useNavStore.getState().addRecentTool(`/tool-${i}`);
      }
      expect(useNavStore.getState().recentTools).toHaveLength(5);
      expect(useNavStore.getState().recentTools[0]).toBe('/tool-6');
    });

    it('persists to localStorage', () => {
      useNavStore.getState().addRecentTool('/merge');
      const stored = JSON.parse(localStorage.getItem('pdf-editor-nav-recent')!);
      expect(stored).toEqual(['/merge']);
    });
  });

  describe('toggleCategory', () => {
    it('collapses an expanded category', () => {
      useNavStore.getState().toggleCategory('organize');
      expect(useNavStore.getState().collapsedCategories['organize']).toBe(true);
    });

    it('expands a collapsed category', () => {
      useNavStore.getState().toggleCategory('organize');
      useNavStore.getState().toggleCategory('organize');
      expect(useNavStore.getState().collapsedCategories['organize']).toBe(false);
    });

    it('persists to localStorage', () => {
      useNavStore.getState().toggleCategory('edit');
      const stored = JSON.parse(localStorage.getItem('pdf-editor-nav-collapsed')!);
      expect(stored).toEqual({ edit: true });
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebarCollapsed state', () => {
      useNavStore.getState().toggleSidebar();
      expect(useNavStore.getState().sidebarCollapsed).toBe(true);
      useNavStore.getState().toggleSidebar();
      expect(useNavStore.getState().sidebarCollapsed).toBe(false);
    });

    it('persists to localStorage', () => {
      useNavStore.getState().toggleSidebar();
      const stored = JSON.parse(localStorage.getItem('pdf-editor-sidebar-collapsed')!);
      expect(stored).toBe(true);
    });
  });

  describe('setFilterQuery', () => {
    it('updates the filter query', () => {
      useNavStore.getState().setFilterQuery('merge');
      expect(useNavStore.getState().filterQuery).toBe('merge');
    });
  });

  describe('loadFromStorage', () => {
    it('loads persisted state from localStorage', () => {
      localStorage.setItem('pdf-editor-nav-favorites', JSON.stringify(['/merge', '/split']));
      localStorage.setItem('pdf-editor-nav-recent', JSON.stringify(['/rotate']));
      localStorage.setItem('pdf-editor-nav-collapsed', JSON.stringify({ organize: true }));
      localStorage.setItem('pdf-editor-sidebar-collapsed', JSON.stringify(true));

      useNavStore.getState().loadFromStorage();

      const state = useNavStore.getState();
      expect(state.favorites).toEqual(['/merge', '/split']);
      expect(state.recentTools).toEqual(['/rotate']);
      expect(state.collapsedCategories).toEqual({ organize: true });
      expect(state.sidebarCollapsed).toBe(true);
    });

    it('falls back to defaults on invalid JSON', () => {
      localStorage.setItem('pdf-editor-nav-favorites', 'not-json');

      useNavStore.getState().loadFromStorage();

      const state = useNavStore.getState();
      expect(state.favorites).toEqual([]);
      expect(state.recentTools).toEqual([]);
      expect(state.collapsedCategories).toEqual({});
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('falls back to defaults when stored values have wrong types', () => {
      localStorage.setItem('pdf-editor-nav-favorites', JSON.stringify('not-an-array'));
      localStorage.setItem('pdf-editor-nav-recent', JSON.stringify(42));
      localStorage.setItem('pdf-editor-nav-collapsed', JSON.stringify([1, 2, 3]));
      localStorage.setItem('pdf-editor-sidebar-collapsed', JSON.stringify('yes'));

      useNavStore.getState().loadFromStorage();

      const state = useNavStore.getState();
      expect(state.favorites).toEqual([]);
      expect(state.recentTools).toEqual([]);
      expect(state.collapsedCategories).toEqual({});
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('handles missing localStorage keys gracefully', () => {
      useNavStore.getState().loadFromStorage();

      const state = useNavStore.getState();
      expect(state.favorites).toEqual([]);
      expect(state.recentTools).toEqual([]);
      expect(state.collapsedCategories).toEqual({});
      expect(state.sidebarCollapsed).toBe(false);
    });
  });
});
