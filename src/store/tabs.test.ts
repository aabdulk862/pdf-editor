import { describe, it, expect, beforeEach } from 'vitest';

import { useTabStore } from './tabs';
import { truncateFileName } from '../features/tabs/utils';
import type { PageData } from '../features/tabs/types';
import { useToastStore } from './toast';

function createMockFile(name: string, size: number = 1024): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type: 'application/pdf' });
}

function resetStore() {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    clipboard: null,
    maxTabs: 10,
  });
}

describe('truncateFileName', () => {
  it('returns name unchanged if within max length', () => {
    expect(truncateFileName('short.pdf')).toBe('short.pdf');
  });

  it('returns name unchanged if exactly max length', () => {
    const name = 'a'.repeat(24);
    expect(truncateFileName(name)).toBe(name);
  });

  it('truncates and appends ellipsis if name exceeds max length', () => {
    const name = 'a'.repeat(30);
    const result = truncateFileName(name);
    expect(result.length).toBe(24);
    expect(result.endsWith('\u2026')).toBe(true);
    expect(result).toBe('a'.repeat(23) + '\u2026');
  });

  it('respects custom max parameter', () => {
    const name = 'abcdefghij'; // 10 chars
    const result = truncateFileName(name, 5);
    expect(result.length).toBe(5);
    expect(result).toBe('abcd\u2026');
  });
});

