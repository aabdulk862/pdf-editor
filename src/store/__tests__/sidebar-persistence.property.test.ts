import { describe, it, beforeEach } from 'vitest';
import fc from 'fast-check';
import { useSidebarStore } from '../sidebar';

const STORAGE_KEY = 'pdf-editor-sidebar-collapsed';

/**
 * Property-based test: Sidebar State Persistence Round-Trip
 *
 * **Validates: Requirements 1.5**
 *
 * Property: For any sidebar collapsed state (true or false), writing the state
 * to localStorage and reading it back produces the same value.
 */
describe('Sidebar State Persistence Round-Trip', () => {
  beforeEach(() => {
    localStorage.clear();
    useSidebarStore.setState({ collapsed: false, mobileOpen: false });
  });

  it('writing collapsed state to localStorage and reading it back produces the same value', () => {
    fc.assert(
      fc.property(fc.boolean(), (collapsed) => {
        // Write state via the store's setCollapsed action
        useSidebarStore.getState().setCollapsed(collapsed);

        // Read back from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);

        // Verify round-trip: stored value equals the original
        return stored === String(collapsed);
      }),
    );
  });

  it('store state matches the value written to localStorage', () => {
    fc.assert(
      fc.property(fc.boolean(), (collapsed) => {
        // Write state via the store's setCollapsed action
        useSidebarStore.getState().setCollapsed(collapsed);

        // Verify the store's internal state also matches
        const storeState = useSidebarStore.getState().collapsed;

        return storeState === collapsed;
      }),
    );
  });
});
