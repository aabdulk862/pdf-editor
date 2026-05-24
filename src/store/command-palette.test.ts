import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandPaletteStore } from './command-palette';

describe('Command Palette Store - Circular Navigation', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useCommandPaletteStore.getState();
    store.close();
  });

  describe('moveSelection', () => {
    it('should move down from index 0 to index 1', () => {
      const store = useCommandPaletteStore.getState();
      expect(store.activeIndex).toBe(0);

      store.moveSelection('down');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(1);
    });

    it('should wrap from last item to first when moving down', () => {
      const store = useCommandPaletteStore.getState();
      const lastIndex = store.filteredItems.length - 1;

      // Set activeIndex to last item by moving down N-1 times
      for (let i = 0; i < lastIndex; i++) {
        useCommandPaletteStore.getState().moveSelection('down');
      }
      expect(useCommandPaletteStore.getState().activeIndex).toBe(lastIndex);

      // Moving down from last should wrap to 0
      useCommandPaletteStore.getState().moveSelection('down');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);
    });

    it('should wrap from first item to last when moving up', () => {
      const store = useCommandPaletteStore.getState();
      expect(store.activeIndex).toBe(0);

      // Moving up from 0 should wrap to last
      store.moveSelection('up');
      const lastIndex = useCommandPaletteStore.getState().filteredItems.length - 1;
      expect(useCommandPaletteStore.getState().activeIndex).toBe(lastIndex);
    });

    it('should move up from index 2 to index 1', () => {
      const store = useCommandPaletteStore.getState();

      // Move down twice to get to index 2
      store.moveSelection('down');
      useCommandPaletteStore.getState().moveSelection('down');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(2);

      // Move up should go to index 1
      useCommandPaletteStore.getState().moveSelection('up');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(1);
    });

    it('should not change activeIndex when filteredItems is empty', () => {
      const store = useCommandPaletteStore.getState();
      // Set a query that matches nothing
      store.setQuery('zzzzzzzzzzzzzzz');
      expect(useCommandPaletteStore.getState().filteredItems.length).toBe(0);

      useCommandPaletteStore.getState().moveSelection('down');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);

      useCommandPaletteStore.getState().moveSelection('up');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);
    });

    it('should wrap correctly with a filtered subset', () => {
      const store = useCommandPaletteStore.getState();
      // Filter to get a smaller list
      store.setQuery('merge');
      const filteredCount = useCommandPaletteStore.getState().filteredItems.length;
      expect(filteredCount).toBeGreaterThan(0);

      // Move down to last item
      for (let i = 0; i < filteredCount - 1; i++) {
        useCommandPaletteStore.getState().moveSelection('down');
      }
      expect(useCommandPaletteStore.getState().activeIndex).toBe(filteredCount - 1);

      // Wrap to first
      useCommandPaletteStore.getState().moveSelection('down');
      expect(useCommandPaletteStore.getState().activeIndex).toBe(0);
    });
  });

  describe('getActiveItem', () => {
    it('should return the first item when activeIndex is 0', () => {
      const store = useCommandPaletteStore.getState();
      const activeItem = store.getActiveItem();
      expect(activeItem).not.toBeNull();
      expect(activeItem).toEqual(store.filteredItems[0]);
    });

    it('should return the correct item after moving selection', () => {
      const store = useCommandPaletteStore.getState();
      store.moveSelection('down');
      store.moveSelection('down');

      const state = useCommandPaletteStore.getState();
      const activeItem = state.getActiveItem();
      expect(activeItem).toEqual(state.filteredItems[2]);
    });

    it('should return null when filteredItems is empty', () => {
      const store = useCommandPaletteStore.getState();
      store.setQuery('zzzzzzzzzzzzzzz');
      expect(useCommandPaletteStore.getState().getActiveItem()).toBeNull();
    });

    it('should return the correct item after wrapping up', () => {
      const store = useCommandPaletteStore.getState();
      store.moveSelection('up'); // wraps to last
      const state = useCommandPaletteStore.getState();
      const lastItem = state.filteredItems[state.filteredItems.length - 1];
      expect(state.getActiveItem()).toEqual(lastItem);
    });
  });
});
