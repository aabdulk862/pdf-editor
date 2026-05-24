/**
 * Feature: ux-power-user-features
 * Tab Manager Property Tests (Properties 6, 7, 8, 9, 10)
 *
 * Property 6: File name truncation
 * Property 7: Tab state preservation on switch
 * Property 8: Tab close active selection
 * Property 9: Tab cycling wraps correctly
 * Property 10: Copy-paste page data round trip
 *
 * Validates: Requirements 5.1, 5.4, 5.5, 5.9, 6.1, 6.2, 6.3
 */
import { describe, expect, beforeEach } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { truncateFileName } from './utils';
import { useTabStore } from '../../store/tabs';
import type { DocumentTab, PageData } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createTab(overrides: Partial<DocumentTab> = {}): DocumentTab {
  return {
    id: generateId(),
    fileName: 'test.pdf',
    fileData: new ArrayBuffer(0),
    fileSize: 1024,
    operationRoute: '/compress',
    operationState: {},
    createdAt: Date.now(),
    ...overrides,
  };
}

function resetTabStore(): void {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    clipboard: null,
    maxTabs: 10,
  });
}

// ─── Property 6: File name truncation ───────────────────────────────────────

describe('Feature: ux-power-user-features, Property 6: File name truncation', () => {
  fcTest.prop([fc.string({ minLength: 0, maxLength: 200 })], { numRuns: 100 })(
    'truncated display name has length at most 24 characters',
    (name) => {
      const result = truncateFileName(name);
      expect(result.length).toBeLessThanOrEqual(24);
    },
  );

  fcTest.prop([fc.string({ minLength: 25, maxLength: 200 })], { numRuns: 100 })(
    'names exceeding 24 characters end with "…" and have exactly 24 characters',
    (name) => {
      const result = truncateFileName(name);
      expect(result.length).toBe(24);
      expect(result.endsWith('\u2026')).toBe(true);
    },
  );

  fcTest.prop([fc.string({ minLength: 0, maxLength: 24 })], { numRuns: 100 })(
    'names of 24 characters or fewer are returned unchanged',
    (name) => {
      const result = truncateFileName(name);
      expect(result).toBe(name);
    },
  );
});

// ─── Property 7: Tab state preservation on switch ───────────────────────────

describe('Feature: ux-power-user-features, Property 7: Tab state preservation on switch', () => {
  beforeEach(() => {
    resetTabStore();
  });

  // Arbitrary for operation state: a record of string keys to JSON-serializable values
  const operationStateArb = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    fc.oneof(
      fc.integer(),
      fc.string({ maxLength: 50 }),
      fc.boolean(),
      fc.constant(null),
      fc.array(fc.integer(), { maxLength: 5 }),
    ),
  );

  fcTest.prop([operationStateArb], { numRuns: 100 })(
    'switching away and back preserves operation state',
    (state) => {
      resetTabStore();

      // Create two tabs
      const tab1 = createTab({ id: 'tab-1', operationState: state });
      const tab2 = createTab({ id: 'tab-2', operationState: { other: true } });

      useTabStore.setState({
        tabs: [tab1, tab2],
        activeTabId: 'tab-1',
      });

      // Switch to tab2
      useTabStore.getState().switchTab('tab-2');
      expect(useTabStore.getState().activeTabId).toBe('tab-2');

      // Switch back to tab1
      useTabStore.getState().switchTab('tab-1');
      expect(useTabStore.getState().activeTabId).toBe('tab-1');

      // Verify operation state is preserved
      const restoredTab = useTabStore.getState().tabs.find((t) => t.id === 'tab-1');
      expect(restoredTab?.operationState).toEqual(state);
    },
  );
});

// ─── Property 8: Tab close active selection ─────────────────────────────────

describe('Feature: ux-power-user-features, Property 8: Tab close active selection', () => {
  beforeEach(() => {
    resetTabStore();
  });

  // Generate N tabs (N > 1) and an index i to close
  const tabCloseArb = fc
    .integer({ min: 2, max: 10 })
    .chain((n) => fc.tuple(fc.constant(n), fc.integer({ min: 0, max: n - 1 })));

  fcTest.prop([tabCloseArb], { numRuns: 100 })(
    'closing tab at index i selects tab at i-1 (or index 0 if i==0)',
    ([n, closeIndex]) => {
      resetTabStore();

      // Create N tabs
      const tabs: DocumentTab[] = Array.from({ length: n }, (_, idx) =>
        createTab({ id: `tab-${idx}`, fileName: `file-${idx}.pdf` }),
      );

      // Set the active tab to the one we're about to close
      useTabStore.setState({
        tabs,
        activeTabId: tabs[closeIndex].id,
      });

      // Close the active tab
      useTabStore.getState().closeTab(tabs[closeIndex].id);

      const { activeTabId, tabs: remainingTabs } = useTabStore.getState();

      // Remaining tabs should have n-1 entries
      expect(remainingTabs.length).toBe(n - 1);

      if (closeIndex > 0) {
        // Should select the tab to the left (i-1 in the original array)
        expect(activeTabId).toBe(tabs[closeIndex - 1].id);
      } else {
        // Was leftmost, should select the next remaining tab (originally at index 1, now at index 0)
        expect(activeTabId).toBe(tabs[1].id);
      }
    },
  );
});

