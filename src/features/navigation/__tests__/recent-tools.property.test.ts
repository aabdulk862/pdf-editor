import { describe, it, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useNavStore } from '../store/nav-store';

/**
 * Property-based test: Recent Tools Length/Ordering Invariant
 *
 * **Validates: Requirements 2.3**
 *
 * Property: After any sequence of tool path additions to the recent list,
 * the list length never exceeds 5 items, is ordered most-recent-first,
 * and has no duplicates.
 */
describe('Recent Tools Length/Ordering Invariant', () => {
  beforeEach(() => {
    useNavStore.setState({
      favorites: [],
      recentTools: [],
      collapsedCategories: {},
      sidebarCollapsed: false,
      filterQuery: '',
      usageCounts: {},
    });
    localStorage.clear();
  });

  it('recent tools list never exceeds 5 items after any sequence of additions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 50 }),
        (toolPaths) => {
          // Reset store before each test case
          useNavStore.setState({ recentTools: [] });

          // Apply each addition in sequence
          for (const path of toolPaths) {
            useNavStore.getState().addRecentTool(path);
          }

          const recents = useNavStore.getState().recentTools;
          return recents.length <= 5;
        },
      ),
    );
  });

  it('recent tools list has no duplicate entries after any sequence of additions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 50 }),
        (toolPaths) => {
          // Reset store before each test case
          useNavStore.setState({ recentTools: [] });

          // Apply each addition in sequence
          for (const path of toolPaths) {
            useNavStore.getState().addRecentTool(path);
          }

          const recents = useNavStore.getState().recentTools;
          const uniqueSet = new Set(recents);
          return uniqueSet.size === recents.length;
        },
      ),
    );
  });

  it('recent tools list is ordered most-recent-first after any sequence of additions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 50 }),
        (toolPaths) => {
          // Reset store before each test case
          useNavStore.setState({ recentTools: [] });

          // Apply each addition in sequence
          for (const path of toolPaths) {
            useNavStore.getState().addRecentTool(path);
          }

          const recents = useNavStore.getState().recentTools;

          // The most recently added tool should be first
          // Find the last unique tool added (last occurrence of each path determines recency)
          const lastAdded = toolPaths[toolPaths.length - 1];
          if (recents.length > 0) {
            return recents[0] === lastAdded;
          }
          return true;
        },
      ),
    );
  });

  it('ordering reflects recency: later additions appear before earlier ones', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 50 }),
        (toolPaths) => {
          // Reset store before each test case
          useNavStore.setState({ recentTools: [] });

          // Apply each addition in sequence
          for (const path of toolPaths) {
            useNavStore.getState().addRecentTool(path);
          }

          const recents = useNavStore.getState().recentTools;

          // For any two items in the recents list, the one at a lower index
          // was added more recently (i.e., its last occurrence in toolPaths is later)
          for (let i = 0; i < recents.length - 1; i++) {
            const lastIndexI = toolPaths.lastIndexOf(recents[i]);
            const lastIndexJ = toolPaths.lastIndexOf(recents[i + 1]);
            if (lastIndexI <= lastIndexJ) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
