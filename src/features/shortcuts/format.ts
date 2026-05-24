import type { ShortcutKeys } from './types';

export type Platform = 'mac' | 'windows' | 'linux';

/**
 * Detects the current platform from navigator.userAgent or navigator.platform.
 */
export function detectPlatform(): Platform {
  const ua =
    typeof navigator !== 'undefined' ? navigator.userAgent || navigator.platform || '' : '';

  if (/Mac|iPhone|iPad|iPod/i.test(ua)) {
    return 'mac';
  }
  if (/Win/i.test(ua)) {
    return 'windows';
  }
  return 'linux';
}

/**
 * Formats a ShortcutKeys object into a human-readable string
 * appropriate for the given platform.
 *
 * Modifier order: Ctrl → Alt → Shift → Meta/Cmd → Key
 *
 * Mac uses symbols with no separator: ⌃⌥⇧⌘K
 * Windows/Linux uses text with "+" separator: Ctrl+Alt+Shift+Win+K
 */
export function formatShortcut(keys: ShortcutKeys, platform: Platform): string {
  const parts: string[] = [];

  if (platform === 'mac') {
    if (keys.ctrl) parts.push('⌃');
    if (keys.alt) parts.push('⌥');
    if (keys.shift) parts.push('⇧');
    if (keys.meta) parts.push('⌘');

    const displayKey = keys.key.length === 1 ? keys.key.toUpperCase() : keys.key;
    parts.push(displayKey);

    return parts.join('');
  }

  // Windows / Linux
  if (keys.ctrl) parts.push('Ctrl');
  if (keys.alt) parts.push('Alt');
  if (keys.shift) parts.push('Shift');
  if (keys.meta) parts.push(platform === 'windows' ? 'Win' : 'Super');

  const displayKey = keys.key.length === 1 ? keys.key.toUpperCase() : keys.key;
  parts.push(displayKey);

  return parts.join('+');
}
