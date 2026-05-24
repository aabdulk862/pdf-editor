import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { formatShortcut, type Platform } from './format';
import type { ShortcutKeys } from './types';

/**
 * Feature: ux-power-user-features
 * Property 4: Shortcut key formatting by platform
 *
 * For any ShortcutKeys object and any platform (mac, windows, linux),
 * the formatted string should use "⌘" for meta on mac and "Ctrl" for ctrl
 * on windows/linux, and should include all active modifiers in a consistent
 * order followed by the key.
 *
 * Validates: Requirements 4.3
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

const arbPlatform: fc.Arbitrary<Platform> = fc.constantFrom('mac', 'windows', 'linux');

describe('Feature: ux-power-user-features, Property 4: Shortcut key formatting by platform', () => {
  fcTest.prop([arbShortcutKeys, arbPlatform], { numRuns: 100 })(
    'formatted string contains correct symbols/text for each active modifier',
    (keys, platform) => {
      const result = formatShortcut(keys, platform);

      if (platform === 'mac') {
        // Mac uses symbols
        if (keys.ctrl) expect(result).toContain('⌃');
        if (keys.alt) expect(result).toContain('⌥');
        if (keys.shift) expect(result).toContain('⇧');
        if (keys.meta) expect(result).toContain('⌘');

        // Inactive modifiers should not appear
        if (!keys.ctrl) expect(result).not.toContain('⌃');
        if (!keys.alt) expect(result).not.toContain('⌥');
        if (!keys.shift) expect(result).not.toContain('⇧');
        if (!keys.meta) expect(result).not.toContain('⌘');
      } else {
        // Windows/Linux uses text
        if (keys.ctrl) expect(result).toContain('Ctrl');
        if (keys.alt) expect(result).toContain('Alt');
        if (keys.shift) expect(result).toContain('Shift');
        if (keys.meta) {
          if (platform === 'windows') expect(result).toContain('Win');
          if (platform === 'linux') expect(result).toContain('Super');
        }

        // Inactive modifiers should not appear
        if (!keys.ctrl) expect(result).not.toContain('Ctrl');
        if (!keys.alt) expect(result).not.toContain('Alt');
        if (!keys.shift) expect(result).not.toContain('Shift');
        if (!keys.meta) {
          if (platform === 'windows') expect(result).not.toContain('Win');
          if (platform === 'linux') expect(result).not.toContain('Super');
        }
      }
    },
  );

  fcTest.prop([arbShortcutKeys, arbPlatform], { numRuns: 100 })(
    'modifier order is consistent: Ctrl → Alt → Shift → Meta → Key',
    (keys, platform) => {
      const result = formatShortcut(keys, platform);

      if (platform === 'mac') {
        // Mac order: ⌃ → ⌥ → ⇧ → ⌘ → Key (no separators)
        const ctrlIdx = keys.ctrl ? result.indexOf('⌃') : -1;
        const altIdx = keys.alt ? result.indexOf('⌥') : -1;
        const shiftIdx = keys.shift ? result.indexOf('⇧') : -1;
        const metaIdx = keys.meta ? result.indexOf('⌘') : -1;

        const activeIndices = [ctrlIdx, altIdx, shiftIdx, metaIdx].filter((i) => i >= 0);

        // All active modifiers should appear in ascending index order
        for (let i = 1; i < activeIndices.length; i++) {
          expect(activeIndices[i]).toBeGreaterThan(activeIndices[i - 1]);
        }

        // The key should appear after all modifiers
        const lastModifierIdx = activeIndices.length > 0 ? Math.max(...activeIndices) : -1;
        const displayKey = keys.key.length === 1 ? keys.key.toUpperCase() : keys.key;
        const keyIdx = result.lastIndexOf(displayKey);
        expect(keyIdx).toBeGreaterThan(lastModifierIdx);
      } else {
        // Windows/Linux order: Ctrl → Alt → Shift → Win/Super → Key (with + separator)
        const parts = result.split('+');

        const expectedOrder = ['Ctrl', 'Alt', 'Shift', platform === 'windows' ? 'Win' : 'Super'];
        const activeParts = parts.slice(0, -1); // All parts except the last (which is the key)

        // Verify active modifiers appear in the expected order
        let lastExpectedIdx = -1;
        for (const part of activeParts) {
          const expectedIdx = expectedOrder.indexOf(part);
          expect(expectedIdx).toBeGreaterThan(lastExpectedIdx);
          lastExpectedIdx = expectedIdx;
        }

        // The last part should be the key
        const displayKey = keys.key.length === 1 ? keys.key.toUpperCase() : keys.key;
        expect(parts[parts.length - 1]).toBe(displayKey);
      }
    },
  );

  fcTest.prop([arbShortcutKeys, arbPlatform], { numRuns: 100 })(
    'formatted string always ends with the key',
    (keys, platform) => {
      const result = formatShortcut(keys, platform);
      const displayKey = keys.key.length === 1 ? keys.key.toUpperCase() : keys.key;

      expect(result).toContain(displayKey);
      expect(result.endsWith(displayKey)).toBe(true);
    },
  );
});
