import { create } from 'zustand';

import type { DocumentTab, PageData, TabManagerState } from '../features/tabs/types';
import { truncateFileName } from '../features/tabs/utils';
import { useToastStore } from './toast';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export { truncateFileName };

export const useTabStore = create<TabManagerState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  clipboard: null,
  maxTabs: 10,

  openTab: (file: File, operationRoute: string): boolean => {
    const { tabs, maxTabs } = get();

    if (tabs.length >= maxTabs) {
      useToastStore.getState().addToast('Maximum number of open tabs reached', 'warning');
      return false;
    }

    const id = generateId();
    const fileName = truncateFileName(file.name);

    const newTab: DocumentTab = {
      id,
      fileName,
      fileData: new ArrayBuffer(0), // Placeholder; actual data loaded async
      fileSize: file.size,
      operationRoute,
      operationState: {},
      createdAt: Date.now(),
    };

    // Read file data asynchronously and update the tab
    if (typeof file.arrayBuffer === 'function') {
      file.arrayBuffer().then((buffer) => {
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, fileData: buffer } : tab)),
        }));
      });
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));

    return true;
  },

  closeTab: (tabId: string): void => {
    const { tabs, activeTabId } = get();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);

    if (tabIndex === -1) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);

    let newActiveTabId: string | null = activeTabId;

    if (activeTabId === tabId) {
      if (newTabs.length === 0) {
        // Last tab closed — show home page
        newActiveTabId = null;
      } else if (tabIndex > 0) {
        // Switch to left neighbor
        newActiveTabId = newTabs[tabIndex - 1].id;
      } else {
        // Was leftmost, switch to right neighbor (now at index 0)
        newActiveTabId = newTabs[0].id;
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  switchTab: (tabId: string): void => {
    set({ activeTabId: tabId });
  },

  cycleTab: (direction: 'next' | 'prev'): void => {
    const { tabs, activeTabId } = get();

    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    set({ activeTabId: tabs[newIndex].id });
  },

  updateTabState: (tabId: string, state: Record<string, unknown>): void => {
    set((prev) => ({
      tabs: prev.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, operationState: { ...tab.operationState, ...state } } : tab,
      ),
    }));
  },

  getActiveTab: (): DocumentTab | null => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },

  copyPages: (pages: PageData[]): void => {
    const { activeTabId } = get();
    const MAX_COPY_PAGES = 50;

    if (pages.length > MAX_COPY_PAGES) {
      useToastStore.getState().addToast('Selection truncated to maximum 50 pages', 'warning');
    }

    const pagesToStore = pages.slice(0, MAX_COPY_PAGES);

    set({
      clipboard: {
        pages: pagesToStore,
        sourceTabId: activeTabId ?? '',
        copiedAt: Date.now(),
      },
    });
  },

  pastePages: (targetTabId: string, afterPageIndex: number | null): void => {
    const { clipboard, tabs } = get();

    if (!clipboard || clipboard.pages.length === 0) {
      useToastStore.getState().addToast('No pages available to paste', 'warning', 4000);
      return;
    }

    const targetTab = tabs.find((t) => t.id === targetTabId);
    if (!targetTab) return;

    // Store the pasted pages in the tab's operationState under 'pastedPages' key
    const pastedPages = clipboard.pages.map((page) => ({
      index: page.index,
      data: page.data,
      width: page.width,
      height: page.height,
    }));

    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === targetTabId
          ? {
              ...tab,
              operationState: {
                ...tab.operationState,
                pastedPages: {
                  pages: pastedPages,
                  insertAfterIndex: afterPageIndex,
                },
              },
            }
          : tab,
      ),
    }));
  },
}));
