import { create } from 'zustand';

const STORAGE_KEY = 'pdf-editor-sidebar-collapsed';

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // localStorage may be unavailable (e.g., private browsing in some browsers)
  }
  return false;
}

function persistCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: getStoredCollapsed(),
  mobileOpen: false,
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      persistCollapsed(next);
      return { collapsed: next };
    }),
  setCollapsed: (collapsed: boolean) => {
    persistCollapsed(collapsed);
    set({ collapsed });
  },
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
}));
