import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { filterCommands } from './filter';
import type { CommandItem } from './types';

/**
 * Feature: ux-power-user-features
 * Property 1: Command search filter correctness
 *
 * For any query string and any list of command items, the filtered results
 * should contain exactly those items where every space-separated token in
 * the query appears as a case-insensitive substring in the item's name or description.
 *
 * Validates: Requirements 2.2
 */

const commandItemArb: fc.Arbitrary<CommandItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 0, maxLength: 50 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  route: fc.string({ minLength: 1, maxLength: 30 }).map((s) => `/${s}`),
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  category: fc.constantFrom('operation' as const, 'navigation' as const, 'action' as const),
  icon: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
});

const queryArb = fc.string({ minLength: 0, maxLength: 60 });

function referenceFilter(items: CommandItem[], query: string): CommandItem[] {
  const trimmed = query.trim();
  if (trimmed === '') {
    return items;
  }

  const tokens = trimmed.toLowerCase().split(/\s+/);

  return items.filter((item) => {
    const name = item.name.toLowerCase();
    const description = item.description.toLowerCase();
    return tokens.every((token) => name.includes(token) || description.includes(token));
  });
}

describe('Feature: ux-power-user-features, Property 1: Command search filter correctness', () => {
  fcTest.prop([fc.array(commandItemArb, { minLength: 0, maxLength: 20 }), queryArb], {
    numRuns: 100,
  })(
    'filterCommands returns exactly the items matching the multi-token substring rule',
    (items, query) => {
      const actual = filterCommands(items, query);
      const expected = referenceFilter(items, query);

      // Same length
      expect(actual.length).toBe(expected.length);

      // Same items in same order
      expect(actual.map((item) => item.id)).toEqual(expected.map((item) => item.id));
    },
  );
});
