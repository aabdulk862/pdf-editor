import { describe, it, expect } from 'vitest';
import { formatShortcut, detectPlatform, type Platform } from './format';
import type { ShortcutKeys } from './types';

describe('formatShortcut', () => {
  describe('mac platform', () => {
    const platform: Platform = 'mac';

    it('formats meta + key as ⌘K', () => {
      const keys: ShortcutKeys = { key: 'k', meta: true };
      expect(formatShortcut(keys, platform)).toBe('⌘K');
    });

    it('formats ctrl + shift + key', () => {
      const keys: ShortcutKeys = { key: 'k', ctrl: true, shift: true };
      expect(formatShortcut(keys, platform)).toBe('⌃⇧K');
    });

    it('formats all modifiers in correct order', () => {
      const keys: ShortcutKeys = { key: 'a', ctrl: true, alt: true, shift: true, meta: true };
      expect(formatShortcut(keys, platform)).toBe('⌃⌥⇧⌘A');
    });

    it('formats key only (no modifiers)', () => {
      const keys: ShortcutKeys = { key: 'Escape' };
      expect(formatShortcut(keys, platform)).toBe('Escape');
    });

    it('uppercases single letter keys', () => {
      const keys: ShortcutKeys = { key: 'z', meta: true };
      expect(formatShortcut(keys, platform)).toBe('⌘Z');
    });

    it('does not uppercase multi-character keys', () => {
      const keys: ShortcutKeys = { key: 'Tab', meta: true };
      expect(formatShortcut(keys, platform)).toBe('⌘Tab');
    });

    it('uses no separator between symbols', () => {
      const keys: ShortcutKeys = { key: 'c', meta: true, shift: true };
      expect(formatShortcut(keys, platform)).toBe('⇧⌘C');
    });
  });

  describe('windows platform', () => {
    const platform: Platform = 'windows';

    it('formats ctrl + key as Ctrl+K', () => {
      const keys: ShortcutKeys = { key: 'k', ctrl: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+K');
    });

    it('formats ctrl + shift + key', () => {
      const keys: ShortcutKeys = { key: 'k', ctrl: true, shift: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+Shift+K');
    });

    it('formats all modifiers in correct order', () => {
      const keys: ShortcutKeys = { key: 'a', ctrl: true, alt: true, shift: true, meta: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+Alt+Shift+Win+A');
    });

    it('formats meta as Win', () => {
      const keys: ShortcutKeys = { key: 'k', meta: true };
      expect(formatShortcut(keys, platform)).toBe('Win+K');
    });

    it('uppercases single letter keys', () => {
      const keys: ShortcutKeys = { key: 'z', ctrl: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+Z');
    });
  });

  describe('linux platform', () => {
    const platform: Platform = 'linux';

    it('formats ctrl + key as Ctrl+K', () => {
      const keys: ShortcutKeys = { key: 'k', ctrl: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+K');
    });

    it('formats meta as Super', () => {
      const keys: ShortcutKeys = { key: 'k', meta: true };
      expect(formatShortcut(keys, platform)).toBe('Super+K');
    });

    it('formats all modifiers in correct order', () => {
      const keys: ShortcutKeys = { key: 'a', ctrl: true, alt: true, shift: true, meta: true };
      expect(formatShortcut(keys, platform)).toBe('Ctrl+Alt+Shift+Super+A');
    });
  });
});

describe('detectPlatform', () => {
  it('returns a valid platform type', () => {
    const result = detectPlatform();
    expect(['mac', 'windows', 'linux']).toContain(result);
  });
});