describe('useTabStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('openTab', () => {
    it('creates a new tab and sets it as active', () => {
      const file = createMockFile('test.pdf');
      const result = useTabStore.getState().openTab(file, '/compress');

      expect(result).toBe(true);

      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].fileName).toBe('test.pdf');
      expect(state.tabs[0].operationRoute).toBe('/compress');
      expect(state.tabs[0].operationState).toEqual({});
      expect(state.activeTabId).toBe(state.tabs[0].id);
    });

    it('truncates long file names', () => {
      const longName = 'a_very_long_filename_that_exceeds_limit.pdf';
      const file = createMockFile(longName);
      useTabStore.getState().openTab(file, '/merge');

      const state = useTabStore.getState();
      expect(state.tabs[0].fileName.length).toBeLessThanOrEqual(24);
    });

    it('rejects when max tabs reached', () => {
      // Open 10 tabs
      for (let i = 0; i < 10; i++) {
        useTabStore.getState().openTab(createMockFile(`file${i}.pdf`), '/compress');
      }

      expect(useTabStore.getState().tabs).toHaveLength(10);

      // 11th should be rejected
      const result = useTabStore.getState().openTab(createMockFile('extra.pdf'), '/merge');
      expect(result).toBe(false);
      expect(useTabStore.getState().tabs).toHaveLength(10);
    });
  });

  describe('closeTab', () => {
    it('removes the tab from the list', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      const tabId = useTabStore.getState().tabs[0].id;
      useTabStore.getState().closeTab(tabId);

      expect(useTabStore.getState().tabs).toHaveLength(1);
      expect(useTabStore.getState().tabs[0].fileName).toBe('b.pdf');
    });

    it('switches to left neighbor when active tab is closed', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');
      useTabStore.getState().openTab(createMockFile('c.pdf'), '/split');

      // Active is 'c' (last opened). Switch to 'b' then close it.
      const tabB = useTabStore.getState().tabs[1];
      useTabStore.getState().switchTab(tabB.id);
      useTabStore.getState().closeTab(tabB.id);

      // Should switch to left neighbor 'a'
      const tabA = useTabStore.getState().tabs[0];
      expect(useTabStore.getState().activeTabId).toBe(tabA.id);
    });

    it('switches to right neighbor when leftmost active tab is closed', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      const tabA = useTabStore.getState().tabs[0];
      useTabStore.getState().switchTab(tabA.id);
      useTabStore.getState().closeTab(tabA.id);

      const tabB = useTabStore.getState().tabs[0];
      expect(useTabStore.getState().activeTabId).toBe(tabB.id);
    });

    it('sets activeTabId to null when last tab is closed', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const tabId = useTabStore.getState().tabs[0].id;
      useTabStore.getState().closeTab(tabId);

      expect(useTabStore.getState().tabs).toHaveLength(0);
      expect(useTabStore.getState().activeTabId).toBeNull();
    });

    it('does nothing for non-existent tab id', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().closeTab('non-existent-id');

      expect(useTabStore.getState().tabs).toHaveLength(1);
    });
  });

  describe('switchTab', () => {
    it('sets the active tab id', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      const tabA = useTabStore.getState().tabs[0];
      useTabStore.getState().switchTab(tabA.id);

      expect(useTabStore.getState().activeTabId).toBe(tabA.id);
    });
  });

  describe('cycleTab', () => {
    it('cycles to next tab', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');
      useTabStore.getState().openTab(createMockFile('c.pdf'), '/split');

      // Active is 'c' (index 2). Switch to 'a' (index 0) first.
      const tabA = useTabStore.getState().tabs[0];
      useTabStore.getState().switchTab(tabA.id);

      useTabStore.getState().cycleTab('next');
      const tabB = useTabStore.getState().tabs[1];
      expect(useTabStore.getState().activeTabId).toBe(tabB.id);
    });

    it('wraps from last to first on next', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      // Active is 'b' (last). Cycle next should wrap to 'a'.
      useTabStore.getState().cycleTab('next');
      const tabA = useTabStore.getState().tabs[0];
      expect(useTabStore.getState().activeTabId).toBe(tabA.id);
    });

    it('wraps from first to last on prev', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      const tabA = useTabStore.getState().tabs[0];
      useTabStore.getState().switchTab(tabA.id);

      useTabStore.getState().cycleTab('prev');
      const tabB = useTabStore.getState().tabs[1];
      expect(useTabStore.getState().activeTabId).toBe(tabB.id);
    });

    it('does nothing with no tabs', () => {
      useTabStore.getState().cycleTab('next');
      expect(useTabStore.getState().activeTabId).toBeNull();
    });
  });

  describe('updateTabState', () => {
    it('merges state into the tab operationState', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      useTabStore.getState().updateTabState(tabId, { quality: 'high' });
      expect(useTabStore.getState().tabs[0].operationState).toEqual({ quality: 'high' });

      useTabStore.getState().updateTabState(tabId, { pages: [1, 2, 3] });
      expect(useTabStore.getState().tabs[0].operationState).toEqual({
        quality: 'high',
        pages: [1, 2, 3],
      });
    });

    it('does not affect other tabs', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      useTabStore.getState().openTab(createMockFile('b.pdf'), '/merge');

      const tabAId = useTabStore.getState().tabs[0].id;
      useTabStore.getState().updateTabState(tabAId, { quality: 'high' });

      expect(useTabStore.getState().tabs[1].operationState).toEqual({});
    });
  });

  describe('getActiveTab', () => {
    it('returns the active tab', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tab = useTabStore.getState().getActiveTab();

      expect(tab).not.toBeNull();
      expect(tab!.fileName).toBe('a.pdf');
    });

    it('returns null when no tabs are open', () => {
      expect(useTabStore.getState().getActiveTab()).toBeNull();
    });

    it('returns null when activeTabId does not match any tab', () => {
      useTabStore.setState({ activeTabId: 'non-existent' });
      expect(useTabStore.getState().getActiveTab()).toBeNull();
    });
  });

  describe('copyPages', () => {
    function createPageData(count: number): PageData[] {
      return Array.from({ length: count }, (_, i) => ({
        index: i,
        data: new ArrayBuffer(100),
        width: 612,
        height: 792,
      }));
    }

    it('stores pages in clipboard with source tab id and timestamp', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const activeTabId = useTabStore.getState().activeTabId!;

      const pages = createPageData(3);
      useTabStore.getState().copyPages(pages);

      const clipboard = useTabStore.getState().clipboard;
      expect(clipboard).not.toBeNull();
      expect(clipboard!.pages).toHaveLength(3);
      expect(clipboard!.sourceTabId).toBe(activeTabId);
      expect(clipboard!.copiedAt).toBeGreaterThan(0);
    });

    it('truncates to 50 pages and shows toast when more than 50 selected', () => {
      useToastStore.setState({ toasts: [] });
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const pages = createPageData(60);
      useTabStore.getState().copyPages(pages);

      const clipboard = useTabStore.getState().clipboard;
      expect(clipboard!.pages).toHaveLength(50);

      // Verify toast was shown
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.message === 'Selection truncated to maximum 50 pages')).toBe(
        true,
      );
    });

    it('stores exactly 50 pages without toast when exactly 50 selected', () => {
      useToastStore.setState({ toasts: [] });
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const pages = createPageData(50);
      useTabStore.getState().copyPages(pages);

      const clipboard = useTabStore.getState().clipboard;
      expect(clipboard!.pages).toHaveLength(50);

      // No truncation toast
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.message === 'Selection truncated to maximum 50 pages')).toBe(
        false,
      );
    });

    it('replaces previous clipboard content', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const pages1 = createPageData(2);
      useTabStore.getState().copyPages(pages1);
      expect(useTabStore.getState().clipboard!.pages).toHaveLength(2);

      const pages2 = createPageData(5);
      useTabStore.getState().copyPages(pages2);
      expect(useTabStore.getState().clipboard!.pages).toHaveLength(5);
    });

    it('preserves page dimensions in clipboard', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const pages: PageData[] = [
        { index: 0, data: new ArrayBuffer(50), width: 800, height: 600 },
        { index: 1, data: new ArrayBuffer(75), width: 1024, height: 768 },
      ];
      useTabStore.getState().copyPages(pages);

      const clipboard = useTabStore.getState().clipboard!;
      expect(clipboard.pages[0].width).toBe(800);
      expect(clipboard.pages[0].height).toBe(600);
      expect(clipboard.pages[1].width).toBe(1024);
      expect(clipboard.pages[1].height).toBe(768);
    });
  });

  describe('pastePages', () => {
    function createPageData(count: number): PageData[] {
      return Array.from({ length: count }, (_, i) => ({
        index: i,
        data: new ArrayBuffer(100),
        width: 612,
        height: 792,
      }));
    }

    it('shows toast when clipboard is empty', () => {
      useToastStore.setState({ toasts: [] });
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      useTabStore.getState().pastePages(tabId, 0);

      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.message === 'No pages available to paste')).toBe(true);
    });

    it('shows toast when clipboard has zero pages', () => {
      useToastStore.setState({ toasts: [] });
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      // Set clipboard with empty pages array
      useTabStore.setState({
        clipboard: { pages: [], sourceTabId: 'some-tab', copiedAt: Date.now() },
      });

      useTabStore.getState().pastePages(tabId, 0);

      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.message === 'No pages available to paste')).toBe(true);
    });

    it('inserts pages after specified index in operationState', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      const pages = createPageData(3);
      useTabStore.getState().copyPages(pages);

      useTabStore.getState().pastePages(tabId, 2);

      const tab = useTabStore.getState().tabs[0];
      const pastedData = tab.operationState.pastedPages as {
        pages: PageData[];
        insertAfterIndex: number | null;
      };
      expect(pastedData.pages).toHaveLength(3);
      expect(pastedData.insertAfterIndex).toBe(2);
    });

    it('inserts at end when afterPageIndex is null', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      const pages = createPageData(2);
      useTabStore.getState().copyPages(pages);

      useTabStore.getState().pastePages(tabId, null);

      const tab = useTabStore.getState().tabs[0];
      const pastedData = tab.operationState.pastedPages as {
        pages: PageData[];
        insertAfterIndex: number | null;
      };
      expect(pastedData.pages).toHaveLength(2);
      expect(pastedData.insertAfterIndex).toBeNull();
    });

    it('preserves page content and dimensions on paste', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');
      const tabId = useTabStore.getState().tabs[0].id;

      const pages: PageData[] = [
        { index: 0, data: new ArrayBuffer(50), width: 800, height: 600 },
        { index: 1, data: new ArrayBuffer(75), width: 1024, height: 768 },
      ];
      useTabStore.getState().copyPages(pages);

      useTabStore.getState().pastePages(tabId, 0);

      const tab = useTabStore.getState().tabs[0];
      const pastedData = tab.operationState.pastedPages as {
        pages: PageData[];
        insertAfterIndex: number | null;
      };
      expect(pastedData.pages[0].width).toBe(800);
      expect(pastedData.pages[0].height).toBe(600);
      expect(pastedData.pages[0].data.byteLength).toBe(50);
      expect(pastedData.pages[1].width).toBe(1024);
      expect(pastedData.pages[1].height).toBe(768);
      expect(pastedData.pages[1].data.byteLength).toBe(75);
    });

    it('retains clipboard data when source tab is closed', () => {
      useTabStore.getState().openTab(createMockFile('source.pdf'), '/compress');
      const sourceTabId = useTabStore.getState().tabs[0].id;

      const pages = createPageData(3);
      useTabStore.getState().copyPages(pages);

      // Open a second tab and close the source
      useTabStore.getState().openTab(createMockFile('target.pdf'), '/merge');
      useTabStore.getState().closeTab(sourceTabId);

      // Clipboard should still be available
      const clipboard = useTabStore.getState().clipboard;
      expect(clipboard).not.toBeNull();
      expect(clipboard!.pages).toHaveLength(3);

      // Paste into the remaining tab
      const targetTabId = useTabStore.getState().tabs[0].id;
      useTabStore.getState().pastePages(targetTabId, null);

      const tab = useTabStore.getState().tabs[0];
      const pastedData = tab.operationState.pastedPages as {
        pages: PageData[];
        insertAfterIndex: number | null;
      };
      expect(pastedData.pages).toHaveLength(3);
    });

    it('does nothing for non-existent target tab', () => {
      useTabStore.getState().openTab(createMockFile('a.pdf'), '/compress');

      const pages = createPageData(2);
      useTabStore.getState().copyPages(pages);

      // Paste to non-existent tab — should not throw
      useTabStore.getState().pastePages('non-existent-tab', 0);

      // Original tab should be unaffected
      const tab = useTabStore.getState().tabs[0];
      expect(tab.operationState.pastedPages).toBeUndefined();
    });
  });
});
