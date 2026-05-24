import { describe, expect, beforeEach } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { useCommandPaletteStore } from '../../store/command-palette';
import type { CommandItem } from './types';

/**
 * Feature: ux-power-user-features
 * Property 2: Command palette circular navigation
 *
 * For any filtered list of N items (N > 0) and any active index i,
 * pressing ArrowDown from index N-1 should yield index 0, and pressing
 * ArrowUp from index 0 should yield index N-1. More generally, moving
 * down from index i yields (i+1) % N, and moving up from index i yields
 * (i-1+N) % N.
 *
 * Validates: Requirements 2.4, 2.5
 */

const commandItemArb: fc.Arbitrary<CommandItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  route: fc.string({ minLength: 1, maxLength: 30 }).map((s) => `/${s}`),
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  category: fc.constantFrom('operation' as const, 'navigation' as const, 'action' as const),
  icon: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
});

describe('Feature: ux-power-user-features, Property 2: Command palette circular navigation', () => {
  beforeEach(() => {
    // Reset the store to default state before each test
    useCommandPaletteStore.setState({
      isOpen: false,
      query: '',
      activeIndex: 0,
      filteredItems: useCommandPaletteStore.getState().items,
      previousFocusElement: null,
    });
  });

  fcTest.prop([fc.array(commandItemArb, { minLength: 1, maxLength: 30 }), fc.nat()], {
    numRuns: 100,
  })('moveSelection("down") from index i yields (i+1) % N', (items, rawIndex) => {
    const N = items.length;
    const i = rawIndex % N;

    // Set up the store with the generated items and active index
    useCommandPaletteStore.setState({
      isOpen: true,
      filteredItems: items,
      activeIndex: i,
    });

    // Move down
    useCommandPaletteStore.getState().moveSelection('down');

    const expectedIndex = (i + 1) % N;
    expect(useCommandPaletteStore.getState().activeIndex).toBe(expectedIndex);
  });

  fcTest.prop([fc.array(commandItemArb, { minLength: 1, maxLength: 30 }), fc.nat()], {
    numRuns: 100,
  })('moveSelection("up") from index i yields (i-1+N) % N', (items, rawIndex) => {
    const N = items.length;
    const i = rawIndex % N;

    // Set up the store with the generated items and active index
    useCommandPaletteStore.setState({
      isOpen: true,
      filteredItems: items,
      activeIndex: i,
    });

    // Move up
    useCommandPaletteStore.getState().moveSelection('up');

    const expectedIndex = (i - 1 + N) % N;
    expect(useCommandPaletteStore.getState().activeIndex).toBe(expectedIndex);
  });
});