// ─── Property 9: Tab cycling wraps correctly ────────────────────────────────

describe('Feature: ux-power-user-features, Property 9: Tab cycling wraps correctly', () => {
  beforeEach(() => {
    resetTabStore();
  });

  // Generate N tabs (N > 0) and an active index i
  const tabCycleArb = fc
    .integer({ min: 1, max: 10 })
    .chain((n) => fc.tuple(fc.constant(n), fc.integer({ min: 0, max: n - 1 })));

  fcTest.prop([tabCycleArb], { numRuns: 100 })(
    'cycling next from index i activates tab at (i+1) % N',
    ([n, activeIndex]) => {
      resetTabStore();

      // Create N tabs
      const tabs: DocumentTab[] = Array.from({ length: n }, (_, idx) =>
        createTab({ id: `tab-${idx}`, fileName: `file-${idx}.pdf` }),
      );

      useTabStore.setState({
        tabs,
        activeTabId: tabs[activeIndex].id,
      });

      // Cycle to next
      useTabStore.getState().cycleTab('next');

      const expectedIndex = (activeIndex + 1) % n;
      expect(useTabStore.getState().activeTabId).toBe(tabs[expectedIndex].id);
    },
  );
});

// ─── Property 10: Copy-paste page data round trip ───────────────────────────

describe('Feature: ux-power-user-features, Property 10: Copy-paste page data round trip', () => {
  beforeEach(() => {
    resetTabStore();
  });

  // Arbitrary for page data: generates pages with random ArrayBuffer content
  const pageDataArb = fc
    .integer({ min: 1, max: 50 })
    .chain((numPages) =>
      fc.array(
        fc.tuple(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
        ),
        { minLength: numPages, maxLength: numPages },
      ),
    )
    .map((entries) =>
      entries.map(([bytes, width, height], index) => ({
        index,
        data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        width,
        height,
      })),
    );

  // Arbitrary for paste position (null means end, or a valid index)
  const pastePositionArb = fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined });

  fcTest.prop([pageDataArb, pastePositionArb], { numRuns: 100 })(
    'pasted pages are byte-identical to copied source pages at correct position',
    (pages, afterPageIndex) => {
      resetTabStore();

      // Create source and target tabs
      const sourceTab = createTab({ id: 'source-tab' });
      const targetTab = createTab({ id: 'target-tab' });

      useTabStore.setState({
        tabs: [sourceTab, targetTab],
        activeTabId: 'source-tab',
        clipboard: null,
      });

      // Copy pages from source tab
      useTabStore.getState().copyPages(pages);

      // Verify clipboard was set
      const { clipboard } = useTabStore.getState();
      expect(clipboard).not.toBeNull();
      expect(clipboard!.pages.length).toBe(pages.length);

      // Paste into target tab
      const insertPosition = afterPageIndex ?? null;
      useTabStore.getState().pastePages('target-tab', insertPosition);

      // Verify pasted pages in target tab's operation state
      const updatedTarget = useTabStore.getState().tabs.find((t) => t.id === 'target-tab');
      expect(updatedTarget).toBeDefined();

      const pastedData = updatedTarget!.operationState.pastedPages as {
        pages: PageData[];
        insertAfterIndex: number | null;
      };

      expect(pastedData).toBeDefined();
      expect(pastedData.pages.length).toBe(pages.length);
      expect(pastedData.insertAfterIndex).toBe(insertPosition);

      // Verify byte-identical content
      for (let i = 0; i < pages.length; i++) {
        const sourcePage = pages[i];
        const pastedPage = pastedData.pages[i];

        // Compare dimensions
        expect(pastedPage.width).toBe(sourcePage.width);
        expect(pastedPage.height).toBe(sourcePage.height);

        // Compare ArrayBuffer content byte-by-byte
        const sourceBytes = new Uint8Array(sourcePage.data);
        const pastedBytes = new Uint8Array(pastedPage.data);
        expect(pastedBytes.length).toBe(sourceBytes.length);

        for (let j = 0; j < sourceBytes.length; j++) {
          expect(pastedBytes[j]).toBe(sourceBytes[j]);
        }
      }
    },
  );
});
