import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { filterShortcuts } from './ShortcutReferencePanel';
import { formatShortcut, type Platform } from './format';
import type { ShortcutBinding, ShortcutCategory, ShortcutKeys, ShortcutScope } from './types';

/**
 * Feature: ux-power-user-features
 * Property 5: Shortcut reference panel search
 *
 * For any search query and any set of shortcut bindings, the filtered results
 * should contain exactly those bindings where every space-separated token in
 * the query appears as a case-insensitive substring in the binding's label or
 * formatted key combination string.
 *
 * Validates: Requirements 4.5
 */

const arbKey = fc.oneof(
  fc.constantFrom(
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ),
  fc.constantFrom('Enter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown'),
);

const arbShortcutKeys: fc.Arbitrary<ShortcutKeys> = fc.record({
  key: arbKey,
  ctrl: fc.boolean(),
  meta: fc.boolean(),
  shift: fc.boolean(),
  alt: fc.boolean(),
});

const arbCategory: fc.Arbitrary<ShortcutCategory> = fc.constantFrom(
  'navigation',
  'operations',
  'application',
);
const arbScope: fc.Arbitrary<ShortcutScope> = fc.constantFrom('global', 'panel', 'modal');
const arbPlatform: fc.Arbitrary<Platform> = fc.constantFrom('mac', 'windows', 'linux');

const arbLabel = fc.string({ minLength: 1, maxLength: 30 }).map(
  (s) =>
    // Ensure at least one non-whitespace character for a meaningful label
    s.replace(/[^\w\s-]/g, 'x') || 'label',
);

const arbBinding: fc.Arbitrary<ShortcutBinding> = fc.record({
  id: fc.uuid(),
  keys: arbShortcutKeys,
  action: fc.constant(() => {}),
  label: arbLabel,
  category: arbCategory,
  scope: arbScope,
  bypassInputFocus: fc.boolean(),
});

const arbBindings = fc.array(arbBinding, { minLength: 0, maxLength: 15 });

const arbQuery = fc.string({ minLength: 0, maxLength: 20 });

/**
 * Reference implementation of the multi-token search filter.
 * Each space-separated token must appear as a case-insensitive substring
 * in the binding's label or formatted key combination string.
 */
function referenceFilter(
  bindings: ShortcutBinding[],
  query: string,
  platform: Platform,
): ShortcutBinding[] {
  const trimmed = query.trim();
  if (!trimmed) return bindings;

  const tokens = trimmed.toLowerCase().split(/\s+/);

  return bindings.filter((binding) => {
    const label = binding.label.toLowerCase();
    const formatted = formatShortcut(binding.keys, platform).toLowerCase();
    const searchable = `${label} ${formatted}`;

    return tokens.every((token) => searchable.includes(token));
  });
}

describe('Feature: ux-power-user-features, Property 5: Shortcut reference panel search', () => {
  fcTest.prop([arbBindings, arbQuery, arbPlatform], { numRuns: 100 })(
    'filterShortcuts returns exactly the bindings matching the multi-token rule',
    (bindings, query, platform) => {
      const actual = filterShortcuts(bindings, query, platform);
      const expected = referenceFilter(bindings, query, platform);

      // Same length
      expect(actual.length).toBe(expected.length);

      // Same set of binding IDs (order preserved)
      const actualIds = actual.map((b) => b.id);
      const expectedIds = expected.map((b) => b.id);
      expect(actualIds).toEqual(expectedIds);
    },
  );

  fcTest.prop([arbBindings, arbQuery, arbPlatform], { numRuns: 100 })(
    'every returned binding has all query tokens in its label or formatted key string',
    (bindings, query, platform) => {
      const results = filterShortcuts(bindings, query, platform);
      const trimmed = query.trim();

      if (!trimmed) {
        // Empty query returns all bindings
        expect(results.length).toBe(bindings.length);
        return;
      }

      const tokens = trimmed.toLowerCase().split(/\s+/);

      for (const binding of results) {
        const label = binding.label.toLowerCase();
        const formatted = formatShortcut(binding.keys, platform).toLowerCase();
        const searchable = `${label} ${formatted}`;

        for (const token of tokens) {
          expect(searchable).toContain(token);
        }
      }
    },
  );

  fcTest.prop([arbBindings, arbQuery, arbPlatform], { numRuns: 100 })(
    'no excluded binding satisfies all query tokens',
    (bindings, query, platform) => {
      const results = filterShortcuts(bindings, query, platform);
      const trimmed = query.trim();

      if (!trimmed) return; // Empty query returns all, nothing excluded

      const tokens = trimmed.toLowerCase().split(/\s+/);
      const resultIds = new Set(results.map((b) => b.id));

      // Every binding NOT in results must fail at least one token
      for (const binding of bindings) {
        if (resultIds.has(binding.id)) continue;

        const label = binding.label.toLowerCase();
        const formatted = formatShortcut(binding.keys, platform).toLowerCase();
        const searchable = `${label} ${formatted}`;

        const allMatch = tokens.every((token) => searchable.includes(token));
        expect(allMatch).toBe(false);
      }
    },
  );

  fcTest.prop([arbBindings, arbPlatform], { numRuns: 100 })(
    'empty query returns all bindings unchanged',
    (bindings, platform) => {
      const emptyResults = filterShortcuts(bindings, '', platform);
      expect(emptyResults.length).toBe(bindings.length);
      expect(emptyResults.map((b) => b.id)).toEqual(bindings.map((b) => b.id));

      const whitespaceResults = filterShortcuts(bindings, '   ', platform);
      expect(whitespaceResults.length).toBe(bindings.length);
      expect(whitespaceResults.map((b) => b.id)).toEqual(bindings.map((b) => b.id));
    },
  );
});
